import StrategyCard from "@/components/strategies/StrategyCard";
import { STRATEGIES } from "@/data/catalog";

export default function StrategiesPreview() {
  return (
    <section className="border-t border-brand-ink/10 bg-brand-surface/40 py-20 md:py-28">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="eyebrow">Стратегии</div>
            <h2 className="mt-4 font-display text-3xl font-light leading-tight text-brand-ink md:text-[44px]">
              Профессиональные подходы
            </h2>
          </div>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.map((s, i) => (
            <StrategyCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}