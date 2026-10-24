import StrategyCard from "@/components/strategies/StrategyCard";
import { STRATEGIES } from "@/data/catalog";

export default function StrategiesPreview() {
  return (
    <section className="bg-brand-light py-14 md:py-20">
      <div className="container-x">
        <div className="eyebrow">Стратегии</div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.map((s, i) => (
            <StrategyCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}