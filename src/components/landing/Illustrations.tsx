import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const CAPITAL = [100, 101.5, 100.8, 103.2, 105.1, 104.3, 107.6, 110.2, 109.1, 112.8, 115.4, 114.2, 118.9, 122.3, 121.1, 125.8, 129.4, 128.2, 133.1, 137.6, 136.4, 141.9, 146.2, 149.8];
const INVESTED = CAPITAL.map((_, i) => 100 + i * 1.6);

const W = 400;
const H = 170;
const MIN = 96;
const MAX = 152;
const x = (i: number) => (i / (CAPITAL.length - 1)) * W;
const y = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;
const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

const MARK = 17;

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

      <div className="relative mt-4 min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#397FC4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#397FC4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.2, 0.45, 0.7, 0.95].map((k) => (
            <line key={k} x1="0" x2={W} y1={H * k} y2={H * k} stroke="#17263C" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${capPath} L${W} ${H} L0 ${H} Z`} fill="url(#hero-area)" />
          <path d={line(INVESTED)} fill="none" stroke="#17263C" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={capPath} fill="none" stroke="#397FC4" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(MARK)} x2={x(MARK)} y1={y(CAPITAL[MARK])} y2={H} stroke="#397FC4" strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-blue shadow" style={{ left: `${mx}%`, top: `${my}%` }} />
        <div className="absolute -translate-x-1/2 rounded-xl bg-brand-ink px-3 py-2 text-white shadow-lg" style={{ left: `${mx}%`, top: `calc(${my}% - 64px)` }}>
          <div className="whitespace-nowrap text-[10px] text-white/60">Июнь 2025</div>
          <div className="whitespace-nowrap font-display text-sm font-semibold">4 125 400 ₽</div>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-brand-muted/80 sm:text-[11px]">
        {["2024", "июл", "2025", "июл", "сейчас"].map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-brand-muted sm:text-[11px]">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-brand-blue" />Капитал</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-px w-3 border-t border-dashed border-brand-ink/50" />Вложения</span>
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
