import Icon from "@/components/ui/icon";

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

function Donut() {
  let offset = 0;
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
      <circle cx="100" cy="100" r={R} fill="none" stroke="#EEF3F9" strokeWidth="26" />
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
            strokeWidth="26"
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

const SPARK = "M0 46 C 20 44, 30 38, 48 40 S 78 30, 96 32 S 128 20, 148 22 S 180 8, 200 6";

export default function PortfolioShowcase() {
  return (
    <div className="relative mx-auto mt-12 max-w-5xl">
      <div aria-hidden className="absolute -inset-x-6 -inset-y-8 rounded-[48px] bg-gradient-to-br from-brand-blue/10 via-transparent to-[#8EC3F0]/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-brand-ink/[0.06] bg-white shadow-[0_30px_80px_-40px_rgba(23,38,60,0.4)]">
        <div className="flex items-center justify-between gap-3 border-b border-brand-ink/[0.06] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Icon name="Briefcase" size={18} />
            </span>
            <span className="whitespace-nowrap font-display text-[15px] font-semibold text-brand-ink sm:text-base">Единый портфель</span>
          </div>
          <span className="whitespace-nowrap rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-muted">Пример<span className="hidden sm:inline"> распределения</span></span>
        </div>

        <div className="grid items-center gap-8 p-5 sm:p-7 md:grid-cols-[260px_1fr] md:gap-10 lg:p-9">
          <div className="relative mx-auto aspect-square w-[220px] md:w-full">
            <Donut />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-brand-muted">Направлений</span>
              <span className="font-display text-4xl font-semibold text-brand-ink">6</span>
              <svg viewBox="0 0 200 50" className="mt-1 h-6 w-20" aria-hidden>
                <path d={SPARK} fill="none" stroke="#397FC4" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {ITEMS.map((it) => (
              <li key={it.title} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-brand-light">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: it.color, color: it.share <= 12 ? "#17263C" : "#fff" }}>
                  <Icon name={it.icon} fallback="Circle" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium text-brand-ink">{it.title}</span>
                    <span className="font-display text-sm font-semibold text-brand-ink">{it.share}%</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-brand-light">
                    <span className="block h-full rounded-full" style={{ width: `${it.share * 4}%`, background: it.color }} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
