import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export default function StatTile({
  label,
  value,
  icon,
  hint,
  delta,
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-brand-ink/[0.08] bg-white p-5">
      <div className="flex items-center justify-between gap-2 text-brand-muted">
        <span className="text-sm">{label}</span>
        <Icon name={icon} size={17} className="shrink-0 text-brand-blue" />
      </div>
      <div className="mt-3 font-display text-[28px] font-bold leading-none text-brand-ink">{value}</div>
      {(hint || delta !== undefined) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-brand-muted">
          {delta !== undefined && delta !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                delta > 0 ? "bg-emerald-500/10 text-emerald-700" : delta < 0 ? "bg-red-500/10 text-red-600" : "bg-brand-surface text-brand-muted",
              )}
            >
              <Icon name={delta > 0 ? "TrendingUp" : delta < 0 ? "TrendingDown" : "Minus"} size={12} />
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          )}
          {hint}
        </div>
      )}
    </div>
  );
}

export const deltaOf = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) * 100) / prev) : cur ? 100 : null);
