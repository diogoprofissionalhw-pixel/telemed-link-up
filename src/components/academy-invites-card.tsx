import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listMyAcademyInvites,
  respondAcademyInvite,
  type AcademyInvite,
} from "@/lib/academy-company.functions";

/**
 * Convites pendentes de equipe da Academy para o médico logado.
 * A empresa convida e o médico precisa aceitar para entrar na equipe.
 */
export function AcademyInvitesCard() {
  const listFn = useServerFn(listMyAcademyInvites);
  const respondFn = useServerFn(respondAcademyInvite);
  const [invites, setInvites] = useState<AcademyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    listFn({ data: undefined as never })
      .then((r) => setInvites(r.items))
      .catch(() => setInvites([]))
      .finally(() => setLoading(false));
  }, [listFn]);

  useEffect(() => {
    reload();
  }, [reload]);

  const respond = async (networkId: string, accept: boolean) => {
    setBusyId(networkId);
    try {
      const res = await respondFn({ data: { networkId, accept } });
      if (!res.ok) throw new Error(res.error ?? "Erro ao responder convite");
      toast.success(accept ? "Você entrou para a equipe da empresa na Academy." : "Convite recusado.");
      setInvites((list) => list.filter((i) => i.networkId !== networkId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao responder convite");
    } finally {
      setBusyId(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <Building2 className="h-4 w-4" /> Convites de equipe
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresas parceiras convidaram você para a equipe delas na Connect-Academy.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {invites.map((invite) => (
            <li
              key={invite.networkId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{invite.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  Convidou você para acompanhar trilhas personalizadas na equipe dela.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={busyId === invite.networkId}
                  onClick={() => respond(invite.networkId, true)}
                >
                  {busyId === invite.networkId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={busyId === invite.networkId}
                  onClick={() => respond(invite.networkId, false)}
                >
                  <X className="h-4 w-4" /> Recusar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
