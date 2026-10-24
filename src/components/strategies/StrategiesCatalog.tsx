import { useState } from "react";
import Icon from "@/components/ui/icon";
import StrategyCard from "@/components/strategies/StrategyCard";
import { MARKETS, STRATEGIES, type Market } from "@/data/catalog";
import { cn } from "@/lib/utils";

export default function StrategiesCatalog() {
  const [market, setMarket] = useState<Market | "all">("all");
  const list = market === "all" ? STRATEGIES : STRATEGIES.filter((s) => s.market === market);

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-brand-ink/10 px-1 pb-6">
        {MARKETS.map((m) => {
          const count = m.id === "all" ? STRATEGIES.length : STRATEGIES.filter((s) => s.market === m.id).length;
          const active = market === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMarket(m.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors",
                active ? "bg-brand-blue text-white" : "bg-white text-brand-muted hover:text-brand-ink",
              )}
            >
              <Icon name={m.icon} size={17} fallback="Circle" />
              {m.label}
              <span className={cn("text-sm", active ? "text-white/75" : "text-brand-ink/40")}>{count}</span>
            </button>
          );
        })}
      </div>

      {list.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <StrategyCard key={s.id} s={s} index={STRATEGIES.indexOf(s)} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center text-brand-muted">В этом разделе стратегии скоро появятся.</div>
      )}
    </div>
  );
}
