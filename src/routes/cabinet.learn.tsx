import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import { COURSES } from "@/data/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/learn")({
  component: LessonViewer,
});

function LessonViewer() {
  const course = COURSES[0];
  const lessons = useMemo(() => course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.title }))), [course]);
  const [current, setCurrent] = useState(lessons[0].id);
  const idx = lessons.findIndex((l) => l.id === current);
  const lesson = lessons[idx];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div>
        <div className="text-sm text-brand-muted">{course.title} · {lesson.module}</div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-[30px]">{lesson.title}</h1>

        <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-brand-navy text-brand-snow">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
              <Icon name="Play" size={26} />
            </div>
            <div className="mt-4 text-sm text-brand-snow/55">Здесь будет видеоурок · {lesson.duration}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            disabled={idx === 0}
            onClick={() => setCurrent(lessons[idx - 1].id)}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-2.5 text-sm disabled:opacity-40"
          >
            <Icon name="ArrowLeft" size={16} /> Назад
          </button>
          <span className="text-sm text-brand-muted">{idx + 1} из {lessons.length}</span>
          <button
            disabled={idx === lessons.length - 1}
            onClick={() => setCurrent(lessons[idx + 1].id)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm text-white disabled:opacity-40"
          >
            Далее <Icon name="ArrowRight" size={16} />
          </button>
        </div>

        <WsCard className="mt-6">
          <div className="font-semibold">Материалы к уроку</div>
          {lesson.hasFiles ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-brand-ink/15 p-4 text-sm text-brand-muted">
              <Icon name="FileText" size={18} className="text-brand-blue" />
              Файлы урока будут загружаться через административную панель
            </div>
          ) : (
            <p className="mt-3 text-sm text-brand-muted">К этому уроку нет дополнительных материалов.</p>
          )}
        </WsCard>
      </div>

      <WsCard className="h-fit p-0">
        <div className="border-b border-brand-ink/[0.08] px-5 py-4 font-semibold">Программа курса</div>
        <div className="max-h-[560px] overflow-y-auto p-2">
          {course.modules.map((m) => (
            <div key={m.id} className="mb-2">
              <div className="px-3 py-2 text-xs uppercase tracking-[0.12em] text-brand-muted">{m.title}</div>
              {m.lessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setCurrent(l.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    l.id === current ? "bg-brand-blue/10 text-brand-ink" : "text-brand-muted hover:bg-brand-surface",
                  )}
                >
                  <Icon name={l.id === current ? "PlayCircle" : "Circle"} size={16} className={l.id === current ? "text-brand-blue" : ""} />
                  <span className="flex-1">{l.title}</span>
                  <span className="text-xs">{l.duration}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </WsCard>
    </div>
  );
}
