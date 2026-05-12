import { useEffect, useRef, useState } from "react";
import { Send, MoreVertical, BellOff, Bell, Ban, Trash2, ShieldOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import chatBg from "@/assets/chat-bg.png";

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

interface Props {
  currentUserId: string;
  otherUserId: string;
  otherName: string;
  otherAvatarUrl?: string | null;
  onBack?: () => void;
}

export function ChatView({ currentUserId, otherUserId, otherName, otherAvatarUrl, onBack }: Props) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [confirm, setConfirm] = useState<null | "block" | "unblock" | "clear">(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const blocked = iBlockedThem || theyBlockedMe;

  useEffect(() => {
    let active = true;
    setLoading(true);

    (async () => {
      const [{ data: settings }, { data: blocks }, { data: msgs }] = await Promise.all([
        supabase.from("user_chat_settings").select("muted_at, cleared_at").eq("user_id", currentUserId).eq("peer_id", otherUserId).maybeSingle(),
        supabase.from("user_blocks").select("blocker_id, blocked_id").or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${currentUserId})`),
        supabase
          .from("direct_messages")
          .select("*")
          .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
          .order("created_at", { ascending: true }),
      ]);
      if (!active) return;

      const cleared = (settings as any)?.cleared_at ?? null;
      setMuted(!!(settings as any)?.muted_at);
      setClearedAt(cleared);
      setIBlockedThem(!!(blocks ?? []).find((b: any) => b.blocker_id === currentUserId));
      setTheyBlockedMe(!!(blocks ?? []).find((b: any) => b.blocker_id === otherUserId));

      const filtered = ((msgs ?? []) as DirectMessage[]).filter(
        (m) => !cleared || new Date(m.created_at) > new Date(cleared),
      );
      setMessages(filtered);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`dm-${[currentUserId, otherUserId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DirectMessage;
          const involves =
            (m.sender_id === currentUserId && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === currentUserId);
          if (!involves) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || blocked) return;
    setSending(true);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: currentUserId,
      recipient_id: otherUserId,
      content,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  const toggleMute = async () => {
    const next = muted ? null : new Date().toISOString();
    const { error } = await supabase
      .from("user_chat_settings")
      .upsert({ user_id: currentUserId, peer_id: otherUserId, muted_at: next }, { onConflict: "user_id,peer_id" });
    if (error) return toast.error(error.message);
    setMuted(!muted);
    toast.success(muted ? "Notificações ativadas" : "Conversa silenciada");
  };

  const clearConversation = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("user_chat_settings")
      .upsert({ user_id: currentUserId, peer_id: otherUserId, cleared_at: now }, { onConflict: "user_id,peer_id" });
    if (error) return toast.error(error.message);
    setClearedAt(now);
    setMessages([]);
    setConfirm(null);
    toast.success("Conversa apagada para você");
  };

  const blockUser = async () => {
    const { error } = await supabase.from("user_blocks").insert({ blocker_id: currentUserId, blocked_id: otherUserId });
    if (error) return toast.error(error.message);
    setIBlockedThem(true);
    setConfirm(null);
    toast.success(`${otherName} foi bloqueado`);
  };

  const unblockUser = async () => {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", currentUserId)
      .eq("blocked_id", otherUserId);
    if (error) return toast.error(error.message);
    setIBlockedThem(false);
    setConfirm(null);
    toast.success(`${otherName} foi desbloqueado`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border">
            {otherAvatarUrl && <AvatarImage src={otherAvatarUrl} alt={otherName} />}
            <AvatarFallback>{otherName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{otherName}</p>
            <p className="text-xs text-muted-foreground">
              {iBlockedThem ? "Você bloqueou este contato" : muted ? "Silenciado" : "Online"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={toggleMute}>
              {muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
              {muted ? "Reativar notificações" : "Silenciar"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirm("clear")}>
              <Trash2 className="mr-2 h-4 w-4" /> Apagar conversa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {iBlockedThem ? (
              <DropdownMenuItem onClick={() => setConfirm("unblock")}>
                <ShieldOff className="mr-2 h-4 w-4" /> Desbloquear
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setConfirm("block")} className="text-destructive focus:text-destructive">
                <Ban className="mr-2 h-4 w-4" /> Bloquear
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{ backgroundImage: `url("${chatBgPattern}")`, backgroundRepeat: "repeat", backgroundColor: "hsl(var(--muted) / 0.3)" }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              Nenhuma mensagem ainda. Diga olá!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {blocked ? (
        <div className="border-t bg-muted/50 p-3 text-center text-xs text-muted-foreground">
          {iBlockedThem
            ? "Você bloqueou este contato. Desbloqueie para enviar mensagens."
            : "Você não pode enviar mensagens para este contato."}
        </div>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t bg-card p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma mensagem..."
            maxLength={2000}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "block" && `Bloquear ${otherName}?`}
              {confirm === "unblock" && `Desbloquear ${otherName}?`}
              {confirm === "clear" && "Apagar conversa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "block" && "Vocês não poderão mais trocar mensagens e o perfil ficará oculto para você."}
              {confirm === "unblock" && "Vocês poderão voltar a trocar mensagens normalmente."}
              {confirm === "clear" && "As mensagens serão apagadas apenas para você. O outro usuário continuará vendo o histórico."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === "block") blockUser();
                else if (confirm === "unblock") unblockUser();
                else if (confirm === "clear") clearConversation();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
