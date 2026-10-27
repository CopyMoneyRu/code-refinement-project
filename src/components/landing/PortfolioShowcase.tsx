import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const ITEMS = [
  { title: "Российский рынок", icon: "Building2", share: 25, yield: 14.2, color: "#17263C" },
  { title: "Рынок США", icon: "Globe2", share: 20, yield: 21.6, color: "#2D4A72" },
  { title: "Акции", icon: "TrendingUp", share: 18, yield: 17.9, color: "#397FC4" },
  { title: "Облигации", icon: "Landmark", share: 15, yield: 11.3, color: "#5C9BD8" },
  { title: "Недвижимость", icon: "Building", share: 12, yield: 9.8, color: "#8EC3F0" },
  { title: "Криптовалюты", icon: "Coins", share: 10, yield: -4.2, color: "#C3DDF5" },
];

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 3;

function Donut() {
  let offset = 0;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
      <circle cx="100" cy="100" r={R} fill="none" stroke="#EEF3F9" strokeWidth="24" />
      {ITEMS.map((it) => {
        const len = (it.share / 100) * C;
        const el = (
          <circle
            key={it.title}
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={it.color}
            strokeWidth="24"
            strokeDasharray={`${Math.max(len - GAP, 0)} ${C}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

const SERIES = [100, 103, 101, 106, 109, 107, 112, 111, 115, 113, 117, 116, 118.4];
const MONTHS = ["ноя", "янв", "мар", "май", "июл", "сен"];

function GrowthChart() {
  const w = 600;
  const h = 150;
  const min = 98;
  const max = 120;
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - ((v - min) / (max - min)) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 -8 ${w} ${h + 16}`} preserveAspectRatio="none" className="h-[120px] w-full sm:h-[140px]" aria-hidden>
        <defs>
          <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#397FC4" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#397FC4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1="0" x2={w} y1={h * k} y2={h * k} stroke="#17263C" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#pf-area)" />
        <path d={line} fill="none" stroke="#397FC4" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-brand-muted/80">
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("ru-RU", { minimumFractionDigits: 1 })}%`;

export default function PortfolioShowcase() {
  return (
    <div className="relative mx-auto mt-12 max-w-5xl">
      <div aria-hidden className="absolute -inset-x-6 -inset-y-8 rounded-[48px] bg-gradient-to-br from-brand-blue/10 via-transparent to-[#8EC3F0]/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-brand-ink/[0.06] bg-white shadow-[0_30px_80px_-40px_rgba(23,38,60,0.4)]">
        <div className="flex items-center justify-between gap-3 border-b border-brand-ink/[0.06] px-4 py-3 sm:px-7 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/brand/jetra-mark.png" alt="" className="h-7 w-auto" />
            <span className="hidden h-5 w-px bg-brand-ink/10 sm:block" />
            <span className="hidden truncate text-sm font-medium text-brand-muted sm:block">Личный кабинет</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="relative hidden h-9 w-9 items-center justify-center rounded-full text-brand-muted sm:flex">
              <Icon name="Bell" size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-blue ring-2 ring-white" />
            </span>
            <span className="flex items-center gap-2.5 rounded-full border border-brand-ink/10 py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white">
                <Icon name="User" size={16} />
              </span>
              <span className="text-sm font-medium text-brand-ink">Алексей</span>
            </span>
          </div>
        </div>

        <div className="grid gap-6 border-b border-brand-ink/[0.06] p-5 sm:p-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10 lg:px-9">
          <div className="flex flex-col justify-center">
            <span className="text-sm text-brand-muted">Стоимость портфеля</span>
            <span className="mt-1 font-display text-[34px] font-semibold leading-tight tracking-tight text-brand-ink sm:text-[40px]">2 485 300 ₽</span>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-600">
                <Icon name="ArrowUpRight" size={15} /> +18,4%
              </span>
              <span className="text-sm text-brand-muted">+386 200 ₽ за год</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-brand-light px-4 py-3">
                <div className="text-xs text-brand-muted">Доход за месяц</div>
                <div className="mt-0.5 font-display text-base font-semibold text-emerald-600">+31 870 ₽</div>
              </div>
              <div className="rounded-xl bg-brand-light px-4 py-3">
                <div className="text-xs text-brand-muted">Вложено</div>
                <div className="mt-0.5 font-display text-base font-semibold text-brand-ink">2 099 100 ₽</div>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-brand-ink">Динамика</span>
              <span className="inline-flex rounded-lg bg-brand-light p-0.5 text-xs">
                {["1М", "6М", "1Г", "Всё"].map((t) => (
                  <span key={t} className={cn("rounded-md px-2.5 py-1 font-medium", t === "1Г" ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted")}>
                    {t}
                  </span>
                ))}
              </span>
            </div>
            <GrowthChart />
          </div>
        </div>

        <div className="p-5 sm:p-7 lg:px-9">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium text-brand-ink">Состав портфеля</span>
            <span className="text-xs text-brand-muted">Доля · Доходность</span>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-[200px_1fr] md:gap-10">
            <div className="relative mx-auto aspect-square w-[180px] md:w-full">
              <Donut />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-brand-muted">Направлений</span>
                <span className="font-display text-3xl font-semibold text-brand-ink">6</span>
              </div>
            </div>

            <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {ITEMS.map((it) => (
                <li key={it.title} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-brand-light">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: it.color, color: it.share <= 12 ? "#17263C" : "#fff" }}>
                    <Icon name={it.icon} fallback="Circle" size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-medium text-brand-ink">{it.title}</span>
                      <span className="shrink-0 font-display text-sm font-semibold text-brand-ink">{it.share}%</span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-brand-light">
                        <span className="block h-full rounded-full" style={{ width: `${it.share * 4}%`, background: it.color }} />
                      </span>
                      <span className={cn("w-12 shrink-0 text-right text-xs font-semibold", it.yield >= 0 ? "text-emerald-600" : "text-rose-500")}>{pct(it.yield)}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="relative mt-4 text-center text-xs text-brand-muted/80">Демонстрационный пример интерфейса. Цифры условные и не являются прогнозом доходности.</p>
    </div>
  );
}
