import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/landing/HomePage";
import { getSiteOrigin } from "@/lib/site-origin";

const TITLE = "JETRA — экосистема капитала";
const DESC = "Инвестиционные стратегии, финансовое образование и сообщество инвесторов — в одной платформе.";

export const Route = createFileRoute("/")({
  loader: () => ({ origin: getSiteOrigin() }),
  head: ({ loaderData }) => {
    const image = `${loaderData?.origin ?? ""}/og-image.jpg`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: HomePage,
});
