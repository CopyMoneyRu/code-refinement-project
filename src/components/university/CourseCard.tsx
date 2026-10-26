import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { formatPrice, lessonsTotal, type DbCourse } from "@/lib/courses";

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

export default function CourseCard({ c }: { c: DbCourse }) {
  const free = freeLabel(c);
  return (
    <Link
      to="/university/$slug"
      params={{ slug: c.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white transition-colors hover:border-brand-blue/40"
    >
      {c.coverUrl && (
        <div className="aspect-[16/9] overflow-hidden bg-brand-surface">
          <img src={c.coverUrl} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="line-clamp-1 text-xs uppercase tracking-[0.14em] text-brand-muted">{c.categories.map((x) => x.name).join(" · ") || c.category}</span>
          <AccessBadge access={c.access} price={c.price} />
        </div>
        <h3 className="mt-6 font-display text-xl font-semibold text-brand-ink">{c.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{c.short}</p>
        {free && (
          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Icon name="Gift" size={13} /> {free}
          </span>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-7 text-sm text-brand-muted">
          {!c.flatProgram && <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={15} />{c.modules.length} мод.</span>}
          <span className="inline-flex items-center gap-1.5"><Icon name="PlayCircle" size={15} />{lessonsTotal(c)} уроков</span>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-brand-ink/10 pt-5">
          <span className="text-sm text-brand-muted">{c.author?.name ?? "JETRA University"}</span>
          <Icon name="ArrowUpRight" size={18} className="text-brand-blue transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
