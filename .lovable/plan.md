# Plano: Página de detalhes da rede + LinkedIn

## 1. Banco de dados (migração)

Adicionar campos públicos ao perfil da rede:

- `networks.linkedin_url` (text, nullable) — link do LinkedIn da empresa
- `networks.website_url` (text, nullable) — site institucional (opcional, complementa autoridade)
- `networks.description` (text, nullable) — breve descrição pública da rede

Atualizar a view `networks_public` para incluir esses três campos novos, mantendo restrita a leitura por `anon` apenas às colunas seguras (sem CNPJ, sem endereço completo, sem dados sensíveis).

Colunas expostas na view pública (consumidas por médicos logados e visitantes):
`id, network_name, city, state, avatar_url, is_verified, cnpj_activity, linkedin_url, website_url, description`.

CNPJ continua **fora** da view pública — apenas a própria rede vê o próprio CNPJ.

## 2. Edição: `/perfil-empresa`

Adicionar três campos novos no formulário da rede:

- **LinkedIn da empresa** — input com validação simples (precisa começar com `https://www.linkedin.com/` ou `https://linkedin.com/`)
- **Site institucional** — input URL (opcional)
- **Sobre a rede** — textarea curta (até 500 caracteres) com descrição pública

Salvar via `update` na tabela `networks` (RLS já permite a rede atualizar a si mesma).

## 3. Nova rota pública: `/rede/$networkId`

Criar `src/routes/rede.$networkId.tsx`:

- `loader` busca a rede em `networks_public` por id.
- Header com avatar, nome, cidade/UF, badge "Rede Verificada" se `is_verified`.
- Seção "Sobre" com `description`.
- Seção "Atividade" com `cnpj_activity` (atividade econômica genérica, já pública).
- Botões/links:
  - **LinkedIn** (abre em nova aba, `rel="noopener noreferrer"`) — só aparece se preenchido
  - **Site** (abre em nova aba) — só aparece se preenchido
- Botão "Voltar" usando `BackButton` apontando para `/` (ou `/dashboard` se logado).
- Se a rede não for encontrada → `notFoundComponent`.
- `errorComponent` padrão.
- `head()` dinâmico com título "{network_name} — Connect-Med".

Esta rota é **pública** (qualquer visitante e qualquer médico logado pode ver), mas só mostra dados seguros da view.

## 4. Landing: seção "Conheça nossas redes"

Em `src/routes/index.tsx`, alterar o comportamento do clique em uma rede:

- **Visitante (não logado)** → continua abrindo o diálogo de planos (comportamento atual mantido).
- **Médico logado** (`profile.account_type === "doctor"`) → navega para `/rede/{id}` (página pública da rede).
- **Rede logada** → também navega para `/rede/{id}` (visualização pública, sem dados sensíveis).

Remover o diálogo de "detalhes mínimos" inline para usuários logados — agora todos os logados vão para a página dedicada, que tem mais informação (incl. LinkedIn).

## 5. Segurança

- Nenhum dado sensível novo é exposto: CNPJ, endereço completo, e-mail, telefone continuam fora da view pública.
- LinkedIn/site/descrição são informações que a própria rede preenche voluntariamente para divulgação.
- Links externos sempre com `target="_blank"` e `rel="noopener noreferrer"`.
- Validação client-side da URL do LinkedIn para evitar links arbitrários (defesa em profundidade — RLS já restringe quem grava).

## Resumo de arquivos

- **Migração**: ALTER TABLE `networks` + recriar view `networks_public`.
- **Editar**: `src/routes/perfil-empresa.tsx` (3 campos novos), `src/routes/index.tsx` (redirect logado → `/rede/$id`), `src/integrations/supabase/types.ts` (regenerado automaticamente).
- **Criar**: `src/routes/rede.$networkId.tsx`.
