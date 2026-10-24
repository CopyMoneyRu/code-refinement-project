import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { formatPrice, lessonsTotal, type DbCourse } from "@/lib/courses";

export function AccessBadge({ access, price }: { access: DbCourse["access"]; price?: number }) {
  return access === "free" ? (
    <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">Бесплатно</span>
  ) : (
    <span className="rounded-md bg-brand-blue/15 px-2.5 py-1 text-xs font-medium text-brand-blue">
      {price ? formatPrice(price) : "Платный курс"}
    </span>
  );
}

export default function CourseCard({ c }: { c: DbCourse }) {
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
          <span className="text-xs uppercase tracking-[0.14em] text-brand-muted">{c.category}</span>
          <AccessBadge access={c.access} price={c.price} />
        </div>
        <h3 className="mt-6 font-display text-xl font-semibold text-brand-ink">{c.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{c.short}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-7 text-sm text-brand-muted">
          <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={15} />{c.modules.length} мод.</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="PlayCircle" size={15} />{lessonsTotal(c)} уроков</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="Signal" size={15} />{c.level}</span>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-brand-ink/10 pt-5">
          <span className="text-sm text-brand-muted">{c.author?.name ?? "JETRA University"}</span>
          <Icon name="ArrowUpRight" size={18} className="text-brand-blue transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
