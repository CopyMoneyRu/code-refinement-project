import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/legal/LegalPage";
import { TERMS } from "@/components/legal/texts/terms";

const TITLE = "Пользовательское соглашение — JETRA";
const DESCRIPTION = "Условия использования платформы JETRA и JETRA University.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => <LegalPage title="Пользовательское соглашение" text={TERMS} current="/terms" />,
});
