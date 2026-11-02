import PublicLayout from "@/components/site/PublicLayout";
import StrategiesCatalog from "@/components/strategies/StrategiesCatalog";
import type { Strategy, StrategyCategory } from "@/lib/strategies";

export default function StrategiesPage({ strategies, categories }: { strategies: Strategy[]; categories: StrategyCategory[] }) {
  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <StrategiesCatalog strategies={strategies} categories={categories} />
        </div>
      </section>
    </PublicLayout>
  );
}
