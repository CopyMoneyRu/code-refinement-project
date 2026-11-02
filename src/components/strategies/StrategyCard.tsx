import type { ReactNode } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import RiskMeter from "@/components/strategies/RiskMeter";
import { cn } from "@/lib/utils";
import { EXCHANGE_LABEL, LABEL_COLORS, yieldText, type Strategy } from "@/lib/strategies";

const rootApi = getRouteApi("__root__");

export function StrategyLabels({ s, className }: { s: Pick<Strategy, "labels" | "status">; className?: string }) {
  if (!s.labels.length && s.status !== "paused") return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {s.status === "paused" && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Набор приостановлен</span>}
      {s.labels.map((l) => (
        <span key={l.id} className={cn("rounded-md px-2 py-0.5 text-xs font-medium", LABEL_COLORS[l.color] ?? LABEL_COLORS.blue)}>
          {l.name}
        </span>
      ))}
    </div>
  );
}

export function cardRows(s: Strategy) {
  const y = yieldText(s.yield);
  const o = s.cardOptions;
  const rows: { k: string; v: ReactNode }[] = [];
  if (o.showYield && y)
    rows.push({
      k: s.yield.basis === "actual" ? "Доходность" : "Прогноз доходности",
      v: (
        <>
          {y}
          {s.yield.period && <span className="font-normal text-brand-muted"> {s.yield.period}</span>}
        </>
      ),
    });
  if (o.showPrice && s.priceLabel) rows.push({ k: "Стоимость участия", v: s.priceLabel });
  if (o.showExchanges && s.exchanges.length) rows.push({ k: "Биржи", v: s.exchanges.map((e) => EXCHANGE_LABEL[e]).join(", ") });
  for (const m of s.metrics) rows.push({ k: m.label, v: m.value });
  return rows;
}

export default function StrategyCard({ s, preview = false }: { s: Strategy; preview?: boolean }) {
  const user = rootApi.useLoaderData();
  const rows = cardRows(s);
  const open = !!user || preview;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white transition-colors hover:border-brand-blue/40">
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1F4372] to-[#0E1A2B]">
        {s.coverUrl ? (
          <img src={s.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-white/30">
            <Icon name={s.category?.icon ?? "LineChart"} size={48} fallback="LineChart" />
          </span>
        )}
        {s.category && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-brand-ink backdrop-blur">
            <Icon name={s.category.icon} size={13} fallback="Shapes" className="text-brand-blue" /> {s.category.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <StrategyLabels s={s} className="mb-3" />
        <h3 className="font-display text-xl font-semibold text-brand-ink">
          {preview ? (
            s.title
          ) : user ? (
            <Link to="/strategies/$slug" params={{ slug: s.slug }} className="after:absolute after:inset-0 after:content-['']">
              {s.title}
            </Link>
          ) : (
            <Link to="/login" search={{ redirect: `/strategies/${s.slug}` }} className="after:absolute after:inset-0 after:content-['']">
              {s.title}
            </Link>
          )}
        </h3>
        {s.short && <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{s.short}</p>}
        {s.cardOptions.showRisk && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-brand-ink/50">Надёжность</span>
            <RiskMeter level={s.risk.level} style={s.risk.style} />
          </div>
        )}
        {rows.length > 0 && (
          <dl className="mt-4 space-y-2.5 border-t border-brand-ink/10 pt-4 text-sm">
            {rows.map((r, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <dt className="text-brand-ink/50">{r.k}</dt>
                <dd className="text-right font-medium text-brand-ink">{r.v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-brand-surface px-4 py-3 text-sm font-medium text-brand-ink transition-colors group-hover:bg-brand-blue group-hover:text-white">
            {open ? "Подробнее о стратегии" : "Войдите, чтобы узнать подробности"}
            <Icon name={open ? "ArrowRight" : "Lock"} size={16} />
          </div>
        </div>
      </div>
    </article>
  );
}
