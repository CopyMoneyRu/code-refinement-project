import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N = 240;
const START = 3.25;
const END = 4.87025;
const DIPS = [
  { from: 62, to: 84, depth: 0.09 },
  { from: 150, to: 166, depth: 0.065 },
  { from: 205, to: 213, depth: 0.03 },
];

const CAPITAL = (() => {
  const r = rng(7);
  const raw: number[] = [0];
  for (let i = 1; i < N; i++) {
    let step = (r() - 0.5) * 0.022 + (r() < 0.04 ? (r() - 0.5) * 0.04 : 0);
    for (const d of DIPS) {
      const len = d.to - d.from;
      if (i > d.from && i <= d.to) step -= d.depth / len;
      if (i > d.to && i <= d.to + len * 1.4) step += (d.depth * 0.6) / (len * 1.4);
    }
    raw.push(raw[i - 1] + step);
  }
  const target = Math.log(END / START);
  const drift = (target - raw[N - 1]) / (N - 1);
  return raw.map((v, i) => START * Math.exp(v + drift * i));
})();

const INVESTED = CAPITAL.map((_, i) => START + Math.floor(i / 10) * 0.035);

const W = 400;
const H = 170;
const MIN = 3;
const MAX = 5.2;
const TICKS = [3, 3.5, 4, 4.5, 5];
const x = (i: number) => (i / (N - 1)) * W;
const y = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;
const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
const stepLine = (arr: number[]) =>
  arr.map((v, i) => (i ? `L${x(i).toFixed(1)} ${y(arr[i - 1]).toFixed(1)} L${x(i).toFixed(1)} ${y(v).toFixed(1)}` : `M0 ${y(v).toFixed(1)}`)).join(" ");

const MARK = 196;
const markValue = `${Math.round(CAPITAL[MARK] * 1e6).toLocaleString("ru-RU")} ₽`;

const MODULES = [
  { icon: "LineChart", label: "Стратегии", value: "+21,3%", tone: "text-emerald-600" },
  { icon: "GraduationCap", label: "Обучение", value: "8 / 12", tone: "text-brand-ink" },
  { icon: "Users", label: "Сообщество", value: "1 240", tone: "text-brand-ink" },
];

export function HeroArt({ className }: { className?: string }) {
  const capPath = line(CAPITAL);
  const mx = (x(MARK) / W) * 100;
  const my = (y(CAPITAL[MARK]) / H) * 100;
  return (
    <div className={cn("flex flex-col overflow-hidden border border-brand-ink/[0.06] bg-white p-5 sm:p-7", className)} role="img" aria-label="Пример роста капитала в экосистеме JETRA">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-brand-muted sm:text-sm">Мой капитал</div>
          <div className="mt-1 font-display text-[26px] font-semibold leading-none tracking-tight text-brand-ink sm:text-[34px]">4 870 250 ₽</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 sm:text-sm">
              <Icon name="ArrowUpRight" size={14} /> +49,8%
            </span>
            <span className="text-xs text-brand-muted">за 2 года</span>
          </div>
        </div>
        <span className="inline-flex shrink-0 rounded-lg bg-brand-light p-0.5 text-[11px] sm:text-xs">
          {["1Г", "2Г", "Всё"].map((t) => (
            <span key={t} className={cn("rounded-md px-2 py-1 font-medium", t === "2Г" ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted")}>
              {t}
            </span>
          ))}
        </span>
      </div>

      <div className="relative mt-4 min-h-0 flex-1 pr-9">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 text-right text-[9px] text-brand-muted/80 sm:text-[10px]">
          {TICKS.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(y(t) / H) * 100}%` }}>
              {t.toLocaleString("ru-RU")}M
            </span>
          ))}
        </div>
        <div className="relative h-full">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#397FC4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#397FC4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {TICKS.map((t) => (
            <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} stroke="#17263C" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
          ))}
          {DIPS.slice(0, 2).map((d) => (
            <rect key={d.from} x={x(d.from)} y="0" width={x(d.to) - x(d.from)} height={H} fill="#F43F5E" fillOpacity="0.05" />
          ))}
          <path d={`${capPath} L${W} ${H} L0 ${H} Z`} fill="url(#hero-area)" />
          <path d={stepLine(INVESTED)} fill="none" stroke="#17263C" strokeOpacity="0.45" strokeWidth="1.25" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path d={capPath} fill="none" stroke="#397FC4" strokeWidth="1.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(MARK)} x2={x(MARK)} y1={y(CAPITAL[MARK])} y2={H} stroke="#397FC4" strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-blue shadow" style={{ left: `${mx}%`, top: `${my}%` }} />
        <div className="absolute -translate-x-1/2 rounded-xl bg-brand-ink px-3 py-2 text-white shadow-lg" style={{ left: `${mx}%`, top: `calc(${my}% - 64px)` }}>
          <div className="whitespace-nowrap text-[10px] text-white/60">14 июня 2026</div>
          <div className="whitespace-nowrap font-display text-sm font-semibold">{markValue}</div>
        </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between pr-9 text-[10px] text-brand-muted/80 sm:text-[11px]">
        {["ноя 24", "фев", "май", "авг", "ноя 25", "фев", "май", "авг", "окт 26"].map((m, i) => (
          <span key={i} className={i % 2 ? "hidden sm:inline" : undefined}>{m}</span>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-brand-muted sm:text-[11px]">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-brand-blue" />Капитал</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-px w-3 border-t border-dashed border-brand-ink/50" />Вложения</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-rose-500/15" />Просадки</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-brand-ink/[0.06] pt-4">
        {MODULES.map((m) => (
          <div key={m.label} className="min-w-0 rounded-xl bg-brand-light px-2.5 py-2.5">
            <div className="flex items-center gap-1.5 text-brand-blue">
              <Icon name={m.icon} size={14} className="hidden shrink-0 min-[400px]:block" />
              <span className="truncate text-[10px] font-medium text-brand-muted sm:text-[11px]">{m.label}</span>
            </div>
            <div className={cn("mt-1 font-display text-sm font-semibold sm:text-base", m.tone)}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
