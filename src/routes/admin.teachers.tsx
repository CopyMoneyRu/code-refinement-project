import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import AuthorForm from "@/components/workspace/AuthorForm";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { adminAuthorsFn, type AdminAuthor } from "@/lib/courses";

export const Route = createFileRoute("/admin/teachers")({
  beforeLoad: ({ context }) => requirePermission(context, "authors"),
  loader: () => adminAuthorsFn(),
  component: AuthorsAdmin,
});

function AuthorsAdmin() {
  const authors = Route.useLoaderData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminAuthor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? authors.filter((a) => a.name.toLowerCase().includes(s) || a.role.toLowerCase().includes(s)) : authors;
  }, [authors, q]);

  const openForm = (a: AdminAuthor | null) => {
    setEditing(a);
    setFormOpen(true);
    setNotice("");
  };

  return (
    <>
      <WsTitle
        title="Авторы"
        text="Профили авторов курсов. Их можно выбрать в карточке курса, а в университете они показываются с фото и описанием."
        action={
          <button onClick={() => openForm(null)} className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]">
            <Icon name="Plus" size={16} /> Добавить автора
          </button>
        }
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      <WsCard className="p-0">
        <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени или специализации"
              className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs"
            />
          </label>
          <span className="text-sm text-brand-muted">Всего: {authors.length}</span>
        </div>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-brand-ink/[0.08] bg-brand-light/60 text-brand-muted">
                <tr>
                  {["Автор", "Кратко", "Курсов", "В университете", ""].map((c) => (
                    <th key={c} className="px-5 py-3.5 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {list.map((a) => (
                  <tr key={a.id} className="cursor-pointer hover:bg-brand-light/50" onClick={() => openForm(a)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AuthorAvatar name={a.name} photoUrl={a.photoUrl} className="h-10 w-10" textClassName="text-sm" />
                        <div className="min-w-0">
                          <div className="font-medium">{a.name}</div>
                          {a.role && <div className="text-xs text-brand-muted">{a.role}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-5 py-3.5 text-brand-muted">
                      {a.bio ? <span className="line-clamp-2">{a.bio}</span> : <span className="text-brand-ink/40">Не заполнено</span>}
                    </td>
                    <td className="px-5 py-3.5 text-brand-muted">{a.coursesTotal}</td>
                    <td className="px-5 py-3.5">
                      {a.coursesPublished > 0 ? (
                        <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">Показывается</span>
                      ) : (
                        <span className="whitespace-nowrap rounded-md bg-brand-surface px-2.5 py-1 text-xs font-medium text-brand-muted">Нет опубликованных курсов</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                      {a.coursesPublished > 0 && (
                        <Link
                          to="/university/authors/$slug"
                          params={{ slug: a.slug }}
                          target="_blank"
                          title="Открыть страницу автора"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-ink/15 text-brand-muted hover:bg-brand-surface hover:text-brand-ink"
                        >
                          <Icon name="ExternalLink" size={15} />
                        </Link>
                      )}
                      <button
                        onClick={() => openForm(a)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface"
                      >
                        <Icon name="Pencil" size={14} /> Изменить
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
            icon="UserRound"
            title={authors.length ? "Ничего не найдено" : "Авторов пока нет"}
            text={authors.length ? "Измените условия поиска." : "Нажмите «Добавить автора», чтобы создать первый профиль."}
          />
        )}
      </WsCard>

      <AuthorForm
        open={formOpen}
        author={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(a, created) => {
          setFormOpen(false);
          setNotice(created ? `Автор «${a.name}» добавлен. Теперь его можно выбрать в карточке курса.` : `Профиль «${a.name}» сохранён`);
          router.invalidate();
        }}
      />
    </>
  );
}