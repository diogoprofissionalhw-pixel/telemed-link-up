import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Bell, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Connect-Med" },
      { name: "description", content: "Gerencie segurança, notificações e preferências da sua conta." },
      { property: "og:title", content: "Configurações — Connect-Med" },
      { property: "og:description", content: "Gerencie segurança, notificações e preferências da sua conta." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <DashboardLayout
      title="Configurações"
      subtitle="Gerencie sua segurança, notificações e preferências."
      breadcrumbs={[{ label: "Configurações" }]}
    >
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </Link>
        </Button>
        <ChangePasswordCard />
        <NotificationsCard />
        <PreferencesCard />
      </div>
    </DashboardLayout>
  );
}

function ChangePasswordCard() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (pwd !== confirm) return toast.error("As senhas não coincidem");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada com sucesso!");
    setPwd(""); setConfirm("");
  };

  return (
    <section className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Alterar senha</h2>
          <p className="text-xs text-muted-foreground">Use uma senha forte com no mínimo 6 caracteres.</p>
        </div>
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pwd">Nova senha</Label>
          <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={6} required />
        </div>
        <div>
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Atualizar senha"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function NotificationsCard() {
  const { user } = useAuth();
  const storageKey = `notif-prefs-${user?.id ?? "anon"}`;
  const initial = (() => {
    if (typeof window === "undefined") return { email: true, platform: true, reminders: true };
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "") || { email: true, platform: true, reminders: true }; }
    catch { return { email: true, platform: true, reminders: true }; }
  })();
  const [prefs, setPrefs] = useState(initial);

  const update = (k: keyof typeof prefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    toast.success("Preferência salva");
  };

  return (
    <section className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Notificações</h2>
          <p className="text-xs text-muted-foreground">Escolha como deseja ser avisado.</p>
        </div>
      </div>
      <div className="space-y-4">
        <PrefRow label="Notificações na plataforma" description="Sinos e alertas dentro do site." checked={prefs.platform} onChange={(v) => update("platform", v)} />
        <PrefRow label="Notificações por e-mail" description="Receber resumo e alertas por e-mail." checked={prefs.email} onChange={(v) => update("email", v)} />
        <PrefRow label="Lembretes de plantão" description="Avisos automáticos antes do início." checked={prefs.reminders} onChange={(v) => update("reminders", v)} />
      </div>
    </section>
  );
}

function PreferencesCard() {
  const { user } = useAuth();
  const storageKey = `agenda-prefs-${user?.id ?? "anon"}`;
  const initial = (() => {
    if (typeof window === "undefined") return { autoAccept: false, weekStartMonday: true };
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "") || { autoAccept: false, weekStartMonday: true }; }
    catch { return { autoAccept: false, weekStartMonday: true }; }
  })();
  const [prefs, setPrefs] = useState(initial);

  const update = (k: keyof typeof prefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    toast.success("Preferência salva");
  };

  return (
    <section className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Preferências de agenda</h2>
          <p className="text-xs text-muted-foreground">Configure como sua agenda funciona.</p>
        </div>
      </div>
      <div className="space-y-4">
        <PrefRow label="Semana começa na segunda" description="Mostrar o calendário com segunda como primeiro dia." checked={prefs.weekStartMonday} onChange={(v) => update("weekStartMonday", v)} />
        <PrefRow label="Aceitar plantões automaticamente" description="(em breve) Aceita plantões compatíveis com sua disponibilidade." checked={prefs.autoAccept} onChange={(v) => update("autoAccept", v)} />
      </div>
    </section>
  );
}

function PrefRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/20 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
