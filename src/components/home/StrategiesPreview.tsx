import StrategiesCatalog from "@/components/strategies/StrategiesCatalog";

export default function StrategiesPreview() {
  return (
    <section className="bg-brand-light py-14 md:py-20">
      <div className="container-x">
        <div className="eyebrow mb-6 text-center">Стратегии</div>
        <StrategiesCatalog />
      </div>
    </section>
  );
}
