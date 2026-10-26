import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import { formatPrice } from "@/lib/courses";
import { courseLearnFn } from "@/lib/learning";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/learn/$slug/")({
  loader: async ({ params }) => {
    const r = await courseLearnFn({ data: { slug: params.slug } });
    if (!r.ok) throw notFound();
    return r;
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.course.title ?? "Обучение"} — JETRA University` }] }),
  component: CourseProgram,
});

function CourseProgram() {
  const { course, state, preview, modules, progress, freeLessons } = Route.useLoaderData();
  const open = state === "open";
  const trial = state === "paid" && freeLessons > 0;
  const canLearn = open || trial;
  const freeDone = modules.reduce((n, m) => n + m.lessons.filter((l) => l.isFree && l.completed).length, 0);
  const started = progress.done > 0;
  const finished = progress.total > 0 && progress.done === progress.total;

  return (
    <>
      <Link to="/cabinet/courses" className="mb-5 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
        <Icon name="ArrowLeft" size={16} /> Мои обучения
      </Link>

      <WsCard className="overflow-hidden p-0">
        <div className="grid md:grid-cols-[1fr_300px]">
          <div className="p-6 sm:p-8">
            <div className="text-xs uppercase tracking-[0.14em] text-brand-muted">{course.category}</div>
            <h1 className="mt-3 font-display text-[28px] font-bold leading-tight md:text-[34px]">{course.title}</h1>
            {course.author && <div className="mt-2 text-brand-muted">Автор: {course.author.name}</div>}

            {canLearn ? (
              <>
                <div className="mt-7 flex items-center justify-between text-sm">
                  <span className="font-medium">{finished ? "Обучение пройдено" : `Пройдено ${progress.done} из ${progress.total} уроков`}</span>
                  <span className="tabular-nums text-brand-muted">{progress.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-surface">
                  <div className={cn("h-full rounded-full transition-all", finished ? "bg-emerald-500" : "bg-brand-blue")} style={{ width: `${progress.percent}%` }} />
                </div>
                {progress.nextLessonId ? (
                  <Link
                    to="/cabinet/learn/$slug/$lessonId"
                    params={{ slug: course.slug, lessonId: String(progress.nextLessonId) }}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-medium text-white hover:bg-[#3271B0]"
                  >
                    <Icon name="Play" size={16} /> {started ? "Продолжить обучение" : "Начать обучение"}
                  </Link>
                ) : trial && freeDone >= freeLessons ? (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-blue/10 px-4 py-3 text-sm font-medium text-brand-ink">
                    <Icon name="Gift" size={17} className="text-brand-blue" /> Бесплатные уроки пройдены
                  </div>
                ) : finished ? (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <Icon name="Award" size={17} /> Поздравляем! Все уроки пройдены
                  </div>
                ) : null}
                {trial && (
                  <div className="mt-5 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon name="Gift" size={16} className="text-brand-blue" /> Бесплатно доступно {freeLessons}{" "}
                      {freeLessons === 1 ? "урок" : freeLessons < 5 ? "урока" : "уроков"}
                    </div>
                    <p className="mt-1.5 text-brand-muted">
                      Остальные уроки откроются после оплаты обучения{course.price ? ` (${formatPrice(course.price)})` : ""}. Пока доступ выдаёт администратор.
                    </p>
                  </div>
                )}
                {preview && (
                  <p className="mt-4 text-xs text-brand-muted">Вы видите обучение как администратор: все уроки открыты без ограничений.</p>
                )}
              </>
            ) : (
              <div className="mt-7 rounded-xl border border-brand-ink/10 bg-brand-light p-5">
                <div className="flex items-center gap-2 font-medium">
                  <Icon name="Lock" size={17} className="text-brand-blue" /> Доступ к обучению закрыт
                </div>
                <p className="mt-2 text-sm text-brand-muted">
                  Это платное обучение{course.price ? ` (${formatPrice(course.price)})` : ""}. Доступ открывается после оплаты — пока его выдаёт администратор.
                  Программа обучения доступна для ознакомления ниже.
                </p>
              </div>
            )}
          </div>
          {course.coverUrl && (
            <div className="hidden bg-brand-surface md:block">
              <img src={course.coverUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </WsCard>

      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">Программа</h2>
      {modules.length === 0 ? (
        <WsCard>
          <p className="text-brand-muted">Уроки этого обучения скоро появятся.</p>
        </WsCard>
      ) : (
        <div className="space-y-4">
          {modules.map((m, mi) => {
            const doneInModule = m.lessons.filter((l) => l.completed).length;
            return (
              <WsCard key={m.id} className="p-0">
                <div className="flex items-start justify-between gap-4 border-b border-brand-ink/[0.08] px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {!course.flat && <span className="font-display text-sm tabular-nums text-brand-blue">{String(mi + 1).padStart(2, "0")}</span>}
                      <span className="font-semibold">{course.flat ? `Уроки · ${m.lessons.length}` : m.title}</span>
                    </div>
                    {!course.flat && m.description && <p className="mt-1.5 text-sm text-brand-muted">{m.description}</p>}
                    {canLearn && m.unlockMode === "sequential" && m.lessons.length > 1 && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-brand-muted">
                        <Icon name="ListOrdered" size={13} /> Уроки открываются по порядку
                      </p>
                    )}
                  </div>
                  {canLearn && m.lessons.length > 0 && (
                    <span className="shrink-0 text-sm tabular-nums text-brand-muted">
                      {doneInModule}/{m.lessons.length}
                    </span>
                  )}
                </div>
                <ul className="p-2">
                  {m.lessons.map((l, li) => {
                    const clickable = canLearn && !l.locked;
                    const inner = (
                      <>
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            l.completed ? "bg-emerald-500 text-white" : clickable ? "bg-brand-blue/10 text-brand-blue" : "bg-brand-surface text-brand-muted",
                          )}
                        >
                          <Icon name={l.completed ? "Check" : !canLearn || l.locked ? "Lock" : l.hasVideo ? "Play" : "FileText"} size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[15px]", clickable ? "text-brand-ink" : "text-brand-muted")}>
                            {course.flat && <span className="mr-1.5 tabular-nums text-brand-muted">{li + 1}.</span>}
                            {l.title}
                          </span>
                          {canLearn && l.paidLocked && <span className="block text-xs text-brand-muted">Доступен после оплаты</span>}
                          {canLearn && l.locked && !l.paidLocked && <span className="block text-xs text-brand-muted">Откроется после предыдущего урока</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-sm text-brand-muted">
                          {l.isFree && course.access === "paid" && !open && (
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">Бесплатно</span>
                          )}
                          {l.materialsCount > 0 && (
                            <span className="inline-flex items-center gap-1" title="Материалы к уроку">
                              <Icon name="Paperclip" size={14} /> {l.materialsCount}
                            </span>
                          )}
                          {l.duration}
                        </span>
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {clickable ? (
                          <Link
                            to="/cabinet/learn/$slug/$lessonId"
                            params={{ slug: course.slug, lessonId: String(l.id) }}
                            className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-brand-light"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div className="flex cursor-not-allowed items-center gap-4 rounded-lg px-3 py-3">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </WsCard>
            );
          })}
        </div>
      )}
    </>
  );
}
