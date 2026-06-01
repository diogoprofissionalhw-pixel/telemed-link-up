import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Connect-Med" },
      { name: "description", content: "Termos de Uso da plataforma Connect-Med." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BackButton to="/" label="Voltar ao início" />
        <article className="prose prose-neutral mt-6 max-w-none dark:prose-invert">
          <h1>Termos de Uso</h1>
          <p className="text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <h2>1. Aceitação dos Termos</h2>
          <p>Ao acessar ou usar a Connect-Med, você concorda em cumprir estes Termos de Uso e nossa Política de Privacidade. Caso não concorde, não utilize a plataforma.</p>

          <h2>2. Sobre a plataforma</h2>
          <p>A Connect-Med é uma plataforma que conecta médicos a redes de telemedicina para a contratação de plantões. Não somos empregadores nem prestamos serviços médicos diretamente.</p>

          <h2>3. Cadastro e contas</h2>
          <p>O usuário é responsável pela veracidade das informações fornecidas (CRM, CPF/CNPJ, dados profissionais) e pela guarda das credenciais de acesso. Cadastros falsos ou em desacordo com a regulamentação do CFM podem ser suspensos.</p>

          <h2>4. Responsabilidades</h2>
          <ul>
            <li>Médicos: cumprir os plantões aceitos e respeitar normas éticas do CFM.</li>
            <li>Redes: pagar os valores acordados e prestar informações corretas sobre os plantões.</li>
            <li>Connect-Med: manter a plataforma disponível e mediar conflitos quando aplicável.</li>
          </ul>

          <h2>5. Pagamentos</h2>
          <p>Os valores acordados entre médico e rede são processados conforme contrato firmado entre as partes. A Connect-Med pode cobrar taxas de uso conforme os planos vigentes.</p>

          <h2>6. Limitação de responsabilidade</h2>
          <p>A Connect-Med não se responsabiliza por inadimplências, atos médicos ou divergências contratuais entre médico e rede, atuando apenas como facilitadora da conexão.</p>

          <h2>7. Alterações</h2>
          <p>Estes Termos podem ser atualizados a qualquer momento. A versão mais recente estará sempre disponível nesta página.</p>

          <h2>8. Contato</h2>
          <p>Dúvidas: connectmed10@gmail.com</p>
        </article>
      </main>
    </div>
  );
}
