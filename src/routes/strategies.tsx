import { createFileRoute } from "@tanstack/react-router";
import StrategiesPage from "@/components/strategies/StrategiesPage";

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
