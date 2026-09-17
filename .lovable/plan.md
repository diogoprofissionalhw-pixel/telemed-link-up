# Connect-Academy: limpeza, quizzes e progressão

## 1. Limpeza da base de demonstração

Remoção das empresas repetidas e das de teste, mantendo apenas a conta de teste ativa "Novetech" (diogomassaro465@gmail.com):

| Empresa | Conta | Ação |
| --- | --- | --- |
| Novetech | diogomassaro465@gmail.com | manter |
| novetech (repetida) | levimacedomagalhaes@gmail.com | remover |
| SuSPB | levimacedomagalhae@gmail.com | remover |
| SusPB (com foto errada) | calltoaction36@gmail.com | remover |
| GOOGLE BRASIL INTERNET LTDA. | teste.perfil.final@rede.com | remover |
| Rede | teste.cnpj.final@rede.com | remover |

- A foto da empresa "SusPB" sai junto com o registro; nenhuma outra empresa tem foto salva.
- Cards de empresa sem foto passam a mostrar um marcador padrão único (inicial do nome em fundo neutro), sem cores/imagens aleatórias.

## 2. Planos e preços ocultos

- Chave única `showPricing: false` em um arquivo de configuração de recursos.
- Com a chave desligada: link "Valores" sai do menu, a página `/valores` redireciona para a home e a janela de planos que aparece nas aulas bloqueadas é substituída por um aviso simples "conteúdo liberado pela sua empresa/administrador".
- Nada é apagado: basta virar a chave para `true` para tudo voltar.

## 3. Módulos, quizzes e progressão

Estrutura passa a ser **trilha > módulo > aula**.

- Cada aula ganha um quiz curto (3 a 5 perguntas de múltipla escolha) que aparece ao terminar o vídeo.
- Cada módulo ganha um quiz final, mais longo, com perguntas de todas as aulas.
- Regra de aprovação: é preciso acertar **todas** as perguntas, com até **3 tentativas**; ao esgotar as tentativas o aluno precisa rever a aula para liberar novas tentativas.
- A marcação de aula concluída só acontece após o quiz da aula ser aprovado (assistir sozinho não conclui).
- O módulo seguinte fica bloqueado (com cadeado e explicação) até que todas as aulas do módulo anterior estejam concluídas e o quiz do módulo esteja aprovado.

## 4. Itens confirmados nesta entrega

- Lista de aulas numeradas com duração ao lado (já existe, mantida e agrupada por módulo).
- Barra de progresso por % assistida do vídeo, salva automaticamente e retomando de onde parou.
- PDF-resumo por aula: botão "Baixar resumo" gera o PDF com a logo da Academy, o resumo em linguagem acessível, as imagens/organogramas anexados pelo administrador e as referências bibliográficas. O administrador passa a preencher esses campos no cadastro da aula.
- Painel administrativo de cadastro: trilha, módulo, aula (título, descrição, ordem, vídeo por link ou upload), perguntas dos quizzes e conteúdo do resumo/anexos.
- Dois tipos de acesso:
  - Empresa parceira: acompanha a jornada dos profissionais vinculados e monta trilha personalizada escolhendo módulos/aulas.
  - Profissional/médico: acesso padrão, vendo conteúdos de empresa apenas quando liberados por ela.
- Painel de progresso e conclusão dos alunos (visão do administrador e da empresa).

## 5. Fora do escopo (próxima etapa)

- Emissão de certificado ao final do curso.
- Benefícios/vantagens para alunos pagantes.

Ambos ficam documentados em comentários no código e no arquivo de roteiro, sem implementação agora.

## Detalhes técnicos

Migração (banco):
- `academy_modules` (course_id, título, descrição, position, is_published) e `academy_lessons.module_id`; aulas existentes migram para um módulo "Módulo 1" por trilha.
- `academy_lessons`: novos campos `summary` (texto do resumo), `summary_references` (text[]), `summary_images` (jsonb com caminhos no bucket).
- `academy_quizzes` (scope 'lesson' | 'module', lesson_id/module_id, título, `max_attempts` default 3), `academy_quiz_questions` (prompt, position), `academy_quiz_options` (label, `is_correct`).
- `academy_lesson_progress` (user_id, lesson_id, watched_seconds, percent, completed_at) e `academy_quiz_attempts` (user_id, quiz_id, attempt_no, score, passed).
- `academy_company_members` (network_id, doctor_id) e `academy_company_tracks` + `academy_company_track_items` para a trilha personalizada da empresa.
- RLS + GRANTs em todas: progresso/tentativas apenas do próprio usuário (`auth.uid()`); empresa lê o progresso dos membros vinculados via função `security definer`; escrita de conteúdo só via server functions com verificação da conta mestre. `academy_quiz_options.is_correct` nunca vai ao cliente — sem GRANT de SELECT para `anon`/`authenticated`; a correção acontece no servidor.

Server functions (`src/lib/academy.functions.ts` + novo `src/lib/academy-progress.functions.ts`):
- `getCourseOutline` — trilha com módulos, aulas, duração, estado de conclusão e bloqueio calculados no servidor.
- `saveLessonProgress`, `getQuizForLesson`/`getQuizForModule` (sem gabarito), `submitQuizAttempt` (corrige, controla as 3 tentativas, marca a aula/módulo como concluído).
- `upsertModule`/`reorderModules`, `upsertQuiz`, `upsertQuestion`, `deleteQuestion`, `upsertLessonSummary` — todas com `requireMaster`.
- `listCompanyProgress`, `upsertCompanyTrack`, `setCompanyMembers` — empresa verificada pelo `network_id` do usuário autenticado.

Rotas:
- `academy.$courseSlug.tsx` — lista agrupada por módulo, cadeados, barra de % assistida, quiz ao fim do vídeo e botão de resumo em PDF.
- `academy.gerenciar.$courseSlug.tsx` — abas Módulos / Aulas / Quizzes / Resumo.
- Novas: `academy.progresso.tsx` (painel administrativo) e `academy.empresa.tsx` (painel da empresa parceira com trilha personalizada). Ambas com `BackButton`, cada uma com seu `head()`.

PDF: geração no navegador com `jspdf` (+ `jspdf-autotable` para as referências), usando a logo já existente em `src/assets`.
Progresso do vídeo: eventos `timeupdate` do player com salvamento a cada ~10s e no `pause`/saída.
