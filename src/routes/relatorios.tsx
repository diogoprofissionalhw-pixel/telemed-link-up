import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  return (
    <DashboardLayout
      title="Relatórios"
      subtitle="Indicadores de performance da sua rede."
      breadcrumbs={[{ label: "Relatórios" }]}
      requireUserType="network"
    >
      <EmptyState
        icon={BarChart3}
        title="Relatórios em desenvolvimento"
        description="Em breve você terá gráficos de consultas por mês, especialidades mais solicitadas e taxa de aceitação."
      />
    </DashboardLayout>
  );
}
