# Plano: Shadow Profiles, Validação de CNPJ e Selos de Confiança

## 1. Migração do banco de dados

Adicionar campos para suportar a nova lógica de privacidade e verificação:

**Tabela `networks`:**
- `is_verified` (boolean, default false) — rede verificada via CNPJ
- `cnpj_verified_at` (timestamptz) — quando foi verificada
- `cnpj_activity` (text) — atividade econômica simulada

**Tabela `doctors`:**
- `public_id` (text, unique) — ID curto público tipo "8821" (gerado automaticamente via sequence)
- `identity_verified` (boolean, default false) — KYC concluído
- `identity_verified_at` (timestamptz)
- `selfie_url` (text) — selfie para KYC
- `approval_rate` (numeric) — calculado a partir de shift_requests aceitos vs total

**RLS / Views:**
- Criar view `doctors_public` que expõe apenas: `public_id`, primeiro nome, especialidade, cidade/UF, valor consulta, avg_stars, anos exp, crm_status (sem CRM number, sem CRM uf, sem nome completo, sem bio completa).
- Política: anon e authenticated podem `SELECT` da view.
- Restringir SELECT direto da tabela `doctors` apenas para: o próprio médico, ou redes verificadas (`is_verified = true`).
- Função `has_verified_network(uid)` security definer para checar.

## 2. Página `/medicos` (Diretório público — Shadow Profiles)

- Consultar a view `doctors_public` em vez de `doctors`.
- Card mostra: "Dr. {primeiroNome} — ID #{public_id}", especialidade, cidade/UF (sem rua), valor, estrelas, anos exp, selos (CRM validado, Identidade verificada).
- Ocultar: sobrenome completo, CRM, bio, e-mail, telefone.
- Manter filtros: Especialidade, Localização (cidade/UF), Valor (range), Avaliação mínima (novo — slider 0-5 estrelas).
- Botão "Ver Perfil":
  - Deslogado → redireciona para `/auth?mode=signup` com toast "Cadastre sua rede para ver perfis completos".
  - Logado como médico → vai direto ao perfil.
  - Logado como rede **não verificada** → abre modal explicando que precisa validar CNPJ, com botão "Validar agora" indo para `/perfil-empresa`.
  - Logado como rede **verificada** → vai ao perfil completo.

## 3. Cadastro e validação de CNPJ

**Em `/auth` (signup de rede):**
- Campo CNPJ obrigatório com máscara `00.000.000/0000-00`.
- Validação: dígitos verificadores + formato.

**Em `/perfil-empresa`:**
- Seção "Verificação de CNPJ" com botão "Verificar agora".
- Função local que simula chamada à Receita: aguarda 1.5s, retorna `is_verified = true` + atividade econômica "Atividades de atendimento hospitalar" (mock).
- Badge verde "Rede Verificada" quando concluído.
- Bloqueia chats e perfis completos enquanto não verificado (banner no dashboard da rede).

## 4. Perfil do Médico

**Edição (`/perfil`):**
- Já existem seções para experiências, formação, certificações. Adicionar:
  - Campo "Valor da Consulta" se ainda não destacado.
  - Seção "Verificação de Identidade (KYC)" — upload de documento (frente/verso) + selfie, status pendente/verificado. Por enquanto: marcar como verificado ao enviar (placeholder).

**Selos:**
- `BadgeCheck` verde quando `crm_status === 'verified'` (texto: "CRM Validado" ou "Registro Provisório" se houver flag).
- `ShieldCheck` azul quando `identity_verified === true` ("Identidade Verificada").
- Exibir nos cards públicos e no perfil completo.

## 5. Componente compartilhado

- `DoctorPublicCard` reutilizável para `/medicos` e dashboard da rede (quando não verificada, mostra a versão shadow).
- Helper `getFirstName(fullName)` em `src/lib/utils.ts`.
- Helper `formatPublicId(id)` → `#${publicId}`.

## 6. Métricas de autoridade

- No card público: substituir "Localização precisa" e "CRM" por "Anos de experiência" + "Taxa de aprovação" (calculada: aceitos / total recebidos).
- Adicionar coluna calculada ou computar no client a partir de `shift_requests`.

## Detalhes técnicos

- A view `doctors_public` usa `security_invoker=on` e a tabela base `doctors` ganha policy SELECT mais restritiva (`auth.uid() = id OR has_verified_network(auth.uid())`).
- `public_id` gerado via sequence iniciando em 1000 + trigger BEFORE INSERT.
- A simulação de Receita roda no client (sem API externa); apenas grava `is_verified = true` + `cnpj_activity` no Supabase via update direto (RLS já permite update da própria rede).
- Mantém visual atual (mesmas cores, mesmos componentes shadcn, layout idêntico de cards).
