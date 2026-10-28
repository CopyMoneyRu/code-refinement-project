import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import VideoPlayer from "@/components/learning/VideoPlayer";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import { courseLearnFn, lessonCompleteFn, lessonGetFn } from "@/lib/learning";
import { formatSize } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/learn/$slug/$lessonId")({
  loader: async ({ params }) => {
    const [course, lesson] = await Promise.all([
      courseLearnFn({ data: { slug: params.slug } }),
      lessonGetFn({ data: { lessonId: Number(params.lessonId) || 0 } }),
    ]);
    if (!course.ok) throw notFound();
    return { course, lesson };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.lesson.ok ? loaderData.lesson.lesson.title : "Урок"} — ${loaderData?.course.ok ? loaderData.course.course.title : "JETRA"}` }],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { course: c, lesson: l } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!c.ok) return null;
  const { course, modules, progress } = c;

  if (!l.ok) {
    const text =
      l.error === "locked"
        ? "Этот урок откроется после прохождения предыдущих уроков модуля."
        : l.error === "paid"
          ? "Этот урок доступен после оплаты обучения. Бесплатные уроки отмечены в программе обучения."
          : "Урок не найден или недоступен.";
    return (
      <WsCard className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-surface text-brand-blue">
          <Icon name="Lock" size={24} />
        </div>
        <p className="mt-5 text-brand-ink">{text}</p>
        <Link to="/cabinet/learn/$slug" params={{ slug }} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-medium text-white">
          К программе обучения
        </Link>
      </WsCard>
    );
  }

  const { lesson, module, position, prev, next, state } = l;
  const trial = state === "paid";
  const split = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const intro = split(lesson.description);
  const paragraphs = split(lesson.body ?? "");
  const files = lesson.materials.filter((m) => m.kind === "file");
  const links = lesson.materials.filter((m) => m.kind === "link");
  const videos = lesson.videos?.length
    ? lesson.videos
    : lesson.videoType !== "none" && lesson.videoUrl
      ? [{ title: "", kind: lesson.videoType, url: lesson.videoUrl }]
      : [];
  const nextPaid = !!next?.paidLocked;
  const isLast = !next || (trial && nextPaid);

  const toggleComplete = async (completed: boolean, goNext: boolean) => {
    setSaving(true);
    setError("");
    const r = await lessonCompleteFn({ data: { lessonId: lesson.id, completed } });
    setSaving(false);
    if (!r.ok) return setError(r.message);
    if (goNext && next) {
      await navigate({ to: "/cabinet/learn/$slug/$lessonId", params: { slug, lessonId: String(next.id) } });
    } else {
      await router.invalidate();
    }
  };

  const outline = (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Прогресс</span>
          <span className="tabular-nums text-brand-muted">{progress.done}/{progress.total}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-surface">
          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
      {modules.map((m, mi) => (
        <div key={m.id}>
          {!course.flat && (
            <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.1em] text-brand-muted">
              {mi + 1}. {m.title}
            </div>
          )}
          <ul className="space-y-0.5">
            {m.lessons.map((x) => {
              const active = x.id === lesson.id;
              const row = (
                <>
                  <Icon
                    name={x.completed ? "CheckCircle2" : x.locked ? "Lock" : active ? "PlayCircle" : "Circle"}
                    size={16}
                    className={cn("mt-0.5 shrink-0", x.completed ? "text-emerald-600" : active ? "text-brand-blue" : "text-brand-ink/30")}
                  />
                  <span className="min-w-0 flex-1 leading-snug">{x.title}</span>
                </>
              );
              return (
                <li key={x.id}>
                  {x.locked ? (
                    <div className="flex cursor-not-allowed gap-2.5 rounded-md px-2 py-2 text-sm text-brand-muted/70">{row}</div>
                  ) : (
                    <Link
                      to="/cabinet/learn/$slug/$lessonId"
                      params={{ slug, lessonId: String(x.id) }}
                      onClick={() => setSidebarOpen(false)}
                      className={cn("flex gap-2.5 rounded-md px-2 py-2 text-sm transition-colors", active ? "bg-brand-blue/10 font-medium text-brand-ink" : "text-brand-ink/80 hover:bg-brand-light")}
                    >
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted">
          <Link to="/cabinet/learn/$slug" params={{ slug }} className="hover:text-brand-ink">{course.title}</Link>
          {!course.flat && (
            <>
              <Icon name="ChevronRight" size={14} />
              <span>{module.title}</span>
            </>
          )}
          <span className="ml-auto tabular-nums">Урок {position.index} из {position.total}</span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight md:text-[30px]">{lesson.title}</h1>
        {lesson.duration && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-muted">
            <Icon name="Clock" size={14} /> {lesson.duration}
          </div>
        )}

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium xl:hidden"
        >
          <Icon name="ListTree" size={16} /> Программа обучения
        </button>
        {sidebarOpen && <WsCard className="mt-3 xl:hidden">{outline}</WsCard>}

        {intro.length > 0 && (
          <div className="mt-5 space-y-3 text-[16px] leading-relaxed text-brand-ink/75">
            {intro.map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
        )}

        {videos.map((v, i) => (
          <div key={i} className="mt-6">
            {(videos.length > 1 || v.title) && (
              <div className="mb-2.5 flex items-center gap-2 font-semibold">
                {videos.length > 1 && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs text-brand-blue">{i + 1}</span>
                )}
                <span>{v.title || `Видео ${i + 1}`}</span>
              </div>
            )}
            <VideoPlayer type={v.kind} url={v.url} title={v.title || lesson.title} />
          </div>
        ))}

        {paragraphs.length > 0 && (
          <WsCard className="mt-6">
            <div className="flex items-center gap-2 font-semibold">
              <Icon name="FileText" size={17} className="text-brand-blue" /> Текст урока
            </div>
            <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-brand-ink/85">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </WsCard>
        )}

        {files.length > 0 && <MaterialList title="Файлы к уроку" icon="Paperclip" items={files} />}
        {links.length > 0 && <MaterialList title="Полезные ссылки" icon="Link" items={links} />}

        {videos.length === 0 && intro.length === 0 && paragraphs.length === 0 && lesson.materials.length === 0 && (
          <WsCard className="mt-6">
            <p className="text-brand-muted">Содержимое этого урока скоро появится.</p>
          </WsCard>
        )}

        <WsCard className="mt-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {lesson.completed ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
                  <Icon name="CheckCircle2" size={20} /> Урок пройден
                </span>
                <button disabled={saving} onClick={() => toggleComplete(false, false)} className="text-sm text-brand-muted underline-offset-2 hover:underline disabled:opacity-50">
                  Отменить
                </button>
              </div>
            ) : (
              <button
                disabled={saving}
                onClick={() => toggleComplete(true, !isLast)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Check" size={16} />}
                {!next ? "Урок пройден — завершить обучение" : nextPaid ? "Урок пройден" : "Урок пройден, дальше"}
              </button>
            )}
            <div className="flex gap-2">
              {prev && (
                <Link
                  to="/cabinet/learn/$slug/$lessonId"
                  params={{ slug, lessonId: String(prev.id) }}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-2.5 text-sm hover:bg-brand-surface"
                >
                  <Icon name="ArrowLeft" size={16} /> Назад
                </Link>
              )}
              {next &&
                !next.paidLocked &&
                (next.locked ? (
                  <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-brand-ink/10 px-4 py-2.5 text-sm text-brand-muted" title="Отметьте текущий урок пройденным">
                    <Icon name="Lock" size={15} /> Далее
                  </span>
                ) : (
                  <Link
                    to="/cabinet/learn/$slug/$lessonId"
                    params={{ slug, lessonId: String(next.id) }}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-2.5 text-sm hover:bg-brand-surface"
                  >
                    Далее <Icon name="ArrowRight" size={16} />
                  </Link>
                ))}
              {!next && lesson.completed && (
                <Link to="/cabinet/learn/$slug" params={{ slug }} className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white">
                  К программе
                </Link>
              )}
            </div>
          </div>
          {trial && nextPaid && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm">
              <Icon name="Lock" size={17} className="mt-0.5 shrink-0 text-brand-blue" />
              <div>
                <div className="font-medium">Следующие уроки доступны после оплаты обучения</div>
                <Link to="/cabinet/learn/$slug" params={{ slug }} className="mt-1 inline-block text-brand-blue hover:underline">
                  Вернуться к программе
                </Link>
              </div>
            </div>
          )}
          {next?.locked && !next.paidLocked && !lesson.completed && (
            <p className="mt-3 text-xs text-brand-muted">Следующий урок откроется, когда вы отметите этот урок пройденным.</p>
          )}
        </WsCard>
      </div>

      <aside className="hidden xl:block">
        <WsCard className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">{outline}</WsCard>
      </aside>
    </div>
  );
}

function MaterialList({ title, icon, items }: { title: string; icon: string; items: { title: string; kind: "file" | "link"; url: string; fileSize: number }[] }) {
  return (
    <WsCard className="mt-6">
      <div className="flex items-center gap-2 font-semibold">
        <Icon name={icon} size={17} className="text-brand-blue" /> {title}
      </div>
      <ul className="mt-4 divide-y divide-brand-ink/[0.07]">
        {items.map((m, i) => (
          <li key={i}>
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              download={m.kind === "file" ? true : undefined}
              className="flex items-center gap-3 py-3 text-[15px] hover:text-brand-blue"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                <Icon name={m.kind === "file" ? "FileDown" : "ExternalLink"} size={17} />
              </span>
              <span className="min-w-0 flex-1 truncate">{m.title}</span>
              <span className="shrink-0 text-xs text-brand-muted">{m.kind === "file" ? formatSize(m.fileSize) || "Скачать" : "Открыть"}</span>
            </a>
          </li>
        ))}
      </ul>
    </WsCard>
  );
}
