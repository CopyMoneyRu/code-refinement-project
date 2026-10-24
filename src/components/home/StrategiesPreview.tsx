import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import StrategyCard from "@/components/strategies/StrategyCard";
import { STRATEGIES } from "@/data/catalog";

export default function StrategiesPreview() {
  return (
    <section className="border-t border-white/[0.06] bg-brand-navy py-20 md:py-28">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="eyebrow">Стратегии</div>
            <h2 className="mt-4 font-display text-3xl font-light leading-tight text-brand-snow md:text-[44px]">
              Профессиональные подходы <span className="font-bold">к управлению капиталом</span>
            </h2>
          </div>
          <Link
            to="/strategies"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-brand-blue hover:text-brand-snow"
          >
            Все 9 стратегий <Icon name="ArrowRight" size={18} />
          </Link>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.slice(0, 3).map((s, i) => (
            <StrategyCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
