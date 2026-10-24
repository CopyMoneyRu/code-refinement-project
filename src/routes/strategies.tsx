import { createFileRoute } from "@tanstack/react-router";
import PublicLayout, { PageIntro } from "@/components/site/PublicLayout";
import StrategyCard from "@/components/strategies/StrategyCard";
import Icon from "@/components/ui/icon";
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
      <PageIntro
        eyebrow="Каталог"
        title={<>Инвестиционные <span className="font-bold">стратегии</span></>}
        text="Девять подходов к управлению капиталом. Подключение стратегий станет доступно на следующих этапах развития платформы."
      >
        <div className="mt-8 inline-flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm text-brand-snow/70">
          <Icon name="Info" size={16} className="text-brand-blue" />
          Сейчас стратегии представлены в ознакомительном режиме
        </div>
      </PageIntro>
      <section className="pb-24">
        <div className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.map((s, i) => (
            <StrategyCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
