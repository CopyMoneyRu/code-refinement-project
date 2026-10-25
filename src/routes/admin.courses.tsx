import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import CourseForm from "@/components/workspace/CourseForm";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import PublishToggle from "@/components/workspace/PublishToggle";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { adminCoursesFn, deleteCourseFn, formatPrice, lessonsTotal, setCoursePublishedFn, type CourseCategory, type DbCourse } from "@/lib/courses";

export const Route = createFileRoute("/admin/courses")({
  beforeLoad: ({ context }) => requirePermission(context, "courses"),
  loader: () => adminCoursesFn(),
  component: CoursesAdmin,
});

function CoursesAdmin() {
  const { courses, authors, categories: loadedCategories } = Route.useLoaderData();
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
    setNotice(published ? `Обучение «${c.title}» показано на сайте` : `Обучение «${c.title}» скрыто с сайта и хранится в админке`);
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
    setNotice(`Обучение «${c.title}» удалено`);
    router.invalidate();
  };

  const categories = useMemo(() => {
    const ids = new Set(loadedCategories.map((c) => c.id));
    return [...loadedCategories, ...extraCategories.filter((c) => !ids.has(c.id))].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [loadedCategories, extraCategories]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? courses.filter((c) => c.title.toLowerCase().includes(s) || c.categories.some((x) => x.name.toLowerCase().includes(s))) : courses;
  }, [courses, q]);

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
          <span className="text-sm text-brand-muted">Всего: {courses.length}</span>
        </div>
        {list.length ? (
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
                      {c.access === "free" ? <span className="text-emerald-700">Бесплатно</span> : formatPrice(c.price)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-brand-muted">
                      {c.modules.length} мод. · {lessonsTotal(c)} ур.
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
            title={courses.length ? "Ничего не найдено" : "Обучений пока нет"}
            text={courses.length ? "Измените условия поиска." : "Нажмите «Добавить обучение», чтобы создать первое обучение."}
          />
        )}
      </WsCard>

      <ConfirmDelete
        open={!!toDelete}
        title="Удалить обучение?"
        busy={busy !== null}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          Обучение <span className="font-medium text-brand-ink">«{toDelete?.title}»</span> будет удалено безвозвратно вместе с программой.
        </p>
        <p>Если нужно просто убрать обучение с сайта — отмените и выключите переключатель «На сайте».</p>
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
          setNotice(
            created
              ? c.published
                ? `Обучение «${c.title}» создано и опубликовано в каталоге`
                : `Обучение «${c.title}» создано (скрыто из каталога)`
              : `Обучение «${c.title}» сохранено`,
          );
          router.invalidate();
        }}
      />
    </>
  );
}
