import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import ClubLink from "@/components/site/ClubLink";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const linkCls = "group/cta inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue transition-colors hover:text-brand-ink";
const arrow = <Icon name="ArrowRight" size={15} className="transition-transform group-hover/cta:translate-x-0.5" />;

function Panel({ icon, title, text, action, children }: { icon: string; title: string; text: string; action: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex w-[86%] shrink-0 snap-start flex-col rounded-[24px] border border-brand-ink/[0.06] bg-white p-5 shadow-[0_30px_80px_-50px_rgba(23,38,60,0.45)] transition-shadow hover:shadow-[0_40px_90px_-45px_rgba(23,38,60,0.5)] sm:w-[60%] lg:w-auto lg:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
          <Icon name={icon} size={20} />
        </span>
        <h3 className="font-display text-xl font-semibold tracking-tight text-brand-ink">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-brand-muted">{text}</p>
      <div className="mt-4 flex-1 rounded-2xl border border-brand-ink/[0.06] bg-brand-light/70 p-3">{children}</div>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function path(values: number[], w: number, h: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - ((v - min) / (max - min || 1)) * h).toFixed(1)}`).join(" ");
}

function Spark({ values, color = "#397FC4", className }: { values: number[]; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("shrink-0", className)} aria-hidden>
      <path d={path(values, 100, 30)} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(seed: number, n: number, total: number, dips: { from: number; to: number; depth: number }[], vol = 1) {
  const r = rng(seed);
  const raw: number[] = [0];
  for (let i = 1; i < n; i++) {
    let step = ((r() - 0.5) * 0.02 + (r() < 0.04 ? (r() - 0.5) * 0.035 : 0)) * vol;
    for (const d of dips) {
      const len = d.to - d.from;
      if (i > d.from && i <= d.to) step -= d.depth / len;
      if (i > d.to && i <= d.to + len * 1.4) step += (d.depth * 0.6) / (len * 1.4);
    }
    raw.push(raw[i - 1] + step);
  }
  const drift = (Math.log(1 + total) - raw[n - 1]) / (n - 1);
  return raw.map((v, i) => 100 * Math.exp(v + drift * i));
}

const MAIN = series(11, 180, 0.246, [
  { from: 48, to: 64, depth: 0.07 },
  { from: 120, to: 130, depth: 0.04 },
]);

const STRATS = [
  { name: "Технологии США", y: 21.3, v: series(37, 90, 0.213, [{ from: 30, to: 42, depth: 0.08 }]) },
  { name: "Облигационный доход", y: 11.8, v: series(53, 90, 0.118, [{ from: 55, to: 60, depth: 0.012 }], 0.25) },
];

function StrategiesMock() {
  const d = path(MAIN, 300, 64);
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-brand-ink">Дивидендный портфель</div>
            <div className="truncate text-[11px] text-brand-muted">Россия · умеренный риск</div>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-600">+24,6%</span>
        </div>
        <svg viewBox="0 -4 300 72" preserveAspectRatio="none" className="mt-2 h-16 w-full" aria-hidden>
          <defs>
            <linearGradient id="eco-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#397FC4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#397FC4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 21, 42, 64].map((gy) => (
            <line key={gy} x1="0" x2="300" y1={gy} y2={gy} stroke="#17263C" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${d} L300 64 L0 64 Z`} fill="url(#eco-area)" />
          <path d={d} fill="none" stroke="#397FC4" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-brand-muted/80">
          <span>ноя 25</span>
          <span>фев</span>
          <span>май</span>
          <span>авг</span>
          <span>окт 26</span>
        </div>
      </div>
      {STRATS.map((s) => (
        <div key={s.name} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-sm">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-brand-ink">{s.name}</span>
          <Spark values={s.v} color="#397FC4" className="hidden h-6 w-16 min-[400px]:block" />
          <span className="w-12 shrink-0 text-right text-xs font-semibold text-emerald-600">+{s.y.toLocaleString("ru-RU")}%</span>
        </div>
      ))}
    </div>
  );
}

function UniversityMock() {
  const R = 22;
  const C = 2 * Math.PI * R;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
        <span className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="28" cy="28" r={R} fill="none" stroke="#EEF3F9" strokeWidth="6" />
            <circle cx="28" cy="28" r={R} fill="none" stroke="#397FC4" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${C * 0.67} ${C}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-brand-ink">67%</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-brand-ink">Основы инвестирования</span>
          <span className="mt-0.5 block text-[11px] text-brand-muted">8 из 12 уроков · 3 ч 20 мин</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: "24", k: "курса" },
          { v: "15", k: "авторов" },
          { v: "4,9", k: "рейтинг", star: true },
        ].map((x) => (
          <div key={x.k} className="rounded-xl bg-white px-2 py-2 text-center shadow-sm">
            <div className="inline-flex items-center gap-1 font-display text-base font-semibold text-brand-ink">
              {x.v}
              {x.star && <Icon name="Star" size={12} className="fill-amber-400 text-amber-400" />}
            </div>
            <div className="text-[10px] text-brand-muted">{x.k}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-sm">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white">
          <Icon name="Play" size={10} className="translate-x-px" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-brand-ink">Диверсификация портфеля</span>
        <span className="shrink-0 text-[11px] text-brand-muted">18 мин</span>
      </div>
    </div>
  );
}

function CommunityMock() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm">
        <span className="flex -space-x-2">
          {[1, 2, 3, 4].map((n) => (
            <img key={n} src={`/landing/member-${n}.jpg`} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
          ))}
        </span>
        <span className="text-right">
          <span className="block font-display text-sm font-semibold text-brand-ink">1 240</span>
          <span className="block text-[10px] text-brand-muted">участников</span>
        </span>
      </div>
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/landing/founder.jpg" alt="" width={24} height={24} loading="lazy" className="h-6 w-6 rounded-full object-cover" />
          <span className="text-[12px] font-semibold text-brand-ink">Идея недели</span>
          <span className="ml-auto rounded-md bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-blue">Акции РФ</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-[12px] leading-snug text-brand-muted">Дивидендные истории на горизонте 12 месяцев</span>
          <span className="shrink-0 text-right">
            <span className="block text-[10px] text-brand-muted">потенциал</span>
            <span className="block text-sm font-semibold text-emerald-600">+18%</span>
          </span>
        </div>
        <div className="mt-2 flex gap-3 border-t border-brand-ink/[0.06] pt-2 text-[11px] text-brand-muted">
          <span className="inline-flex items-center gap-1"><Icon name="Heart" size={12} /> 86</span>
          <span className="inline-flex items-center gap-1"><Icon name="MessageCircle" size={12} /> 32</span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] shadow-sm">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
        <span className="min-w-0 flex-1 truncate font-medium text-brand-ink">Эфир: разбор портфелей</span>
        <span className="shrink-0 text-brand-muted">чт, 19:00</span>
      </div>
    </div>
  );
}

export default function EcosystemShowcase() {
  return (
    <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 md:mt-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
      <Panel
        icon="LineChart"
        title="Стратегии"
        text="Подходы к инвестированию под ваши цели."
        action={
          <Link to="/strategies" className={linkCls}>
            Смотреть стратегии {arrow}
          </Link>
        }
      >
        <StrategiesMock />
      </Panel>
      <Panel
        icon="GraduationCap"
        title="Университет"
        text="Знания от инвесторов и экспертов."
        action={
          <Link to="/university" className={linkCls}>
            Перейти к обучению {arrow}
          </Link>
        }
      >
        <UniversityMock />
      </Panel>
      <Panel
        icon="Users"
        title="Сообщество"
        text="Единомышленники и инвестиционные идеи."
        action={
          <ClubLink className={linkCls}>
            Подробнее {arrow}
          </ClubLink>
        }
      >
        <CommunityMock />
      </Panel>
    </div>
  );
}
