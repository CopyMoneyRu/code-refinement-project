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

const hoursWord = (n: number) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? "час" : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? "часа" : "часов";
};

export function DiscountHint({ until, className }: { until: string; className?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(until).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [until]);
  if (left === 0) return null;
  const t = left === null ? null : split(left);
  const urgent = !!t && t.d === 0;
  const text = !t
    ? `Скидка до ${discountDateLabel(until)}`
    : t.d >= 1
      ? `Скидка ещё ${t.d} ${daysWord(t.d)}`
      : t.h >= 1
        ? `Скидка заканчивается сегодня · ${t.h} ${hoursWord(t.h)}`
        : "Скидка заканчивается через несколько минут";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", urgent ? "font-medium text-rose-600" : "text-brand-muted", className)}>
      <Icon name="Timer" size={12} className={urgent ? "text-rose-500" : "text-brand-muted/80"} />
      {text}
    </span>
  );
}

export default function DiscountTimer({ until, variant = "card", className }: { until: string; variant?: "card" | "page"; className?: string }) {
  const left = useLeft(until);
  if (left === 0) return null;
  const t = left === null ? null : split(left);
  const date = discountDateLabel(until);

  if (variant === "page") {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm", className)}>
        <span className="inline-flex items-center gap-1.5 text-brand-muted">
          <Icon name="Timer" size={15} className={t && t.d === 0 ? "text-rose-500" : "text-brand-muted/80"} /> Скидка до {date}
        </span>
        <span className="inline-flex items-center gap-1 font-medium tabular-nums text-brand-ink">
          {t ? (
            <>
              {t.d > 0 && <span>{t.d} {daysWord(t.d)}</span>}
              <span className={cn("rounded-md px-1.5 py-0.5", t.d === 0 ? "bg-rose-50 text-rose-700" : "bg-brand-light")}>
                {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
              </span>
            </>
          ) : (
            "—"
          )}
        </span>
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