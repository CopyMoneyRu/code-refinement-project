import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export const discountDateLabel = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[(m || 1) - 1]}`;
};

const pad = (n: number) => String(n).padStart(2, "0");

function useLeft(iso: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(iso).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return left;
}

function split(ms: number) {
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const daysWord = (n: number) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? "день" : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? "дня" : "дней";
};

export default function DiscountTimer({ until, variant = "card", className }: { until: string; variant?: "card" | "page"; className?: string }) {
  const left = useLeft(until);
  if (left === 0) return null;
  const t = left === null ? null : split(left);
  const date = discountDateLabel(until);

  if (variant === "page") {
    return (
      <div className={cn("rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-3.5", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
          <Icon name="Timer" size={16} className="text-rose-500" /> Скидка действует до {date}
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
          {(
            [
              [t?.d, "дн"],
              [t?.h, "ч"],
              [t?.m, "мин"],
              [t?.s, "сек"],
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="rounded-lg bg-white py-1.5 shadow-sm shadow-rose-100">
              <div className="font-display text-lg font-semibold tabular-nums leading-tight text-brand-ink">{v === undefined ? "—" : l === "дн" ? v : pad(v)}</div>
              <div className="text-[10px] uppercase tracking-wide text-brand-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md border border-rose-100 bg-rose-50/80 px-2.5 py-1 text-xs font-medium text-rose-700",
        className,
      )}
    >
      <Icon name="Timer" size={13} className="shrink-0 text-rose-500" />
      <span>Скидка до {date}</span>
      {t && (
        <span className="tabular-nums text-rose-700/70">
          · {t.d > 0 ? `${t.d} ${daysWord(t.d)} ` : ""}
          {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
        </span>
      )}
    </span>
  );
}
