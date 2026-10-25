import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import type { MyCourse } from "@/lib/learning";

export default function ContinueLearning({ course }: { course: MyCourse }) {
  const { progress } = course;
  const finished = progress.total > 0 && progress.done === progress.total;
  return (
    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
      <div className="flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-surface sm:w-40">
        {course.coverUrl ? (
          <img src={course.coverUrl} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <Icon name="GraduationCap" size={28} className="text-brand-blue" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-semibold leading-snug text-brand-ink">{course.title}</div>
        {course.nextLessonTitle && !finished && (
          <div className="mt-1 truncate text-sm text-brand-muted">Следующий урок: {course.nextLessonTitle}</div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-surface">
            <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="shrink-0 text-sm tabular-nums text-brand-muted">
            {progress.done}/{progress.total} · {progress.percent}%
          </span>
        </div>
      </div>
      <Link
        to={progress.nextLessonId ? "/cabinet/learn/$slug/$lessonId" : "/cabinet/learn/$slug"}
        params={progress.nextLessonId ? { slug: course.slug, lessonId: String(progress.nextLessonId) } : { slug: course.slug }}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-medium text-white hover:bg-[#3271B0]"
      >
        {finished ? "Повторить" : "Продолжить"} <Icon name="ArrowRight" size={16} />
      </Link>
    </div>
  );
}
