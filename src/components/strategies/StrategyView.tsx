import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import BlockRenderer from "@/components/strategies/BlockRenderer";
import RiskMeter from "@/components/strategies/RiskMeter";
import { StrategyLabels, cardRows } from "@/components/strategies/StrategyCard";
import type { Block, Strategy } from "@/lib/strategies";

export default function StrategyView({ s, blocks, preview = false }: { s: Strategy; blocks: Block[]; preview?: boolean }) {
  const rows = cardRows(s);
  return (
    <section className="pb-16 pt-10 md:pt-14">
      <div className="container-x">
        {!preview && (
          <Link to="/strategies" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
            <Icon name="ArrowLeft" size={16} /> Все стратегии
          </Link>
        )}
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {s.category && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-blue">
                  <Icon name={s.category.icon} size={13} fallback="Shapes" /> {s.category.name}
                </span>
              )}
              <StrategyLabels s={s} />
            </div>
            <h1 className="mt-5 font-display text-4xl font-light leading-[1.1] text-brand-ink md:text-[52px]">{s.title}</h1>
            {s.short && <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-brand-muted">{s.short}</p>}
            {s.coverUrl && (
              <div className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-brand-surface">
                <img src={s.coverUrl} alt={s.title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="mt-10">
              <BlockRenderer blocks={blocks} />
            </div>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-brand-ink/10 bg-white p-7">
              <div className="text-sm text-brand-muted">Надёжность стратегии</div>
              <div className="mt-2">
                <RiskMeter level={s.risk.level} style={s.risk.style} showText />
              </div>
              <p className="mt-2 text-xs text-brand-ink/45">5 — наименьший риск, 1 — наибольший</p>
              {rows.length > 0 && (
                <dl className="mt-5 space-y-3 border-t border-brand-ink/10 pt-5 text-sm">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3">
                      <dt className="text-brand-muted">{r.k}</dt>
                      <dd className="text-right font-medium text-brand-ink">{r.v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.yield.mode !== "none" && s.yield.basis === "forecast" && (
                <p className="mt-4 text-xs leading-relaxed text-brand-ink/45">Прогнозная доходность не гарантирована и не является обещанием результата.</p>
              )}
              {s.accessNote && <p className="mt-5 whitespace-pre-line border-t border-brand-ink/10 pt-5 text-sm leading-relaxed text-brand-muted">{s.accessNote}</p>}
              <button
                type="button"
                disabled
                className="mt-6 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-brand-blue/60 py-3.5 font-medium text-white"
                title="Подключение откроется после запуска тарифов"
              >
                <Icon name="Clock" size={17} /> {s.status === "paused" ? "Набор приостановлен" : "Подключение скоро откроется"}
              </button>
            </div>
            <p className="mt-4 px-1 text-xs leading-relaxed text-brand-ink/45">
              Материалы носят информационный характер и не являются индивидуальной инвестиционной рекомендацией. Инвестиции связаны с риском потери капитала.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
