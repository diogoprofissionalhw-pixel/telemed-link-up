import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ChatPanel } from "@/components/chat-panel";

export const Route = createFileRoute("/mensagens")({
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
  const [search, setSearch] = useState("");
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
        supabase
          .from("user_chat_settings")
          .select("peer_id, cleared_at")
          .eq("user_id", user.id),
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
          supabase.from("doctors").select("id, avatar_url").in("id", peerIds),
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

  const filtered = useMemo(
    () => items.filter((i) => i.peerName.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  return (
    <DashboardLayout title="Mensagens" subtitle="Suas conversas">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card py-12 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "Nenhuma conversa ainda." : "Nenhuma conversa encontrada."}
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {filtered.map((c) => (
              <li key={c.peerId}>
                <button
                  onClick={() => setActive(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
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

        {blockedIds.size > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Ban className="h-3 w-3" /> {blockedIds.size} conversa(s) oculta(s) por bloqueio
          </p>
        )}
      </div>

      {active && user && (
        <ChatPanel
          open={!!active}
          onOpenChange={(v) => !v && setActive(null)}
          currentUserId={user.id}
          otherUserId={active.peerId}
          otherName={active.peerName}
          otherAvatarUrl={active.peerAvatar}
        />
      )}
    </DashboardLayout>
  );
}
