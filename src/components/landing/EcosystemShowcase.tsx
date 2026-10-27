import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import ClubLink from "@/components/site/ClubLink";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const cta = "group/cta inline-flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue";
const arrow = <Icon name="ArrowRight" size={16} className="transition-transform group-hover/cta:translate-x-0.5" />;

function Panel({ icon, title, text, action, children, className, wide }: { icon: string; title: string; text: string; action: ReactNode; children: ReactNode; className?: string; wide?: boolean }) {
  if (wide)
    return (
      <div className={cn("relative grid gap-6 overflow-hidden rounded-[28px] border border-brand-ink/[0.06] bg-white p-5 shadow-[0_30px_80px_-50px_rgba(23,38,60,0.45)] sm:p-7 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-10 lg:p-9", className)}>
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-blue/[0.07] blur-3xl" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
            <Icon name={icon} size={21} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight text-brand-ink md:text-[32px]">{title}</h3>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-brand-muted md:text-base">{text}</p>
          <div className="mt-7 hidden md:block">{action}</div>
        </div>
        <div className="relative min-w-0">{children}</div>
        <div className="md:hidden">{action}</div>
      </div>
    );
  return (
    <div className={cn("group relative flex flex-col overflow-hidden rounded-[28px] border border-brand-ink/[0.06] bg-white p-5 shadow-[0_30px_80px_-50px_rgba(23,38,60,0.45)] transition-shadow hover:shadow-[0_40px_90px_-45px_rgba(23,38,60,0.5)] sm:p-7", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
            <Icon name={icon} size={21} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight text-brand-ink">{title}</h3>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-brand-muted">{text}</p>
        </div>
      </div>
      <div className="relative mt-6 flex-1">{children}</div>
      <div className="mt-6">{action}</div>
    </div>
  );
}

function Window({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-brand-ink/[0.06] bg-brand-light/70 p-3 sm:p-4", className)}>{children}</div>;
}

function Spark({ d, color = "#397FC4" }: { d: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 32" className="h-7 w-12 shrink-0 sm:h-8 sm:w-20" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const STRATS = [
  { name: "Дивидендный портфель", tag: "Россия", risk: "Умеренный", d: "M0 26 L15 22 L28 24 L42 17 L56 19 L70 12 L84 13 L100 6", active: true },
  { name: "Технологии США", tag: "США", risk: "Высокий", d: "M0 28 L14 20 L26 25 L40 14 L54 18 L68 9 L82 14 L100 4" },
  { name: "Облигационный доход", tag: "Облигации", risk: "Низкий", d: "M0 24 L20 22 L40 20 L60 17 L80 15 L100 12" },
  { name: "Доходная недвижимость", tag: "Недвижимость", risk: "Умеренный", d: "M0 25 L18 23 L34 21 L50 18 L66 19 L82 13 L100 10" },
];

function StrategiesMock() {
  return (
    <Window className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-medium text-brand-muted">Каталог стратегий</span>
        <span className="flex gap-1">
          {["Все", "Россия", "США"].map((t, i) => (
            <span key={t} className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", i === 0 ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted")}>
              {t}
            </span>
          ))}
        </span>
      </div>
      {STRATS.map((s) => (
        <div
          key={s.name}
          className={cn(
            "flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 transition-all sm:px-4 sm:py-3",
            s.active ? "shadow-[0_12px_30px_-18px_rgba(57,127,196,0.7)] ring-1 ring-brand-blue/30" : "shadow-sm",
          )}
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", s.active ? "bg-brand-blue" : "bg-brand-ink/15")} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-brand-ink">{s.name}</span>
            <span className="mt-0.5 flex gap-1.5 text-[11px] text-brand-muted">
              <span className="whitespace-nowrap">{s.tag}</span>
              <span className="hidden whitespace-nowrap sm:inline">· риск: {s.risk.toLowerCase()}</span>
            </span>
          </span>
          <Spark d={s.d} color={s.active ? "#397FC4" : "#17263C66"} />
        </div>
      ))}
    </Window>
  );
}

const LESSONS = [
  { t: "Как устроен фондовый рынок", done: true },
  { t: "Акции и облигации", done: true },
  { t: "Диверсификация портфеля", now: true },
  { t: "Риск и доходность" },
];

function UniversityMock() {
  return (
    <Window>
      <div className="flex items-center gap-3">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-ink to-[#2D4A72] text-white">
          <Icon name="Play" size={18} className="translate-x-px" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-brand-ink">Основы инвестирования</span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
              <span className="block h-full w-[64%] rounded-full bg-brand-blue" />
            </span>
            <span className="text-[11px] font-semibold text-brand-ink">64%</span>
          </span>
        </span>
      </div>
      <ul className="mt-3 space-y-1">
        {LESSONS.map((l) => (
          <li key={l.t} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]", l.now ? "bg-white font-medium text-brand-ink shadow-sm" : "text-brand-muted")}>
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                l.done ? "bg-emerald-500 text-white" : l.now ? "bg-brand-blue text-white" : "border border-brand-ink/15",
              )}
            >
              {l.done && <Icon name="Check" size={12} />}
              {l.now && <Icon name="Play" size={9} />}
            </span>
            <span className="truncate">{l.t}</span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

const MSGS = [
  { n: "Ирина", c: "#397FC4", t: "Разобрала отчётность за квартал — делюсь выводами" },
  { n: "Дмитрий", c: "#17263C", t: "Как вы балансируете долю облигаций?" },
];

function CommunityMock() {
  return (
    <Window>
      <div className="flex items-center justify-between">
        <span className="flex -space-x-2">
          {["И", "Д", "А", "М"].map((l, i) => (
            <span key={l} className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[#F5F7FA]" style={{ background: ["#397FC4", "#17263C", "#5C9BD8", "#2D4A72"][i] }}>
              {l}
            </span>
          ))}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> онлайн
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {MSGS.map((m) => (
          <div key={m.n} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: m.c }}>
              {m.n[0]}
            </span>
            <span className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-snug text-brand-ink shadow-sm">
              <span className="block text-[11px] font-semibold text-brand-muted">{m.n}</span>
              {m.t}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl border border-brand-blue/20 bg-white px-3 py-2 text-[12px]">
          <Icon name="Radio" size={14} className="text-brand-blue" />
          <span className="font-medium text-brand-ink">Эфир: разбор портфелей</span>
          <span className="ml-auto text-brand-muted">чт, 19:00</span>
        </div>
      </div>
    </Window>
  );
}

export default function EcosystemShowcase() {
  return (
    <div className="mt-12 grid gap-5 lg:grid-cols-2">
      <Panel
        wide
        className="lg:col-span-2"
        icon="LineChart"
        title="Стратегии"
        text="Изучайте подходы к инвестированию и выбирайте направления под свои цели."
        action={
          <Link to="/strategies" className={cta}>
            Смотреть стратегии {arrow}
          </Link>
        }
      >
        <StrategiesMock />
      </Panel>
      <Panel
        icon="GraduationCap"
        title="Университет"
        text="Знания от инвесторов, экспертов и авторов образовательных программ."
        action={
          <Link to="/university" className={cta}>
            Перейти к обучению {arrow}
          </Link>
        }
      >
        <UniversityMock />
      </Panel>
      <Panel
        icon="Users"
        title="Сообщество"
        text="Единомышленники, инвестиционные идеи и развитие финансового мышления."
        action={
          <ClubLink className={cta}>
            Подробнее {arrow}
          </ClubLink>
        }
      >
        <CommunityMock />
      </Panel>
    </div>
  );
}
