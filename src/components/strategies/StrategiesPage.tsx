import PublicLayout from "@/components/site/PublicLayout";
import StrategiesCatalog from "@/components/strategies/StrategiesCatalog";

export default function StrategiesPage() {
  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <StrategiesCatalog />
        </div>
      </section>
    </PublicLayout>
  );
}
