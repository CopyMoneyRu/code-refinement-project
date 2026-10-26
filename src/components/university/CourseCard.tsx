import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import { courseMinutes, formatDuration, formatPrice, lessonsTotal, type CourseProgress, type DbCourse } from "@/lib/courses";

export function AccessBadge({ access, price }: { access: DbCourse["access"]; price?: number }) {
  return access === "free" ? (
    <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">Бесплатно</span>
  ) : (
    <span className="rounded-md bg-brand-blue/15 px-2.5 py-1 text-xs font-medium text-brand-blue">
      {price ? formatPrice(price) : "Платное обучение"}
    </span>
  );
}

const plural = (n: number, forms: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100;
  return forms[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 1 : 2];
};

export function freeLabel(c: DbCourse) {
  if (c.access === "free") return "";
  const freeModules = c.flatProgram ? 0 : c.modules.filter((m) => m.lessons.length > 0 && m.lessons.every((l) => l.isFree)).length;
  if (freeModules > 0) return `${freeModules} ${plural(freeModules, ["модуль", "модуля", "модулей"])} бесплатно`;
  const freeLessons = c.modules.reduce((n, m) => n + m.lessons.filter((l) => l.isFree).length, 0);
  if (freeLessons > 0) return `${freeLessons} ${plural(freeLessons, ["урок", "урока", "уроков"])} бесплатно`;
  return "";
}

export default function CourseCard({ c, progress }: { c: DbCourse; progress?: CourseProgress }) {
  const free = freeLabel(c);
  const minutes = courseMinutes(c);
  const cats = c.categories.length ? c.categories.map((x) => x.name) : c.category ? [c.category] : [];
  const finished = !!progress && progress.done >= progress.total;
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white transition-colors hover:border-brand-blue/40">
      {c.coverUrl && (
        <div className="aspect-[16/9] overflow-hidden bg-brand-surface">
          <img src={c.coverUrl} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {cats.map((name) => (
              <span key={name} className="rounded-md bg-brand-surface px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-muted">
                {name}
              </span>
            ))}
          </div>
          <span className="shrink-0"><AccessBadge access={c.access} price={c.price} /></span>
        </div>
        <h3 className="mt-6 font-display text-xl font-semibold text-brand-ink">
          <Link to="/university/$slug" params={{ slug: c.slug }} className="after:absolute after:inset-0 after:content-['']">
            {c.title}
          </Link>
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{c.short}</p>
        {free && (
          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Icon name="Gift" size={13} /> {free}
          </span>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-7 text-sm text-brand-muted">
          {!c.flatProgram && <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={15} />{c.modules.length} мод.</span>}
          <span className="inline-flex items-center gap-1.5"><Icon name="PlayCircle" size={15} />{lessonsTotal(c)} уроков</span>
          {minutes > 0 && <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={15} />{formatDuration(minutes)}</span>}
        </div>
        {progress && (
          <div className="mt-5 rounded-lg bg-brand-light px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className={"inline-flex items-center gap-1.5 font-medium " + (finished ? "text-emerald-700" : "text-brand-ink")}>
                <Icon name={finished ? "CheckCircle2" : "PlayCircle"} size={15} className={finished ? "" : "text-brand-blue"} />
                {finished ? "Обучение пройдено" : "Обучение начато"}
              </span>
              <span className="tabular-nums text-brand-muted">{progress.done} из {progress.total} · {progress.percent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-surface">
              <div className={"h-full rounded-full " + (finished ? "bg-emerald-500" : "bg-brand-blue")} style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}
        <div className="mt-6 flex items-center justify-between border-t border-brand-ink/10 pt-5">
          {c.author?.slug ? (
            <Link
              to="/university/authors/$slug"
              params={{ slug: c.author.slug }}
              title={`Все обучения автора ${c.author.name}`}
              className="relative z-10 -m-1.5 flex min-w-0 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-brand-light [&:hover_.author-name]:text-brand-blue"
            >
              <AuthorAvatar name={c.author.name} photoUrl={c.author.photoUrl} className="h-9 w-9 shrink-0" textClassName="text-xs" />
              <span className="min-w-0 text-sm leading-snug">
                <span className="text-brand-muted">Автор: </span>
                <span className="author-name font-medium text-brand-ink transition-colors">{c.author.name}</span>
              </span>
            </Link>
          ) : (
            <span className="text-sm text-brand-muted">JETRA University</span>
          )}
          <Icon name="ArrowUpRight" size={18} className="text-brand-blue transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}
