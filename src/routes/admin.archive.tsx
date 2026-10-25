import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { archiveActionFn, archiveListFn, type ArchiveItem, type ArchiveKind } from "@/lib/courses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/archive")({
  beforeLoad: ({ context }) => requirePermission(context, "any"),
  loader: () => archiveListFn(),
  component: ArchivePage,
});

const KINDS: Record<ArchiveKind, { label: string; icon: string }> = {
  course: { label: "Обучение", icon: "GraduationCap" },
  author: { label: "Автор", icon: "UserRound" },
  category: { label: "Категория", icon: "Tag" },
  user: { label: "Пользователь", icon: "User" },
};

const fmt = (d: string) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function ArchivePage() {
  const items = Route.useLoaderData();
  const router = useRouter();
  const [filter, setFilter] = useState<ArchiveKind | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [toPurge, setToPurge] = useState<ArchiveItem | null>(null);

  const kinds = useMemo(() => (Object.keys(KINDS) as ArchiveKind[]).filter((k) => items.some((i) => i.kind === k)), [items]);
  const list = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const act = async (item: ArchiveItem, purge: boolean) => {
    setBusy(`${item.kind}-${item.id}`);
    setError("");
    setNotice("");
    const r = await archiveActionFn({ data: { kind: item.kind, id: item.id, purge } });
    setBusy(null);
    setToPurge(null);
    if (!r.ok) return setError(r.message);
    setNotice(purge ? `«${item.title}» удалено навсегда` : `«${item.title}» восстановлено`);
    router.invalidate();
  };

  return (
    <>
      <WsTitle title="Архив" text="Здесь хранится всё, что удалили на сайте. Запись можно восстановить или удалить навсегда." />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <WsCard className="p-0">
        {kinds.length > 1 && (
          <div className="flex flex-wrap gap-2 border-b border-brand-ink/[0.08] p-4">
            {(["all", ...kinds] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm transition-colors",
                  filter === k ? "bg-brand-blue text-white" : "bg-brand-light text-brand-muted hover:text-brand-ink",
                )}
              >
                {k === "all" ? "Все" : KINDS[k].label}
              </button>
            ))}
          </div>
        )}
        {list.length ? (
          <ul className="divide-y divide-brand-ink/[0.06]">
            {list.map((item) => {
              const key = `${item.kind}-${item.id}`;
              return (
                <li key={key} className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                      <Icon name={KINDS[item.kind].icon} size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-xs text-brand-muted">
                        {KINDS[item.kind].label} · в архиве с {fmt(item.archivedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={busy === key}
                      onClick={() => act(item, false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface disabled:opacity-50"
                    >
                      <Icon name="RotateCcw" size={14} /> Восстановить
                    </button>
                    <button
                      disabled={busy === key}
                      onClick={() => setToPurge(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Icon name="Trash2" size={14} /> Удалить навсегда
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon="Archive" title="Архив пуст" text="Удалённые обучения, авторы, категории и пользователи появятся здесь." />
        )}
      </WsCard>

      <ConfirmDelete
        open={!!toPurge}
        title="Удалить навсегда?"
        busy={busy !== null}
        confirmLabel="Удалить навсегда"
        onCancel={() => setToPurge(null)}
        onConfirm={() => toPurge && act(toPurge, true)}
      >
        <p>
          <span className="font-medium text-brand-ink">«{toPurge?.title}»</span> будет удалено без возможности восстановления.
        </p>
        {toPurge?.kind === "course" && <p>Вместе с обучением удалятся программа, уроки, прогресс учеников и выданные доступы.</p>}
        {toPurge?.kind === "user" && <p>Вместе с аккаунтом удалятся прогресс и доступы пользователя.</p>}
      </ConfirmDelete>
    </>
  );
}
