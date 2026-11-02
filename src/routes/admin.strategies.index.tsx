import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import RiskMeter from "@/components/strategies/RiskMeter";
import LabelsManager from "@/components/strategies/admin/LabelsManager";
import { btnPrimary, Notice } from "@/components/strategies/admin/fields";
import { requirePermission } from "@/lib/adminGuard";
import { cn } from "@/lib/utils";
import {
  adminStrategiesFn,
  LABEL_COLORS,
  restoreStrategyFn,
  saveStrategyFn,
  STATUS_META,
  yieldText,
  type AdminStrategy,
  type StrategyStatus,
} from "@/lib/strategies";

export const Route = createFileRoute("/admin/strategies/")({
  beforeLoad: ({ context }) => requirePermission(context, "strategies"),
  loader: () => adminStrategiesFn(),
  component: StrategiesAdmin,
});

type Tab = StrategyStatus | "labels" | "removed";

function StrategiesAdmin() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(data.ok ? "" : data.message);
  const [notice, setNotice] = useState("");
  const [toRestore, setToRestore] = useState<AdminStrategy | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { draft: 0, active: 0, paused: 0, archived: 0 };
    for (const s of data.strategies) c[s.status]++;
    return c;
  }, [data.strategies]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = tab === "removed" ? data.removed : data.strategies.filter((x) => x.status === tab);
    return s ? pool.filter((x) => x.title.toLowerCase().includes(s)) : pool;
  }, [data, tab, q]);

  const create = async () => {
    setBusy(true);
    setError("");
    const r = await saveStrategyFn({
      data: {
        title: "Новая стратегия",
        short: "",
        kind: "generic",
        categoryId: null,
        coverUrl: "",
        risk: { level: 3, style: "stars" },
        yield: { mode: "none", basis: "forecast", from: "", to: "", period: "в год" },
        priceLabel: "",
        exchanges: [],
        metrics: [],
        cardOptions: { showRisk: true, showYield: true, showPrice: true, showExchanges: true },
        labelIds: [],
        accessNote: "",
        settings: {},
        sort: 0,
      },
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    navigate({ to: "/admin/strategies/$id", params: { id: String(r.strategy.id) } });
  };

  const restore = async () => {
    if (!toRestore) return;
    setBusy(true);
    const r = await restoreStrategyFn({ data: { id: toRestore.id } });
    setBusy(false);
    setToRestore(null);
    if (!r.ok) return setError(r.message);
    setNotice(`Стратегия «${r.title}» восстановлена и перенесена в черновики`);
    router.invalidate();
  };

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: "active", label: "Активные", icon: "Globe", count: counts.active },
    { id: "paused", label: "Приостановлены", icon: "PauseCircle", count: counts.paused },
    { id: "draft", label: "Черновики", icon: "Hammer", count: counts.draft },
    { id: "archived", label: "Архив", icon: "Archive", count: counts.archived },
    { id: "labels", label: "Метки", icon: "Tags" },
    ...(data.removed.length ? [{ id: "removed" as Tab, label: "Удалённые", icon: "Trash2", count: data.removed.length }] : []),
  ];

  return (
    <>
      <WsTitle
        title="Стратегии"
        text="Каталог инвестиционных стратегий: карточки, страницы, статусы и метки."
        action={
          data.canCreate && (
            <button onClick={create} disabled={busy} className={btnPrimary}>
              <Icon name={busy ? "Loader2" : "Plus"} size={16} className={busy ? "animate-spin" : ""} /> Создать стратегию
            </button>
          )
        }
      />
      {notice && <Notice kind="ok">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-brand-ink/10 bg-white p-1 sm:inline-flex">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => {
              setTab(tb.id);
              setNotice("");
            }}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === tb.id ? "bg-brand-blue text-white" : "text-brand-muted hover:bg-brand-light hover:text-brand-ink",
            )}
          >
            <Icon name={tb.icon} size={15} /> {tb.label}
            {tb.count !== undefined && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", tab === tb.id ? "bg-white/20 text-white" : "bg-brand-surface text-brand-muted")}>{tb.count}</span>
            )}
          </button>
        ))}
      </div>
      {tab !== "labels" && tab !== "removed" && <p className="mb-4 text-sm text-brand-muted">{STATUS_META[tab].text}.</p>}

      {tab === "labels" ? (
        <LabelsManager labels={data.labels} />
      ) : (
        <WsCard className="p-0">
          <div className="border-b border-brand-ink/[0.08] p-4">
            <label className="relative block sm:max-w-xs">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию" className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none" />
            </label>
          </div>
          {list.length ? (
            <ul className="divide-y divide-brand-ink/[0.06]">
              {list.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-surface">
                      {s.coverUrl ? <img src={s.coverUrl} alt="" className="h-full w-full object-cover" /> : <Icon name={s.category?.icon ?? "LineChart"} size={18} fallback="LineChart" className="text-brand-muted" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{s.title}</span>
                        {s.kind === "copytrading" && <span className="rounded bg-brand-ink px-1.5 py-0.5 text-[11px] font-medium text-white">Копитрейдинг</span>}
                        {s.labels.map((l) => (
                          <span key={l.id} className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", LABEL_COLORS[l.color])}>{l.name}</span>
                        ))}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
                        <span>{s.category?.name ?? "Без категории"}</span>
                        <RiskMeter level={s.risk.level} style={s.risk.style} />
                        {yieldText(s.yield) && <span>{yieldText(s.yield)}</span>}
                        {s.removedAt && <span>удалена {new Date(s.removedAt).toLocaleDateString("ru-RU")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {tab === "removed" ? (
                      <button onClick={() => setToRestore(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface">
                        <Icon name="RotateCcw" size={14} /> Восстановить
                      </button>
                    ) : (
                      <>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_META[s.status].cls)}>{STATUS_META[s.status].label}</span>
                        {(s.status === "active" || s.status === "paused") && (
                          <Link to="/strategies/$slug" params={{ slug: s.slug }} target="_blank" title="Открыть на сайте" className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-ink/15 text-brand-muted hover:bg-brand-surface hover:text-brand-ink">
                            <Icon name="ExternalLink" size={15} />
                          </Link>
                        )}
                        <Link to="/admin/strategies/$id" params={{ id: String(s.id) }} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface">
                          <Icon name="Pencil" size={14} /> Открыть
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="LineChart"
              title={q ? "Ничего не найдено" : "Здесь пока пусто"}
              text={q ? "Измените условия поиска." : tab === "draft" ? "Нажмите «Создать стратегию» — она появится здесь, пока вы её наполняете." : "Стратегии с этим статусом появятся здесь."}
            />
          )}
        </WsCard>
      )}

      <ConfirmDelete open={!!toRestore} title="Восстановить стратегию?" busy={busy} confirmLabel="Восстановить" onCancel={() => setToRestore(null)} onConfirm={restore}>
        <p>
          Стратегия <span className="font-medium text-brand-ink">«{toRestore?.title}»</span> вернётся в раздел «Черновики». На сайте она появится только после смены статуса на «Активна».
        </p>
      </ConfirmDelete>
    </>
  );
}
