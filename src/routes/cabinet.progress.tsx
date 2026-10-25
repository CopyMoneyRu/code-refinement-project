import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { formatMinutes, myCoursesFn, type MyCourse } from "@/lib/learning";

export const Route = createFileRoute("/cabinet/progress")({
  loader: () => myCoursesFn(),
  component: ProgressPage,
});

const isDone = (c: MyCourse) => c.progress.total > 0 && c.progress.done === c.progress.total;

function ProgressPage() {
  const courses = Route.useLoaderData();
  const total = courses.reduce((n, c) => n + c.progress.total, 0);
  const done = courses.reduce((n, c) => n + c.progress.done, 0);
  const percent = total ? Math.round((done * 100) / total) : 0;
  const minutes = courses.reduce((n, c) => n + (c.minutesSpent || 0), 0);
  const finished = courses.filter(isDone).length;

  const stats = [
    { label: "Общий прогресс", icon: "Target", value: `${percent}%`, hint: `${done} из ${total} уроков`, bar: percent },
    { label: "Время обучения", icon: "Clock", value: formatMinutes(minutes), hint: "по длительности пройденных уроков" },
    { label: "Завершено обучений", icon: "Award", value: String(finished), hint: `из ${courses.length} начатых` },
  ];

  return (
    <>
      <WsTitle title="Прогресс обучения" text="Пройденные уроки и время обучения по каждому обучению." />
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <WsCard key={s.label}>
            <div className="flex items-center gap-2 text-sm text-brand-muted">
              <Icon name={s.icon} size={16} className="text-brand-blue" />
              {s.label}
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-brand-ink">{s.value}</div>
            {s.bar !== undefined && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-surface">
                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${s.bar}%` }} />
              </div>
            )}
            <div className="mt-2 text-sm text-brand-muted">{s.hint}</div>
          </WsCard>
        ))}
      </div>

      <WsCard className="mt-6 p-0">
        <div className="border-b border-brand-ink/[0.08] px-6 py-4 font-semibold">По обучениям</div>
        {courses.length ? (
          <ul className="divide-y divide-brand-ink/[0.06]">
            {courses.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link to="/cabinet/learn/$slug" params={{ slug: c.slug }} className="truncate font-medium hover:text-brand-blue">
                      {c.title}
                    </Link>
                    {isDone(c) && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Icon name="CheckCircle2" size={12} /> Завершено
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-surface">
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${c.progress.percent}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">{c.progress.percent}%</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-6 text-sm text-brand-muted sm:w-64 sm:justify-end">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="PlayCircle" size={15} /> {c.progress.done}/{c.progress.total} уроков
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Clock" size={15} /> {formatMinutes(c.minutesSpent || 0)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="BarChart3"
            title="Прогресс появится после первого урока"
            text="Отметки о прохождении уроков сохраняются на сервере и доступны с любого устройства."
          />
        )}
      </WsCard>
    </>
  );
}
