import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StrategiesPreview from "@/components/home/StrategiesPreview";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-brand-light">
      <SiteHeader tone="light" />
      <main>
        <StrategiesPreview />
      </main>
      <SiteFooter />
    </div>
  );
}
