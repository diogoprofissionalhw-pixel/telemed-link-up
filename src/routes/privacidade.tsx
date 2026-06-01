import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Connect-Med" },
      { name: "description", content: "Política de Privacidade da plataforma Connect-Med." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BackButton to="/" label="Voltar ao início" />
        <article className="prose prose-neutral mt-6 max-w-none dark:prose-invert">
          <h1>Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <h2>1. Dados que coletamos</h2>
          <ul>
            <li><strong>Cadastro:</strong> nome, e-mail, telefone, CPF/CNPJ, CRM, foto.</li>
            <li><strong>Profissionais:</strong> especialidade, experiência, currículo, certificações.</li>
            <li><strong>Uso:</strong> logs de acesso, IP, dispositivo.</li>
          </ul>

          <h2>2. Finalidade</h2>
          <p>Conectar médicos a redes de telemedicina, validar identidade profissional, processar plantões, prevenir fraudes e cumprir obrigações legais.</p>

          <h2>3. Compartilhamento</h2>
          <p>Compartilhamos dados estritamente necessários: redes visualizam o perfil de médicos para contratação, médicos visualizam dados públicos das redes. Não vendemos seus dados.</p>

          <h2>4. Armazenamento</h2>
          <p>Dados ficam em servidores seguros com criptografia em trânsito e em repouso. Mantemos os dados pelo tempo necessário para cumprir as finalidades descritas.</p>

          <h2>5. Seus direitos (LGPD)</h2>
          <p>Você pode solicitar acesso, correção, exclusão e portabilidade dos seus dados. Veja mais em nossa página de <a href="/lgpd">LGPD</a>.</p>

          <h2>6. Cookies</h2>
          <p>Usamos cookies essenciais para autenticação e funcionamento da plataforma.</p>

          <h2>7. Contato</h2>
          <p>Encarregado de Dados (DPO): connectmed10@gmail.com</p>
        </article>
      </main>
    </div>
  );
}
