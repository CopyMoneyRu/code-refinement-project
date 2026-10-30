import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import CategoryChips from "@/components/university/CategoryChips";
import { progressTone } from "@/lib/progressTone";
import { DiscountHint } from "@/components/university/DiscountTimer";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import { courseMinutes, coursePricing, formatDuration, formatPrice, clubLabel, lessonsTotal, type CourseProgress, type DbCourse } from "@/lib/courses";

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

export function ClubPerk({ months, unit, className = "" }: { months: number; unit?: DbCourse["clubUnit"]; className?: string }) {
  if (!months) return null;
  return (
    <span className={"inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 " + className}>
      <Icon name="Gift" size={13} className="text-amber-500" /> Клуб «CAPITALIST» на {clubLabel(months, unit)} в подарок
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


function PriceBlock({ c }: { c: DbCourse }) {
  if (c.access === "free") return <span className="text-base font-semibold text-emerald-700">Бесплатно</span>;
  const p = coursePricing(c);
  return (
    <span className="flex flex-col items-end leading-tight">
      {p.oldPrice > 0 && <s className="text-xs text-brand-muted decoration-brand-muted/60">{formatPrice(p.oldPrice)}</s>}
      <span className="whitespace-nowrap font-display text-lg font-semibold text-brand-ink">
        {p.price ? (
          <>
            {p.from && <span className="mr-1 text-sm font-normal text-brand-muted">от</span>}
            {formatPrice(p.price)}
          </>
        ) : (
          "Платно"
        )}
      </span>
    </span>
  );
}

const discountPercent = (c: DbCourse) => {
  if (c.access === "free") return 0;
  const p = coursePricing(c);
  return p.oldPrice > p.price && p.price > 0 ? Math.round(((p.oldPrice - p.price) * 100) / p.oldPrice) : 0;
};

function PerkBadges({ c, className = "" }: { c: DbCourse; className?: string }) {
  const pct = discountPercent(c);
  const club = c.access === "paid" ? c.clubMonths ?? 0 : 0;
  if (!pct && !club) return null;
  return (
    <span className={"flex flex-wrap gap-1.5 " + className}>
      {pct > 0 && (
        <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold tabular-nums text-white shadow-sm">−{pct}%</span>
      )}
      {club > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-brand-ink shadow-sm ring-1 ring-brand-ink/5">
          <Icon name="Gift" size={13} className="text-amber-500" />+{clubLabel(club, c.clubUnit)} клуба
        </span>
      )}
    </span>
  );
}

export default function CourseCard({ c, progress }: { c: DbCourse; progress?: CourseProgress }) {
  const free = freeLabel(c);
  const minutes = courseMinutes(c);
  const cats = c.categories.length ? c.categories.map((x) => x.name) : c.category ? [c.category] : [];
  const tone = progress ? progressTone(progress) : null;
  const showTimer = c.access === "paid" && !!c.discountUntil && discountPercent(c) > 0;
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white transition-colors hover:border-brand-blue/40">
      {c.coverUrl && (
        <div className="relative aspect-[16/9] overflow-hidden bg-brand-surface">
          <PerkBadges c={c} className="absolute left-3 top-3 z-[1]" />
          <img src={c.coverUrl} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {!c.coverUrl && <PerkBadges c={c} className="mb-3" />}
        <h3 className="font-display text-xl font-semibold leading-snug text-brand-ink">
          <Link to="/university/$slug" params={{ slug: c.slug }} className="after:absolute after:inset-0 after:content-['']">
            {c.title}
          </Link>
        </h3>
        {c.short && <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">{c.short}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-sm text-brand-muted">
          {!c.flatProgram && <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={15} />{c.modules.length} мод.</span>}
          <span className="inline-flex items-center gap-1.5"><Icon name="PlayCircle" size={15} />{lessonsTotal(c)} уроков</span>
          {minutes > 0 && <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={15} />{formatDuration(minutes)}</span>}
          {free && <span className="inline-flex items-center gap-1.5 text-emerald-700"><Icon name="Unlock" size={15} />{free}</span>}
        </div>
        <CategoryChips names={cats} className="mt-4" />
        {progress && tone && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[13px]">
              <span className={"inline-flex items-center gap-1.5 font-medium " + tone.text}>
                <Icon name={tone.icon} size={14} className={tone.iconCls} />
                {tone.label}
              </span>
              <span className="tabular-nums text-brand-muted">{progress.done} из {progress.total}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-surface">
              <div className={"h-full rounded-full " + tone.bar} style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}
        {showTimer && (
          <div className="mt-5 flex justify-end border-t border-brand-ink/10 pt-3">
            <DiscountHint until={c.discountUntil!} />
          </div>
        )}
        <div className={"flex items-end justify-between gap-4 " + (showTimer ? "pt-1.5" : "mt-5 border-t border-brand-ink/10 pt-4")}>
          {c.author?.slug ? (
            <Link
              to="/university/authors/$slug"
              params={{ slug: c.author.slug }}
              title={`Все обучения автора ${c.author.name}`}
              className="relative z-10 -m-1.5 flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-brand-light [&:hover_.author-name]:text-brand-blue"
            >
              <AuthorAvatar name={c.author.name} photoUrl={c.author.photoUrl} className="h-8 w-8 shrink-0" textClassName="text-xs" />
              <span className="author-name min-w-0 truncate text-sm font-medium text-brand-ink transition-colors">{c.author.name}</span>
            </Link>
          ) : (
            <span className="text-sm text-brand-muted">JETRA University</span>
          )}
          <span className="shrink-0">
            <PriceBlock c={c} />
          </span>
        </div>
      </div>
    </div>
  );
}
