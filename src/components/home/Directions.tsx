import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";

const ITEMS = [
  {
    to: "/strategies",
    icon: "LineChart",
    title: "Стратегии",
    text: "Каталог из девяти инвестиционных стратегий. Подключение откроется на следующих этапах.",
    cta: "Каталог стратегий",
  },
  {
    to: "/university",
    icon: "GraduationCap",
    title: "JETRA University",
    text: "Обучение инвестициям: модули, видеоуроки, материалы и отслеживание прогресса.",
    cta: "Каталог обучений",
  },
] as const;

export default function Directions() {
  return (
    <section className="bg-brand-light py-20 md:py-28">
      <div className="container-x">
        <div className="max-w-2xl">
          <div className="eyebrow">Платформа</div>
          <h2 className="mt-4 font-display text-3xl font-light leading-tight text-brand-ink md:text-[44px]">
            Два направления — <span className="font-bold">одна система</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {ITEMS.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="group flex flex-col rounded-2xl border border-brand-ink/10 bg-white p-8 transition-colors hover:border-brand-blue/50 md:p-10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/12 text-brand-blue">
                <Icon name={it.icon} size={24} />
              </div>
              <h3 className="mt-8 font-display text-2xl font-semibold text-brand-ink md:text-[28px]">{it.title}</h3>
              <p className="mt-3 max-w-md text-[16px] leading-relaxed text-brand-muted">{it.text}</p>
              <span className="mt-10 inline-flex items-center gap-2 text-[15px] font-medium text-brand-blue">
                {it.cta}
                <Icon name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
