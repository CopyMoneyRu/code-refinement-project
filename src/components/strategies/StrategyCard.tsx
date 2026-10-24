import Icon from "@/components/ui/icon";
import type { Strategy } from "@/data/catalog";

export default function StrategyCard({ s, index }: { s: Strategy; index: number }) {
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-white/[0.06] bg-brand-card p-6 transition-colors hover:border-brand-blue/40 sm:p-7">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] text-brand-blue">
          <Icon name={s.icon} size={22} fallback="LineChart" />
        </div>
        <span className="font-display text-sm tabular-nums text-brand-snow/30">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold text-brand-snow">{s.name}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-brand-snow/60">{s.description}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-5 text-sm">
        <div>
          <dt className="text-brand-snow/40">Фокус</dt>
          <dd className="mt-1 text-brand-snow/85">{s.focus}</dd>
        </div>
        <div>
          <dt className="text-brand-snow/40">Горизонт</dt>
          <dd className="mt-1 text-brand-snow/85">{s.horizon}</dd>
        </div>
      </dl>
      <div className="mt-auto pt-6">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-4 py-3 text-sm text-brand-snow/70">
          <Icon name="Lock" size={16} className="text-brand-blue" />
          Скоро будет доступна
        </div>
      </div>
    </article>
  );
}
