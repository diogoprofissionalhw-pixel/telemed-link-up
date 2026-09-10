# Aulas em vídeo na Connect-Academy

Cada trilha da Academy passa a ter sua própria página de curso com um vídeo de introdução em destaque e a lista de aulas numeradas ao lado, como no seu rascunho. Somente você (conta mestre) publica as aulas; para assistir é preciso ter conta e estar no plano Pro.

## Como fica para o visitante

- Na página Academy, o botão "Conhecer" de cada card leva à página da trilha (hoje ele manda para o cadastro).
- Página da trilha: título, descrição, player grande com a aula selecionada (começa na "Introdução") e, ao lado, a lista "1º vídeo, 2º vídeo, 3º vídeo..." em ordem, com duração e marca de aula atual.
- Quem não tem conta vê a lista de aulas com o player bloqueado e um convite para criar conta.
- Quem tem conta mas não é Pro vê o mesmo bloqueio com o botão de planos (mesma janela de planos já usada no site).
- Quem é Pro (ou a conta mestre) assiste normalmente.

## Como você publica as aulas

- Na página da trilha, aparece só para a conta mestre um botão "Gerenciar aulas".
- No painel de gestão você pode: criar trilha/curso, adicionar aula com título, descrição, ordem e duração, escolher entre **colar um link do YouTube/Vimeo** ou **enviar o arquivo de vídeo**, marcar uma aula como "Introdução", reordenar, editar e remover.
- O envio de arquivo mostra progresso e aceita vídeos grandes (limite configurado no armazenamento).

## Detalhes técnicos

Banco (migração):
- `academy_courses`: id, slug, título, descrição, cor/ícone da trilha, ordem, `is_published`, timestamps.
- `academy_lessons`: id, `course_id`, título, descrição, `position`, `is_intro`, `duration_seconds`, `source_type` ('url' | 'upload'), `video_url` (link externo), `video_path` (caminho no bucket), timestamps.
- GRANTs: `SELECT` para `anon`/`authenticated` (apenas metadados), `ALL` para `service_role`. RLS ligada.
- Políticas: leitura pública de cursos/aulas publicados (sem URL de vídeo sensível); escrita apenas via server functions com service role após verificação da conta mestre.
- A URL/caminho do vídeo nunca é exposta na listagem pública: a listagem retorna somente metadados.

Armazenamento:
- Bucket privado `academy-videos`, com políticas de `storage.objects` permitindo INSERT/UPDATE/DELETE apenas ao dono mestre e SELECT apenas via URL assinada gerada no servidor.

Server functions (`src/lib/academy.functions.ts`):
- `listCourses` / `getCourseWithLessons` — públicos, metadados apenas.
- `getLessonPlayback` — autenticado (`requireSupabaseAuth`); confere acesso Pro (`doctors.is_premium` ou conta mestre) e retorna o link do YouTube/Vimeo ou uma URL assinada de curta duração do bucket. Sem acesso, retorna `{ locked: true }`.
- `upsertCourse` / `upsertLesson` / `deleteLesson` / `reorderLessons` / `createVideoUploadUrl` — verificam a conta mestre no servidor antes de usar o cliente administrativo.

Rotas:
- `src/routes/academy.$courseSlug.tsx` — página do curso (player + lista), com `head()` próprio (título/descrição/og).
- `src/routes/academy.$courseSlug.gerenciar.tsx` — painel de gestão, visível apenas à conta mestre.
- `src/routes/academy.tsx` — cards passam a linkar para a trilha; trilhas vindas do banco, com as atuais mantidas como conteúdo inicial via INSERT na migração.
- `BackButton` em ambas as páginas, conforme o padrão do projeto.

Player: `<video controls>` para arquivos enviados; iframe responsivo para YouTube/Vimeo, com o id extraído do link colado.
