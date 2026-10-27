import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import type { Strategy } from "@/data/catalog";

const rootApi = getRouteApi("__root__");

export default function StrategyCard({ s, index }: { s: Strategy; index: number }) {
  const user = rootApi.useLoaderData();
  const href = useRouterState({ select: (st) => st.location.href });
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-brand-ink/10 bg-white p-6 transition-colors hover:border-brand-blue/40 sm:p-7">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
          <Icon name={s.icon} size={22} fallback="LineChart" />
        </div>
        <span className="font-display text-sm tabular-nums text-brand-ink/50">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold text-brand-ink">
        {user ? (
          s.name
        ) : (
          <Link to="/login" search={{ redirect: href }} className="after:absolute after:inset-0 after:content-['']">
            {s.name}
          </Link>
        )}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{s.description}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-brand-ink/10 pt-5 text-sm">
        <div>
          <dt className="text-brand-ink/50">Фокус</dt>
          <dd className="mt-1 text-brand-ink/85">{s.focus}</dd>
        </div>
        <div>
          <dt className="text-brand-ink/50">Горизонт</dt>
          <dd className="mt-1 text-brand-ink/85">{s.horizon}</dd>
        </div>
      </dl>
      <div className="mt-auto pt-6">
        <div className="flex items-center gap-2.5 rounded-lg bg-brand-surface px-4 py-3 text-sm text-brand-muted">
          <Icon name="Lock" size={16} className="text-brand-blue" />
          Скоро будет доступна
        </div>
      </div>
    </article>
  );
}
