import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/legal/LegalPage";
import { CONSENT } from "@/components/legal/texts/consent";

const TITLE = "Согласие на обработку персональных данных — JETRA";
const DESCRIPTION = "Текст согласия на обработку персональных данных пользователей JETRA.";

export const Route = createFileRoute("/personal-data-consent")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => <LegalPage title="Согласие на обработку персональных данных" text={CONSENT} current="/personal-data-consent" />,
});
