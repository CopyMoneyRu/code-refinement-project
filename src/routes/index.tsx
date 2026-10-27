import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/landing/HomePage";

const TITLE = "JETRA — экосистема для создания и роста капитала";
const DESC = "Инвестиционные стратегии, финансовое образование и сообщество инвесторов — в одной платформе.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: HomePage,
});
