import { CheckCircle2, XCircle, Hourglass } from "lucide-react";

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

const STATUS_MAP = {
  pending:   { icon: Hourglass,    label: "Pendente",  cls: "bg-warning/15",     style: { color: "oklch(0.45 0.12 60)" } },
  accepted:  { icon: CheckCircle2, label: "Aceito",    cls: "bg-success/15",     style: { color: "oklch(0.40 0.14 150)" } },
  declined:  { icon: XCircle,      label: "Recusado",  cls: "bg-destructive/10", style: { color: "oklch(0.50 0.20 25)" } },
  cancelled: { icon: XCircle,      label: "Cancelado", cls: "bg-muted",          style: { color: "var(--muted-foreground)" } },
  completed: { icon: CheckCircle2, label: "Concluído", cls: "bg-primary/10",     style: { color: "var(--primary)" } },
} as const;

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { icon: Icon, label, cls, style } = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
      style={style}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
