import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const ITEMS = [
  { title: "Российский рынок", icon: "Building2", share: 25, color: "#17263C" },
  { title: "Рынок США", icon: "Globe2", share: 20, color: "#2D4A72" },
  { title: "Акции", icon: "TrendingUp", share: 18, color: "#397FC4" },
  { title: "Облигации", icon: "Landmark", share: 15, color: "#5C9BD8" },
  { title: "Недвижимость", icon: "Building", share: 12, color: "#8EC3F0" },
  { title: "Криптовалюты", icon: "Coins", share: 10, color: "#C3DDF5" },
];

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 3;

function Donut({ shown }: { shown: boolean }) {
  let offset = 0;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
      <circle cx="100" cy="100" r={R} fill="none" stroke="#EEF3F9" strokeWidth="24" />
      {ITEMS.map((it, i) => {
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
            strokeDasharray={`${shown ? Math.max(len - GAP, 0) : 0} ${C}`}
            strokeDashoffset={-offset}
            className="motion-reduce:!transition-none"
            style={{ transition: `stroke-dasharray 700ms cubic-bezier(0.4,0,0.2,1) ${i * 140}ms` }}
          />
        );
        offset += len;
        return el;
      })}
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

const START = 2.099;
const END = 2.4853;
const N = 200;
const DIPS = [
  { from: 52, to: 70, depth: 0.06 },
  { from: 132, to: 146, depth: 0.045 },
];

const SERIES = (() => {
  const r = rng(23);
  const raw: number[] = [0];
  for (let i = 1; i < N; i++) {
    let step = (r() - 0.5) * 0.016 + (r() < 0.04 ? (r() - 0.5) * 0.028 : 0);
    for (const d of DIPS) {
      const len = d.to - d.from;
      if (i > d.from && i <= d.to) step -= d.depth / len;
      if (i > d.to && i <= d.to + len * 1.4) step += (d.depth * 0.6) / (len * 1.4);
    }
    raw.push(raw[i - 1] + step);
  }
  const drift = (Math.log(END / START) - raw[N - 1]) / (N - 1);
  return raw.map((v, i) => START * Math.exp(v + drift * i));
})();

const MIN = 1.95;
const MAX = 2.6;
const TICKS = [2, 2.2, 2.4, 2.6];
const MONTHS = ["ноя", "янв", "мар", "май", "июл", "сен"];

function GrowthChart({ shown }: { shown: boolean }) {
  const w = 600;
  const h = 150;
  const yy = (v: number) => h - ((v - MIN) / (MAX - MIN)) * h;
  const line = SERIES.map((v, i) => `${i ? "L" : "M"}${((i / (N - 1)) * w).toFixed(1)} ${yy(v).toFixed(1)}`).join(" ");
  return (
    <div>
      <div className="relative pr-9">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 text-right text-[10px] text-brand-muted/80">
          {TICKS.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(yy(t) / h) * 100}%` }}>
              {t.toLocaleString("ru-RU")}M
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="h-[120px] w-full overflow-visible transition-[clip-path] duration-[1400ms] ease-out motion-reduce:transition-none sm:h-[140px]"
          style={{ clipPath: shown ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
          aria-hidden
        >
          <defs>
            <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#397FC4" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#397FC4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {TICKS.map((t) => (
            <line key={t} x1="0" x2={w} y1={yy(t)} y2={yy(t)} stroke="#17263C" strokeOpacity="0.06" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#pf-area)" />
          <path d={line} fill="none" stroke="#397FC4" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={w} y1={yy(END)} y2={yy(END)} stroke="#397FC4" strokeOpacity="0.4" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between pr-9 text-[11px] text-brand-muted/80">
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto mt-12 max-w-5xl">
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
            <GrowthChart shown={shown} />
          </div>
        </div>

        <div className="p-5 sm:p-7 lg:px-9">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium text-brand-ink">Состав портфеля</span>
            <span className="text-xs text-brand-muted">Доля</span>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-[200px_1fr] md:gap-10">
            <div className="relative mx-auto aspect-square w-[180px] md:w-full">
              <Donut shown={shown} />
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
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}