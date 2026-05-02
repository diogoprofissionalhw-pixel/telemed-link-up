import { type ComponentType } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  loading?: boolean;
  className?: string;
}

export function StatsCard({ label, value, icon: Icon, hint, trend, loading, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 transition-all hover:shadow-md",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {trend && (
            <p
              className="mt-1 text-xs font-medium"
              style={{ color: trend.positive ? "var(--success)" : "var(--destructive)" }}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
