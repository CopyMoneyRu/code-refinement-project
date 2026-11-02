import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { RiskStyle } from "@/lib/strategies";

const BAR_COLORS = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];

export const RISK_TEXT = ["", "Очень высокий риск", "Высокий риск", "Умеренный риск", "Пониженный риск", "Низкий риск"];

export default function RiskMeter({ level, style, showText = false, className }: { level: number; style: RiskStyle; showText?: boolean; className?: string }) {
  const lv = Math.min(5, Math.max(1, level));
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={`${RISK_TEXT[lv]} (${lv} из 5)`}>
      {style === "bars" ? (
        <span className="flex items-end gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn("w-1.5 rounded-sm", i <= lv ? BAR_COLORS[lv - 1] : "bg-brand-ink/10")} style={{ height: 6 + i * 2.5 }} />
          ))}
        </span>
      ) : (
        <span className="flex gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <Icon key={i} name="Star" size={14} className={i <= lv ? "fill-amber-400 text-amber-400" : "text-brand-ink/15"} />
          ))}
        </span>
      )}
      <span className="sr-only">{RISK_TEXT[lv]}</span>
      {showText && <span className="text-sm text-brand-muted">{RISK_TEXT[lv]}</span>}
    </span>
  );
}
