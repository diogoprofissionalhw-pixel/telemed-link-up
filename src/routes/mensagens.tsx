import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Ban } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatView } from "@/components/chat-view";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagens — Connect-Med" },
      { name: "description", content: "Converse em tempo real com médicos e redes parceiras." },
      { property: "og:title", content: "Mensagens — Connect-Med" },
      { property: "og:description", content: "Converse em tempo real com médicos e redes parceiras." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MensagensPage,
});

interface ConversationItem {
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  lastMessage: string;
  lastAt: string;
  fromMe: boolean;
}

function MensagensPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ConversationItem | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let on = true;

    const load = async () => {
      const [{ data: msgs }, { data: cleared }, { data: blocks }] = await Promise.all([
        supabase
          .from("direct_messages")
          .select("id, sender_id, recipient_id, content, created_at")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("user_chat_settings").select("peer_id, cleared_at").eq("user_id", user.id),
        supabase.from("user_blocks").select("blocker_id, blocked_id"),
      ]);

      if (!on) return;

      const clearedMap = new Map<string, string>();
      (cleared ?? []).forEach((c: any) => c.cleared_at && clearedMap.set(c.peer_id, c.cleared_at));

      const blockedSet = new Set<string>();
      (blocks ?? []).forEach((b: any) => {
        if (b.blocker_id === user.id) blockedSet.add(b.blocked_id);
        if (b.blocked_id === user.id) blockedSet.add(b.blocker_id);
      });
      setBlockedIds(blockedSet);

      const byPeer = new Map<string, ConversationItem>();
      for (const m of (msgs ?? []) as any[]) {
        const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (blockedSet.has(peer)) continue;
        const cAt = clearedMap.get(peer);
        if (cAt && new Date(m.created_at) <= new Date(cAt)) continue;
        if (byPeer.has(peer)) continue;
        byPeer.set(peer, {
          peerId: peer,
          peerName: peer,
          peerAvatar: null,
          lastMessage: m.content,
          lastAt: m.created_at,
          fromMe: m.sender_id === user.id,
        });
      }

      const peerIds = [...byPeer.keys()];
      if (peerIds.length > 0) {
        const [{ data: profiles }, { data: docs }, { data: nets }] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", peerIds),
          supabase.from("doctors_public").select("id, avatar_url").in("id", peerIds),
          supabase.from("networks").select("id, network_name, avatar_url").in("id", peerIds),
        ]);
        const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
        const docMap = new Map((docs ?? []).map((d: any) => [d.id, d.avatar_url]));
        const netMap = new Map((nets ?? []).map((n: any) => [n.id, n]));

        for (const it of byPeer.values()) {
          const net = netMap.get(it.peerId) as any;
          it.peerName = profMap.get(it.peerId) ?? net?.network_name ?? "Usuário";
          it.peerAvatar = (docMap.get(it.peerId) as string | undefined) ?? net?.avatar_url ?? null;
        }
      }

      setItems([...byPeer.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt)));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`dm-list-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => load())
      .subscribe();

    return () => {
      on = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const list = useMemo(() => items, [items]);

  return (
    <DashboardLayout
      title="Mensagens"
      subtitle="Suas conversas"
      actions={<BackButton to="/dashboard" label="Voltar ao dashboard" />}
    >
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid h-[calc(100vh-16rem)] min-h-[480px] grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* Left: conversation list */}
          <aside
            className={cn(
              "flex min-h-0 flex-col border-r bg-card",
              active ? "hidden md:flex" : "flex",
            )}
          >
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
              ) : list.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {list.map((c) => (
                    <li key={c.peerId}>
                      <button
                        onClick={() => setActive(c)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40",
                          active?.peerId === c.peerId && "bg-accent/60",
                        )}
                      >
                        <Avatar className="h-11 w-11 border">
                          {c.peerAvatar && <AvatarImage src={c.peerAvatar} alt={c.peerName} />}
                          <AvatarFallback>{c.peerName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium">{c.peerName}</p>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(c.lastAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                            </span>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {c.fromMe && "Você: "}{c.lastMessage}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {blockedIds.size > 0 && (
              <p className="flex items-center gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground">
                <Ban className="h-3 w-3" /> {blockedIds.size} conversa(s) oculta(s) por bloqueio
              </p>
            )}
          </aside>

          {/* Right: chat */}
          <section className={cn("min-h-0", active ? "flex" : "hidden md:flex", "flex-col")}>
            {active && user ? (
              <ChatView
                currentUserId={user.id}
                otherUserId={active.peerId}
                otherName={active.peerName}
                otherAvatarUrl={active.peerAvatar}
                onBack={() => setActive(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
