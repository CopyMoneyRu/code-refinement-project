import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import StrategyView from "@/components/strategies/StrategyView";
import { requireAuth } from "@/lib/requireAuth";
import { strategyBySlugFn } from "@/lib/strategies";

export const Route = createFileRoute("/strategies/$slug")({
  beforeLoad: requireAuth,
  loader: ({ params }) => strategyBySlugFn({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.strategy.title} — стратегии JETRA` : "Стратегия — JETRA";
    const desc = loaderData?.strategy.short || "Инвестиционная стратегия платформы JETRA";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(loaderData?.strategy.coverUrl ? [{ property: "og:image", content: loaderData.strategy.coverUrl }] : []),
      ],
    };
  },
  component: StrategyPage,
});

function StrategyPage() {
  const { strategy, blocks } = Route.useLoaderData();
  return (
    <PublicLayout>
      <StrategyView s={strategy} blocks={blocks} />
    </PublicLayout>
  );
}
