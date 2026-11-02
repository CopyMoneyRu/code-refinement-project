import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { fmtDate, myStrategiesFn, setAutoRenewFn, SOURCE_LABEL, type MyStrategy } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/strategies")({
  loader: () => myStrategiesFn(),
  component: MyStrategies,
});

const daysLeft = (d: string | null) => (d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) : 0);

function Item({ s }: { s: MyStrategy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const a = s.access;
  const left = daysLeft(a.endsAt);

  const toggleAuto = async () => {
    setBusy(true);
    setError("");
    const r = await setAutoRenewFn({ data: { strategyId: s.id, enabled: !a.autoRenew } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.invalidate();
  };

  return (
    <WsCard className="p-0">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#1F4372] to-[#0E1A2B]">
          {s.coverUrl && <img src={s.coverUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-semibold">{s.title}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", a.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
              {a.active ? "Доступ активен" : "Доступ закончился"}
            </span>
          </div>
          <div className="mt-1 text-sm text-brand-muted">
            {a.active ? (
              <>
                {SOURCE_LABEL[a.source ?? ""]}{a.tariffName && ` · ${a.tariffName}`} · до {fmtDate(a.endsAt)}
                <span className={cn("ml-2 font-medium", left <= 3 ? "text-amber-700" : "text-brand-ink")}>
                  {left > 0 ? `осталось ${left} дн.` : "заканчивается сегодня"}
                </span>
              </>
            ) : (
              <>Закончился {fmtDate(a.lastEndedAt)}. Новые сделки не копируются; уже открытые позиции сопровождаются до закрытия.</>
            )}
          </div>
          {a.queued.length > 0 && <div className="mt-1 text-xs text-brand-blue">Оплачено продление с {fmtDate(a.queued[0].startsAt)}</div>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {s.status === "active" || s.status === "paused" ? (
            <Link to="/strategies/$slug" params={{ slug: s.slug }} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]">
              {a.active ? "Продлить" : "Возобновить"}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-brand-ink/[0.07] px-5 py-3 text-sm">
        {a.autoRenewAvailable ? (
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" disabled={busy} className="h-4 w-4 accent-[#397FC4]" checked={a.autoRenew} onChange={toggleAuto} />
            Автопродление {a.autoRenew ? "включено" : "выключено"}
          </label>
        ) : (
          <span className="text-brand-muted">Автопродление не подключено</span>
        )}
        <span className="inline-flex items-center gap-1.5 text-brand-muted">
          <Icon name="Plug" size={14} /> {s.kind === "copytrading" ? "Подключение биржи появится на следующем этапе" : "Дополнительное подключение не требуется"}
        </span>
        {error && <span className="text-red-600">{error}</span>}
      </div>
      {s.periods.length > 1 && (
        <details className="border-t border-brand-ink/[0.07] px-5 py-3 text-sm">
          <summary className="cursor-pointer text-brand-muted">История периодов доступа ({s.periods.length})</summary>
          <ul className="mt-2 space-y-1">
            {s.periods.map((p, i) => (
              <li key={i} className={cn("flex flex-wrap gap-x-3", p.revoked && "text-brand-muted line-through")}>
                <span>{fmtDate(p.startsAt)} — {fmtDate(p.endsAt)}</span>
                <span className="text-brand-muted">{SOURCE_LABEL[p.source]}{p.tariff && ` · ${p.tariff}`}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </WsCard>
  );
}

function MyStrategies() {
  const r = Route.useLoaderData();
  const list = r.ok ? r.strategies : [];
  return (
    <>
      <WsTitle
        title="Мои стратегии"
        text="Подключённые стратегии, сроки доступа и продление."
        action={
          <Link to="/strategies" className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-brand-surface">
            <Icon name="LineChart" size={16} /> Каталог стратегий
          </Link>
        }
      />
      {!r.ok && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{r.message}</div>}
      {list.length ? (
        <div className="space-y-4">{list.map((s) => <Item key={s.id} s={s} />)}</div>
      ) : (
        <WsCard>
          <EmptyState icon="LineChart" title="Стратегий пока нет" text="Выберите стратегию в каталоге и оформите подходящий тариф — она появится здесь." />
        </WsCard>
      )}
    </>
  );
}
