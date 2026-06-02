import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { isMasterUser } from "@/lib/master-access";
import { AppShell } from "@/components/app-sidebar";
import { PageHeader, type BreadcrumbItem } from "./page-header";

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  /** Restringe a rota a um tipo de usuário específico. Se não definido, ambos podem acessar. */
  requireUserType?: "doctor" | "network";
  children: ReactNode;
}

export function DashboardLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  requireUserType,
  children,
}: DashboardLayoutProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && profile && requireUserType && profile.account_type !== requireUserType) {
      navigate({ to: "/dashboard" });
    }
  }, [profile, loading, requireUserType, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (requireUserType && profile.account_type !== requireUserType) {
    return null;
  }

  return (
    <AppShell userType={profile.account_type}>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={actions} />
        {children}
      </main>
    </AppShell>
  );
}
