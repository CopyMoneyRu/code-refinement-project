import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import ContentEditor from "@/components/strategies/admin/ContentEditor";
import StrategySettingsForm from "@/components/strategies/admin/StrategySettingsForm";
import StrategyHistory from "@/components/strategies/admin/StrategyHistory";
import { Notice } from "@/components/strategies/admin/fields";
import { requirePermission } from "@/lib/adminGuard";
import { cn } from "@/lib/utils";
import { adminStrategyFn, removeStrategyFn, setStrategyStatusFn, STATUS_META, type AdminStrategy, type StrategyStatus } from "@/lib/strategies";

export const Route = createFileRoute("/admin/strategies/$id")({
  beforeLoad: ({ context }) => requirePermission(context, "strategies"),
  loader: async ({ params }) => {
    const r = await adminStrategyFn({ data: { id: Number(params.id) || 0 } });
    if (!r.ok) {
      if (r.error === "not_found") throw notFound();
      return { denied: r.message } as const;
    }
    return r;
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData && "strategy" in loaderData ? loaderData.strategy.title : "Стратегия"} — администрирование` }] }),
  component: StrategyEdit,
});

type Tab = "content" | "settings" | "history";

function StrategyEdit() {
  const data = Route.useLoaderData();
  if ("denied" in data) {
    return (
      <WsCard className="mx-auto max-w-lg text-center">
        <Icon name="Lock" size={28} className="mx-auto text-brand-blue" />
        <p className="mt-4">{data.denied}</p>
        <Link to="/admin/strategies" className="mt-5 inline-block text-sm font-medium text-brand-blue hover:underline">К списку стратегий</Link>
      </WsCard>
    );
  }
  return <Editor data={data} />;
}

function Editor({ data }: { data: Exclude<ReturnType<typeof Route.useLoaderData>, { denied: string }> }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [s, setS] = useState<AdminStrategy>(data.strategy);
  const [tab, setTab] = useState<Tab>("content");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<StrategyStatus | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const changeStatus = async (status: StrategyStatus) => {
    setBusy(true);
    setError("");
    setNotice("");
    const r = await setStrategyStatusFn({ data: { id: s.id, status } });
    setBusy(false);
    setConfirmStatus(null);
    if (!r.ok) return setError(r.message);
    setS(r.strategy);
    setNotice(`Статус изменён: ${STATUS_META[status].label}`);
    router.invalidate();
  };

  const remove = async () => {
    setBusy(true);
    const r = await removeStrategyFn({ data: { id: s.id } });
    setBusy(false);
    setConfirmRemove(false);
    if (!r.ok) return setError(r.message);
    navigate({ to: "/admin/strategies" });
  };

  const openPreview = () => window.open(`/preview/strategy/${s.id}`, "_blank", "noopener");

  const STATUS_ACTIONS: { to: StrategyStatus; label: string; icon: string }[] = (
    [
      { to: "active", label: "Активировать", icon: "Play" },
      { to: "paused", label: "Приостановить", icon: "Pause" },
      { to: "draft", label: "В черновик", icon: "EyeOff" },
      { to: "archived", label: "В архив", icon: "Archive" },
    ] as const
  ).filter((a) => a.to !== s.status);

  return (
    <>
      <Link to="/admin/strategies" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
        <Icon name="ArrowLeft" size={16} /> Все стратегии
      </Link>
      <div className="mb-6 mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[26px] font-bold leading-tight md:text-[30px]">{s.title}</h1>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_META[s.status].cls)}>{STATUS_META[s.status].label}</span>
          </div>
          <p className="mt-1 text-sm text-brand-muted">
            {s.kind === "copytrading" ? "Копитрейдинг криптовалют" : "Информационная стратегия"} · {STATUS_META[s.status].text}
          </p>
        </div>
        {data.canPublish && (
          <div className="flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((a) => (
              <button
                key={a.to}
                disabled={busy}
                onClick={() => (a.to === "active" ? changeStatus(a.to) : setConfirmStatus(a.to))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50",
                  a.to === "active" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-brand-ink/15 bg-white hover:bg-brand-surface",
                )}
              >
                <Icon name={a.icon} size={15} /> {a.label}
              </button>
            ))}
            {s.status !== "active" && s.status !== "paused" && (
              <button disabled={busy} onClick={() => setConfirmRemove(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50" title="Удалить" aria-label="Удалить стратегию">
                <Icon name="Trash2" size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="ok">{notice}</Notice>}

      <div className="mb-5 flex gap-1 border-b border-brand-ink/10">
        {(
          [
            ["content", "Страница", "LayoutTemplate"],
            ["settings", "Настройки и карточка", "SlidersHorizontal"],
            ["history", "История изменений", "History"],
          ] as const
        ).map(([id, l, ic]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === id ? "border-brand-blue text-brand-ink" : "border-transparent text-brand-muted hover:text-brand-ink")}
          >
            <Icon name={ic} size={15} /> {l}
          </button>
        ))}
      </div>

      <div className={tab === "content" ? "" : "hidden"}>
        <ContentEditor strategyId={s.id} initial={data.blocks} hasUnpublished={data.hasUnpublished} canPublish={data.canPublish} onPreview={openPreview} />
      </div>
      <div className={tab === "settings" ? "" : "hidden"}>
        <StrategySettingsForm strategy={s} categories={data.categories} labels={data.labels} onSaved={(x) => { setS(x); router.invalidate(); }} />
      </div>
      {tab === "history" && <StrategyHistory items={data.history} />}

      <ConfirmDelete
        open={!!confirmStatus}
        title={confirmStatus ? `Сменить статус на «${STATUS_META[confirmStatus].label}»?` : ""}
        busy={busy}
        confirmLabel="Подтвердить"
        onCancel={() => setConfirmStatus(null)}
        onConfirm={() => confirmStatus && changeStatus(confirmStatus)}
      >
        {confirmStatus && <p>{STATUS_META[confirmStatus].text}.</p>}
        {confirmStatus === "archived" && <p>Архивация недоступна, пока у стратегии есть открытые позиции, активные ордера или незавершённые закрытия.</p>}
      </ConfirmDelete>
      <ConfirmDelete open={confirmRemove} title="Удалить стратегию?" busy={busy} confirmLabel="Удалить" onCancel={() => setConfirmRemove(false)} onConfirm={remove}>
        <p>Стратегия исчезнет из списков, но вся история сохранится. Восстановить её можно во вкладке «Удалённые».</p>
      </ConfirmDelete>
    </>
  );
}
