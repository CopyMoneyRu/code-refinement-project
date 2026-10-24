import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { programCoursesFn } from "@/lib/learning";

export const Route = createFileRoute("/admin/lessons")({
  beforeLoad: ({ context }) => requirePermission(context, "lessons"),
  loader: () => programCoursesFn(),
  component: LessonsAdmin,
});

function LessonsAdmin() {
  const courses = Route.useLoaderData();
  const [q, setQ] = useState("");
  const list = courses.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <WsTitle title="Уроки" text="Выберите курс, чтобы настроить модули, уроки, видео и материалы." />
      <WsCard className="p-0">
        <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск курса"
              className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs"
            />
          </label>
          <span className="text-sm text-brand-muted">Курсов: {courses.length}</span>
        </div>
        {list.length ? (
          <ul className="divide-y divide-brand-ink/[0.06]">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  to="/admin/program/$courseId"
                  params={{ courseId: String(c.id) }}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-light/60"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      {!c.published && <span className="rounded-md bg-brand-surface px-2 py-0.5 text-xs text-brand-muted">Скрыт</span>}
                      {c.access === "paid" && <span className="rounded-md bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue">Платный</span>}
                    </div>
                    <div className="mt-0.5 text-sm text-brand-muted">
                      {c.modules} мод. · {c.lessons} ур.
                      {(c.hidden_modules > 0 || c.hidden_lessons > 0) && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs">
                          <Icon name="EyeOff" size={12} /> скрыто: {[c.hidden_modules ? `${c.hidden_modules} мод.` : "", c.hidden_lessons ? `${c.hidden_lessons} ур.` : ""].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-blue">
                    Открыть программу <Icon name="ChevronRight" size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="PlayCircle" title="Курсов не найдено" text="Создайте курс в разделе «Курсы», затем добавьте в него уроки здесь." />
        )}
      </WsCard>
    </>
  );
}
