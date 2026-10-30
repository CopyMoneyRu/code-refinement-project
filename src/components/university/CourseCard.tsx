import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import CategoryChips from "@/components/university/CategoryChips";
import { PROGRESS_TONES } from "@/lib/progressTone";
import DiscountTimer from "@/components/university/DiscountTimer";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import { courseMinutes, coursePricing, formatDuration, formatPrice, monthsLabel, lessonsTotal, type CourseProgress, type DbCourse } from "@/lib/courses";

export function AccessBadge({
  access,
  price,
  oldPrice,
  tariffs,
}: {
  access: DbCourse["access"];
  price?: number;
  oldPrice?: number;
  tariffs?: DbCourse["tariffs"];
}) {
  if (access === "free") return <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">Бесплатно</span>;
  const p = coursePricing({ access, price: price ?? 0, oldPrice, tariffs });
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {p.oldPrice > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs text-brand-muted line-through decoration-brand-muted/70">{formatPrice(p.oldPrice)}</span>
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-rose-600">
            −{Math.round(((p.oldPrice - p.price) * 100) / p.oldPrice)}%
          </span>
        </span>
      )}
      <span className="whitespace-nowrap rounded-md bg-brand-blue/15 px-2.5 py-1 text-xs font-medium text-brand-blue">
        {p.price ? `${p.from ? "от " : ""}${formatPrice(p.price)}` : "Платное обучение"}
      </span>
    </span>
  );
}

export function ClubPerk({ months, className = "" }: { months: number; className?: string }) {
  if (!months) return null;
  return (
    <span className={"inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 " + className}>
      <Icon name="Gift" size={13} className="text-amber-500" /> Клуб «CAPITALIST» на {monthsLabel(months)} в подарок
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
  const finished = !!progress && progress.total > 0 && progress.done >= progress.total;
  const notStarted = !!progress && progress.done === 0;
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white transition-colors hover:border-brand-blue/40">
      {c.coverUrl && (
        <div className="relative aspect-[16/9] overflow-hidden bg-brand-surface">
          {(c.clubMonths ?? 0) > 0 && (
            <span className="absolute left-3 top-3 z-[1] inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-amber-800 shadow-sm">
              <Icon name="Crown" size={13} className="text-amber-500" /> + клуб в подарок
            </span>
          )}
          <img src={c.coverUrl} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-xl font-semibold leading-snug text-brand-ink">
            <Link to="/university/$slug" params={{ slug: c.slug }} className="after:absolute after:inset-0 after:content-['']">
              {c.title}
            </Link>
          </h3>
          <span className="mt-0.5 shrink-0"><AccessBadge access={c.access} price={c.price} oldPrice={c.oldPrice} tariffs={c.tariffs} /></span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{c.short}</p>
        {((c.clubMonths ?? 0) > 0 || free || c.discountUntil) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {c.discountUntil && <DiscountTimer until={c.discountUntil} />}
            {(c.clubMonths ?? 0) > 0 && <ClubPerk months={c.clubMonths} />}
            {free && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Icon name="Gift" size={13} /> {free}
              </span>
            )}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-7 text-sm text-brand-muted">
          {!c.flatProgram && <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={15} />{c.modules.length} мод.</span>}
          <span className="inline-flex items-center gap-1.5"><Icon name="PlayCircle" size={15} />{lessonsTotal(c)} уроков</span>
          {minutes > 0 && <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={15} />{formatDuration(minutes)}</span>}
        </div>
        <CategoryChips names={cats} className="mt-4" />
        {progress && (() => {
          const tone = finished ? PROGRESS_TONES.done : notStarted ? PROGRESS_TONES.todo : PROGRESS_TONES.active;
          return (
            <div className={"mt-5 rounded-lg border px-4 py-3 " + tone.box}>
              <div className="flex items-center justify-between text-sm">
                <span className={"inline-flex items-center gap-1.5 font-medium " + tone.text}>
                  <Icon name={tone.icon} size={15} className={tone.iconCls} />
                  {tone.label}
                </span>
                <span className={"tabular-nums " + tone.meta}>{progress.done} из {progress.total} · {progress.percent}%</span>
              </div>
              <div className={"mt-2 h-1.5 overflow-hidden rounded-full " + tone.track}>
                <div className={"h-full rounded-full " + tone.bar} style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          );
        })()}
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
        </div>
      </div>
    </div>
  );
}