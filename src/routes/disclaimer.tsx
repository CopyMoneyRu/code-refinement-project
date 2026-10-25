import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/legal/LegalPage";
import { DISCLAIMER } from "@/components/legal/texts/disclaimer";

const TITLE = "Отказ от финансовых гарантий — JETRA";
const DESCRIPTION = "Материалы JETRA носят информационный характер и не являются инвестиционной рекомендацией.";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => <LegalPage title="Отказ от финансовых гарантий" text={DISCLAIMER} current="/disclaimer" />,
});
