import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import StrategyCard from "@/components/strategies/StrategyCard";
import { cn } from "@/lib/utils";
import type { Strategy, StrategyCategory } from "@/lib/strategies";

export default function StrategiesCatalog({ strategies, categories }: { strategies: Strategy[]; categories: StrategyCategory[] }) {
  const [cat, setCat] = useState<number>(0);
  const tabs = useMemo(
    () => [
      { id: 0, name: "Все", icon: "LayoutGrid", count: strategies.length },
      ...categories.map((c) => ({ ...c, count: strategies.filter((s) => s.category?.id === c.id).length })).filter((c) => c.count > 0),
    ],
    [strategies, categories],
  );
  const list = cat ? strategies.filter((s) => s.category?.id === cat) : strategies;

  if (!strategies.length) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-brand-ink/10 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-blue">
          <Icon name="LineChart" size={26} />
        </div>
        <div className="mt-5 font-display text-lg font-semibold text-brand-ink">Стратегии скоро появятся</div>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">Мы готовим первые инвестиционные стратегии JETRA. Загляните чуть позже.</p>
      </div>
    );
  }

  return (
    <div>
      {tabs.length > 2 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-brand-ink/10 px-1 pb-6 md:flex-wrap md:justify-center md:overflow-visible">
          {tabs.map((m) => {
            const active = cat === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setCat(m.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors",
                  active ? "bg-brand-blue text-white" : "bg-white text-brand-muted hover:text-brand-ink",
                )}
              >
                <Icon name={m.icon} size={17} fallback="Circle" />
                {m.name}
                <span className={cn("text-sm", active ? "text-white/75" : "text-brand-ink/40")}>{m.count}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <StrategyCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}
