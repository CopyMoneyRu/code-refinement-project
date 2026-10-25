import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/legal/LegalPage";
import { PRIVACY } from "@/components/legal/texts/privacy";

const TITLE = "Политика конфиденциальности — JETRA";
const DESCRIPTION = "Порядок обработки и защиты персональных данных пользователей платформы JETRA.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => <LegalPage title="Политика конфиденциальности" text={PRIVACY} current="/privacy" />,
});
