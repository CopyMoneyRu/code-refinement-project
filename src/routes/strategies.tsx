import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import StrategyCard from "@/components/strategies/StrategyCard";
import { STRATEGIES } from "@/data/catalog";

export const Route = createFileRoute("/strategies")({
  head: () => ({
    meta: [
      { title: "Стратегии — JETRA" },
      { name: "description", content: "Каталог инвестиционных стратегий платформы JETRA." },
      { property: "og:title", content: "Стратегии — JETRA" },
      { property: "og:description", content: "Каталог инвестиционных стратегий платформы JETRA." },
    ],
  }),
  component: StrategiesPage,
});

function StrategiesPage() {
  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.map((s, i) => (
            <StrategyCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
