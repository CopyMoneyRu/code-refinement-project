import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { type Course, lessonsCount } from "@/data/catalog";

export function AccessBadge({ access }: { access: Course["access"] }) {
  return access === "free" ? (
    <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">Бесплатно</span>
  ) : (
    <span className="rounded-md bg-brand-blue/15 px-2.5 py-1 text-xs font-medium text-brand-blue">Платный курс</span>
  );
}

export default function CourseCard({ c }: { c: Course }) {
  return (
    <Link
      to="/university/$slug"
      params={{ slug: c.slug }}
      className="group flex h-full flex-col rounded-xl border border-brand-ink/10 bg-white p-6 transition-colors hover:border-brand-blue/40 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.14em] text-brand-muted">{c.category}</span>
        <AccessBadge access={c.access} />
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold text-brand-ink">{c.title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{c.short}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-7 text-sm text-brand-muted">
        <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={15} />{c.modules.length} мод.</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="PlayCircle" size={15} />{lessonsCount(c)} уроков</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="Signal" size={15} />{c.level}</span>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-brand-ink/10 pt-5">
        <span className="text-sm text-brand-muted">{c.teacher.role}</span>
        <Icon name="ArrowUpRight" size={18} className="text-brand-blue transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
