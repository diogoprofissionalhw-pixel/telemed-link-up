import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/lgpd")({
  head: () => ({
    meta: [
      { title: "LGPD — Connect-Med" },
      { name: "description", content: "Como a Connect-Med cumpre a Lei Geral de Proteção de Dados." },
    ],
  }),
  component: LgpdPage,
});

function LgpdPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BackButton to="/" label="Voltar ao início" />
        <article className="prose prose-neutral mt-6 max-w-none dark:prose-invert">
          <h1>LGPD — Lei Geral de Proteção de Dados</h1>
          <p className="text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <p>A Connect-Med segue a Lei nº 13.709/2018 (LGPD) no tratamento de dados pessoais.</p>

          <h2>Base legal</h2>
          <p>Tratamos seus dados com base em: execução de contrato, cumprimento de obrigação legal, exercício regular de direitos e consentimento, quando aplicável.</p>

          <h2>Seus direitos</h2>
          <ul>
            <li>Confirmar a existência de tratamento dos seus dados.</li>
            <li>Acessar, corrigir e atualizar seus dados.</li>
            <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Portabilidade para outro fornecedor de serviço.</li>
            <li>Revogar consentimento.</li>
            <li>Informação sobre compartilhamento.</li>
          </ul>

          <h2>Como exercer</h2>
          <p>Envie um e-mail para <strong>connectmed10@gmail.com</strong> com o assunto "LGPD — Solicitação de titular". Responderemos em até 15 dias úteis.</p>

          <h2>Encarregado de Dados (DPO)</h2>
          <p>connectmed10@gmail.com</p>

          <h2>Reclamações</h2>
          <p>Se entender que seus direitos não foram atendidos, você pode acionar a Autoridade Nacional de Proteção de Dados (ANPD): <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">gov.br/anpd</a>.</p>
        </article>
      </main>
    </div>
  );
}
