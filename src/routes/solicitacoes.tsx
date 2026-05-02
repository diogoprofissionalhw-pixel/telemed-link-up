import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/solicitacoes")({
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  return (
    <DashboardLayout
      title="Solicitações"
      subtitle="Veja e responda às solicitações de plantão."
      breadcrumbs={[{ label: "Solicitações" }]}
    >
      <EmptyState
        icon={Inbox}
        title="Use o painel principal por enquanto"
        description="A tabela completa com filtros avançados está chegando. Por agora, suas solicitações aparecem no Dashboard."
        action={
          <Link to="/dashboard">
            <Button className="gap-2">
              Ir para o Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
    </DashboardLayout>
  );
}
