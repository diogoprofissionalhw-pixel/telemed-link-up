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
        "rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2.5 h-7 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 text-2xl font-bold leading-none tracking-tight md:text-[26px]">{value}</p>
          )}
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          {trend && (
            <p
              className="mt-2 text-xs font-medium"
              style={{ color: trend.positive ? "var(--success)" : "var(--destructive)" }}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent">
          <Icon className="h-[18px] w-[18px] text-primary" />
        </div>
      </div>
    </div>
  );
}
