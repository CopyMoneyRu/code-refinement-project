import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import StrategyView from "@/components/strategies/StrategyView";
import { requireAuth } from "@/lib/requireAuth";
import { strategyBySlugFn } from "@/lib/strategies";
import StrategyJoin from "@/components/strategies/StrategyJoin";
import { offerFn } from "@/lib/billing";

export const Route = createFileRoute("/strategies/$slug")({
  beforeLoad: requireAuth,
  loader: async ({ params }) => {
    const [page, offer] = await Promise.all([strategyBySlugFn({ data: { slug: params.slug } }), offerFn({ data: { slug: params.slug } })]);
    return { ...page, offer: offer.ok ? offer : null };
  },
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
  const { strategy, blocks, offer } = Route.useLoaderData();
  return (
    <PublicLayout>
      <StrategyView s={strategy} blocks={blocks} join={<StrategyJoin offer={offer} />} />
    </PublicLayout>
  );
}
