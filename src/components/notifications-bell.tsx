import { useEffect, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }, [userId]);

  useEffect(() => {
    load();
    const channel = supabase.channel(`notif-${userId}-${Math.random().toString(36).slice(2)}`);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Check className="h-3 w-3" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem notificações</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`border-b p-3 text-sm last:border-b-0 ${!n.read_at ? "bg-accent/40" : ""}`}>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
