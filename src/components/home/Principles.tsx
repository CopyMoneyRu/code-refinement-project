import Icon from "@/components/ui/icon";

const ITEMS = [
  { icon: "Cpu", title: "Технологии", text: "Современная архитектура и автоматизация процессов." },
  { icon: "Layers", title: "Инструменты", text: "Широкий набор инвестиционных инструментов и подходов." },
  { icon: "ShieldCheck", title: "Безопасность", text: "Защищённые сессии и разграничение прав доступа." },
  { icon: "BookOpen", title: "Знания", text: "Системное обучение в JETRA University." },
];

export default function Principles() {
  return (
    <section className="bg-brand-light py-20 text-brand-ink md:py-28">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div>
          <div className="eyebrow">Принципы</div>
          <h2 className="mt-4 font-display text-3xl font-light leading-tight md:text-[44px]">
            Строгий подход <span className="font-bold">без лишнего шума</span>
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl bg-brand-ink/10 sm:grid-cols-2">
          {ITEMS.map((it) => (
            <div key={it.title} className="bg-brand-light p-7 md:p-8">
              <Icon name={it.icon} size={24} className="text-brand-blue" />
              <h3 className="mt-6 font-display text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
