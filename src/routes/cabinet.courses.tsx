import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { progressTone } from "@/lib/progressTone";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { myCoursesFn } from "@/lib/learning";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/courses")({
  loader: () => myCoursesFn(),
  component: MyCourses,
});

const TABS = ["В процессе", "Завершённые", "Все"] as const;

function MyCourses() {
  const courses = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Все");

  const list = useMemo(() => {
    const done = (c: (typeof courses)[number]) => c.progress.total > 0 && c.progress.done === c.progress.total;
    if (tab === "В процессе") return courses.filter((c) => !done(c));
    if (tab === "Завершённые") return courses.filter(done);
    return courses;
  }, [courses, tab]);

  return (
    <>
      <WsTitle title="Мои обучения" text="Обучения, которые вы начали, и платные обучения с открытым доступом." />
      <div className="mb-5 flex gap-1 rounded-lg bg-brand-surface p-1 sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("flex-1 rounded-md px-4 py-2 text-sm transition-colors", tab === t ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => {
            const finished = c.progress.total > 0 && c.progress.done === c.progress.total;
            const tone = progressTone(c.progress);
            return (
              <Link key={c.id} to="/cabinet/learn/$slug" params={{ slug: c.slug }} className="group">
                <WsCard className="flex h-full gap-4 transition-colors group-hover:border-brand-blue/40">
                  <div className="hidden h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-surface sm:flex">
                    {c.coverUrl ? <img src={c.coverUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="GraduationCap" size={24} className="text-brand-muted" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold group-hover:text-brand-blue">{c.title}</div>
                    {c.author && <div className="mt-0.5 text-sm text-brand-muted">{c.author.name}</div>}
                    <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium", tone.box, tone.text)}>
                        <Icon name={tone.icon} size={12} className={tone.iconCls} /> {tone.label}
                      </span>
                      <span className={cn("tabular-nums", tone.meta)}>
                        {finished ? "" : `${c.progress.done} из ${c.progress.total} · `}{c.progress.percent}%
                      </span>
                    </div>
                    <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full", tone.track)}>
                      <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${c.progress.percent}%` }} />
                    </div>
                  </div>
                </WsCard>
              </Link>
            );
          })}
        </div>
      ) : (
        <WsCard>
          <EmptyState
            icon="GraduationCap"
            title={courses.length ? "В этом разделе пока пусто" : "Вы ещё не начали обучение"}
            text={courses.length ? "Переключите вкладку, чтобы увидеть другие обучения." : "Выберите обучение в каталоге и нажмите «Начать обучение» — он появится здесь вместе с прогрессом."}
          />
          <div className="pb-6 text-center">
            <Link to="/university" className="text-sm font-medium text-brand-blue hover:underline">Открыть каталог обучений</Link>
          </div>
        </WsCard>
      )}
    </>
  );
}
