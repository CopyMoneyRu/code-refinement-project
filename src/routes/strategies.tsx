import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import StrategiesCatalog from "@/components/strategies/StrategiesCatalog";

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
        <div className="container-x">
          <StrategiesCatalog />
        </div>
      </section>
    </PublicLayout>
  );
}
