import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/medicos")({
  component: MedicosPage,
});

function MedicosPage() {
  return (
    <DashboardLayout
      title="Médicos"
      subtitle="Encontre profissionais para seus plantões."
      breadcrumbs={[{ label: "Médicos" }]}
      requireUserType="network"
    >
      <EmptyState
        icon={Users}
        title="Use a busca de médicos no Dashboard"
        description="A página de médicos com busca avançada por especialidade, UF e avaliação está disponível ao criar uma nova solicitação no Dashboard."
        action={
          <Link to="/dashboard">
            <Button className="gap-2">Ir para o Dashboard <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        }
      />
    </DashboardLayout>
  );
}
