import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { adminCategoriesFn, deleteCategoryFn, saveCategoryFn, type AdminCategory } from "@/lib/courses";

export const Route = createFileRoute("/admin/categories")({
  beforeLoad: ({ context }) => requirePermission(context, "courses"),
  loader: () => adminCategoriesFn(),
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const categories = Route.useLoaderData();
  const router = useRouter();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);

  const save = async (id: number | undefined, value: string) => {
    if (value.trim().length < 2) return setError("Название категории — не короче 2 символов");
    setBusy(true);
    setError("");
    setNotice("");
    const r = await saveCategoryFn({ data: { id, name: value } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setNotice(id ? `Категория переименована в «${r.category.name}»` : `Категория «${r.category.name}» добавлена`);
    setName("");
    setEditId(null);
    router.invalidate();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    setError("");
    setNotice("");
    const r = await deleteCategoryFn({ data: { id: toDelete.id } });
    setBusy(false);
    setToDelete(null);
    if (!r.ok) return setError(r.message);
    setNotice(`Категория «${r.name}» удалена`);
    router.invalidate();
  };

  return (
    <>
      <WsTitle title="Категории" text="Категории обучений университета. Одно обучение может входить в несколько категорий." />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <WsCard className="p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(undefined, name);
          }}
          className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center"
        >
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название новой категории"
            className="h-10 w-full rounded-lg border border-brand-ink/15 px-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60"
          >
            <Icon name="Plus" size={16} /> Добавить категорию
          </button>
          <span className="text-sm text-brand-muted sm:ml-auto">Всего: {categories.length}</span>
        </form>
        {categories.length ? (
          <ul className="divide-y divide-brand-ink/[0.06]">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                {editId === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      save(c.id, editName);
                    }}
                    className="flex flex-1 flex-wrap items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={editName}
                      maxLength={80}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-brand-ink/15 px-3 focus:border-brand-blue focus:outline-none sm:max-w-xs"
                    />
                    <button type="submit" disabled={busy} className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3271B0] disabled:opacity-60">
                      Сохранить
                    </button>
                    <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface">
                      Отмена
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                      <Icon name="Tag" size={16} />
                    </span>
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className="hidden text-brand-muted sm:inline">Обучений: {c.coursesCount}</span>
                    <button
                      onClick={() => {
                        setEditId(c.id);
                        setEditName(c.name);
                      }}
                      title="Переименовать"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-ink/15 text-brand-muted hover:bg-brand-surface hover:text-brand-ink"
                    >
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setToDelete(c)}
                      title="Удалить категорию"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="Tags" title="Категорий пока нет" text="Добавьте первую категорию — затем выберите её в карточке обучения." />
        )}
      </WsCard>

      <ConfirmDelete open={!!toDelete} title="Удалить категорию?" busy={busy} onCancel={() => setToDelete(null)} onConfirm={confirmDelete}>
        <p>
          Категория <span className="font-medium text-brand-ink">«{toDelete?.name}»</span> будет удалена.
          {toDelete && toDelete.coursesCount > 0 && ` Её уберут из ${toDelete.coursesCount} обуч., сами обучения останутся.`}
        </p>
      </ConfirmDelete>
    </>
  );
}
