import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Hero from "@/components/home/Hero";
import Directions from "@/components/home/Directions";
import StrategiesPreview from "@/components/home/StrategiesPreview";
import Principles from "@/components/home/Principles";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-brand-navy">
      <SiteHeader tone="light" />
      <main>
        <Hero />
        <Directions />
        <StrategiesPreview />
        <Principles />
      </main>
      <SiteFooter />
    </div>
  );
}
