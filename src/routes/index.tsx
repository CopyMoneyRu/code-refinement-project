import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Hero from "@/components/home/Hero";
import StrategiesPreview from "@/components/home/StrategiesPreview";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-brand-navy">
      <SiteHeader tone="light" />
      <main>
        <Hero />
        <StrategiesPreview />
      </main>
      <SiteFooter />
    </div>
  );
}
