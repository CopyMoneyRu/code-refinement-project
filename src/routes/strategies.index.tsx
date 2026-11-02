import { createFileRoute } from "@tanstack/react-router";
import StrategiesPage from "@/components/strategies/StrategiesPage";
import { strategiesCatalogFn } from "@/lib/strategies";
import { getSiteOrigin } from "@/lib/site-origin";

export const Route = createFileRoute("/strategies/")({
  loader: async () => ({ ...(await strategiesCatalogFn()), origin: getSiteOrigin() }),
  head: ({ loaderData }) => {
    const image = `${loaderData?.origin ?? ""}/og-strategies.jpg`;
    return {
      meta: [
        { title: "Стратегии — JETRA" },
        { name: "description", content: "Каталог инвестиционных стратегий платформы JETRA." },
        { property: "og:title", content: "Стратегии — JETRA" },
        { property: "og:description", content: "Каталог инвестиционных стратегий платформы JETRA." },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { strategies, categories } = Route.useLoaderData();
  return <StrategiesPage strategies={strategies} categories={categories} />;
}
