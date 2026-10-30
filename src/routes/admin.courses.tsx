import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import CourseForm from "@/components/workspace/CourseForm";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import PublishToggle from "@/components/workspace/PublishToggle";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { cn } from "@/lib/utils";
import { adminCoursesFn, archiveActionFn, archiveListFn, deleteCourseFn, formatPrice, lessonsTotal, setCoursePublishedFn, type ArchiveItem, type CourseCategory, type DbCourse } from "@/lib/courses";

export const Route = createFileRoute("/admin/courses")({
  beforeLoad: ({ context }) => requirePermission(context, "courses"),
  loader: async () => {
    const [data, archive] = await Promise.all([adminCoursesFn(), archiveListFn()]);
    return { ...data, archived: archive.filter((i) => i.kind === "course") };
  },
  component: CoursesAdmin,
});

type Tab = "live" | "draft" | "archive";

const TABS: { id: Tab; label: string; icon: string; hint: string }[] = [
  { id: "live", label: "На платформе", icon: "Globe", hint: "Обучения, которые сейчас видят пользователи в каталоге JETRA University." },
  { id: "draft", label: "Готовятся", icon: "Hammer", hint: "Обучения в работе: скрыты с сайта, пока вы наполняете их уроками. Включите «На сайте», когда всё готово." },
  { id: "archive", label: "Архив", icon: "Archive", hint: "Удалённые обучения. Их можно восстановить или удалить навсегда." },
];

const fmtDate = (d: string) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

function CoursesAdmin() {
  const { courses, authors, categories: loadedCategories, archived } = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>("live");
  const [toPurge, setToPurge] = useState<ArchiveItem | null>(null);
  const [extraCategories, setExtraCategories] = useState<CourseCategory[]>([]);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<DbCourse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<DbCourse | null>(null);

  const togglePublished = async (c: DbCourse, published: boolean) => {
    setBusy(c.id);
    setError("");
    setNotice("");
    const r = await setCoursePublishedFn({ data: { id: c.id, published } });
    setBusy(null);
    if (!r.ok) return setError(r.message);
    setNotice(
      published
        ? `Обучение «${c.title}» опубликовано и перенесено в раздел «На платформе»`
        : `Обучение «${c.title}» скрыто с сайта и перенесено в раздел «Готовятся»`,
    );
    router.invalidate();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const c = toDelete;
    setBusy(c.id);
    setError("");
    setNotice("");
    const r = await deleteCourseFn({ data: { id: c.id } });
    setBusy(null);
    setToDelete(null);
    if (!r.ok) return setError(r.message);
    setNotice(`Обучение «${c.title}» перемещено в раздел «Архив»`);
    router.invalidate();
  };

  const archiveAct = async (item: ArchiveItem, purge: boolean) => {
    setBusy(item.id);
    setError("");
    setNotice("");
    const r = await archiveActionFn({ data: { kind: "course", id: item.id, purge } });
    setBusy(null);
    setToPurge(null);
    if (!r.ok) return setError(r.message);
    setNotice(purge ? `Обучение «${item.title}» удалено навсегда` : `Обучение «${item.title}» восстановлено из архива`);
    router.invalidate();
  };

  const categories = useMemo(() => {
    const ids = new Set(loadedCategories.map((c) => c.id));
    return [...loadedCategories, ...extraCategories.filter((c) => !ids.has(c.id))].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [loadedCategories, extraCategories]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const inTab = courses.filter((c) => (tab === "live" ? c.published : !c.published));
    return s ? inTab.filter((c) => c.title.toLowerCase().includes(s) || c.categories.some((x) => x.name.toLowerCase().includes(s))) : inTab;
  }, [courses, q, tab]);
  const archivedList = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? archived.filter((a) => a.title.toLowerCase().includes(s)) : archived;
  }, [archived, q]);
  const counts: Record<Tab, number> = {
    live: courses.filter((c) => c.published).length,
    draft: courses.filter((c) => !c.published).length,
    archive: archived.length,
  };

  const openForm = (c: DbCourse | null) => {
    setEditing(c);
    setFormOpen(true);
    setNotice("");
  };

  return (
    <>
      <WsTitle
        title="Обучения"
        text="Добавление и редактирование обучений JETRA University. Изменения сразу появляются в каталоге."
        action={
          <button onClick={() => openForm(null)} className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]">
            <Icon name="Plus" size={16} /> Добавить обучение
          </button>
        }
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-brand-ink/10 bg-white p-1 sm:inline-flex">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => {
              setTab(tb.id);
              setNotice("");
              setError("");
            }}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === tb.id ? "bg-brand-blue text-white" : "text-brand-muted hover:bg-brand-light hover:text-brand-ink",
            )}
          >
            <Icon name={tb.icon} size={15} /> {tb.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", tab === tb.id ? "bg-white/20 text-white" : "bg-brand-surface text-brand-muted")}>
              {counts[tb.id]}
            </span>
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-brand-muted">{TABS.find((x) => x.id === tab)?.hint}</p>
      <WsCard className="p-0">
        <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по названию или категории"
              className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs"
            />
          </label>
          <span className="text-sm text-brand-muted">Всего: {counts[tab]}</span>
        </div>
        {tab === "archive" ? (
          archivedList.length ? (
            <ul className="divide-y divide-brand-ink/[0.06]">
              {archivedList.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                      <Icon name="GraduationCap" size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-xs text-brand-muted">в архиве с {fmtDate(item.archivedAt)}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={busy === item.id}
                      onClick={() => archiveAct(item, false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface disabled:opacity-50"
                    >
                      <Icon name="RotateCcw" size={14} /> Восстановить
                    </button>
                    <button
                      disabled={busy === item.id}
                      onClick={() => setToPurge(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Icon name="Trash2" size={14} /> Удалить навсегда
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="Archive"
              title={archived.length ? "Ничего не найдено" : "В архиве пусто"}
              text={archived.length ? "Измените условия поиска." : "Сюда попадают удалённые обучения. Их можно восстановить или удалить навсегда."}
            />
          )
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="border-b border-brand-ink/[0.08] bg-brand-light/60 text-brand-muted">
                <tr>
                  {["Обучение", "Категория", "Автор", "Цена", "Программа", "На сайте", ""].map((c) => (
                    <th key={c} className="px-5 py-3.5 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {list.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-brand-light/50" onClick={() => openForm(c)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-surface">
                          {c.coverUrl ? <img src={c.coverUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="Image" size={16} className="text-brand-muted" />}
                        </div>
                        <span className="font-medium">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-brand-muted">{c.categories.map((x) => x.name).join(", ") || "—"}</td>
                    <td className="px-5 py-3.5 text-brand-muted">{c.author?.name ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {c.access === "free" ? (
                        <span className="text-emerald-700">Бесплатно</span>
                      ) : (
                        <>
                          {(c.tariffs?.length ?? 0) > 1 ? "от " : ""}{formatPrice(c.price)}
                          {c.oldPrice > c.price && <s className="ml-1.5 text-xs text-brand-muted">{formatPrice(c.oldPrice)}</s>}
                          {(c.clubMonths ?? 0) > 0 && <Icon name="Gift" size={13} className="ml-1.5 inline text-amber-500" />}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-muted">
                      {c.flatProgram ? "" : `${c.modules.length} мод. · `}{lessonsTotal(c)} ур.
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <PublishToggle
                        checked={c.published}
                        disabled={busy === c.id}
                        onChange={(v) => togglePublished(c, v)}
                        label={`Показывать обучение «${c.title}» на сайте`}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        {c.published && (
                          <Link
                            to="/university/$slug"
                            params={{ slug: c.slug }}
                            target="_blank"
                            title="Открыть на сайте"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-ink/15 text-brand-muted hover:bg-brand-surface hover:text-brand-ink"
                          >
                            <Icon name="ExternalLink" size={15} />
                          </Link>
                        )}
                        <button
                          onClick={() => openForm(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface"
                        >
                          <Icon name="Pencil" size={14} /> Изменить
                        </button>
                        <button
                          disabled={busy === c.id}
                          onClick={() => setToDelete(c)}
                          aria-label={`Удалить обучение «${c.title}»`}
                          title="Удалить обучение"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Icon name="Trash2" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="GraduationCap"
            title={counts[tab] ? "Ничего не найдено" : tab === "live" ? "На платформе пока нет обучений" : "Нет обучений в подготовке"}
            text={
              counts[tab]
                ? "Измените условия поиска."
                : tab === "live"
                  ? "Включите переключатель «На сайте» у готового обучения во вкладке «Готовятся»."
                  : "Нажмите «Добавить обучение» — новое обучение можно наполнять, пока оно скрыто с сайта."
            }
          />
        )}
      </WsCard>

      <ConfirmDelete
        open={!!toDelete}
        title="Переместить обучение в архив?"
        busy={busy !== null}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          Обучение <span className="font-medium text-brand-ink">«{toDelete?.title}»</span> будет перемещено в архив вместе с программой и пропадёт с сайта. Восстановить или удалить навсегда можно во вкладке «Архив».
        </p>
        <p>Если нужно просто убрать обучение с сайта — отмените и выключите переключатель «На сайте».</p>
      </ConfirmDelete>

      <ConfirmDelete
        open={!!toPurge}
        title="Удалить навсегда?"
        busy={busy !== null}
        confirmLabel="Удалить навсегда"
        onCancel={() => setToPurge(null)}
        onConfirm={() => toPurge && archiveAct(toPurge, true)}
      >
        <p>
          Обучение <span className="font-medium text-brand-ink">«{toPurge?.title}»</span> будет удалено без возможности восстановления.
        </p>
        <p>Вместе с обучением удалятся программа, уроки, прогресс учеников и выданные доступы.</p>
      </ConfirmDelete>

      <CourseForm
        open={formOpen}
        course={editing}
        authors={authors}
        categories={categories}
        onCategoryCreated={(c) => setExtraCategories((list) => [...list, c])}
        onClose={() => setFormOpen(false)}
        onSaved={(c, created) => {
          setFormOpen(false);
          setTab(c.published ? "live" : "draft");
          setNotice(
            created
              ? c.published
                ? `Обучение «${c.title}» создано и опубликовано в каталоге`
                : `Обучение «${c.title}» создано и лежит в разделе «Готовятся»`
              : `Обучение «${c.title}» сохранено`,
          );
          router.invalidate();
        }}
      />
    </>
  );
}
