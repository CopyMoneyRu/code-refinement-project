import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import CourseCard from "@/components/university/CourseCard";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import Icon from "@/components/ui/icon";
import { catalogFn, hasFreeContent, lessonsTotal, type CourseProgress } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { getSiteOrigin } from "@/lib/site-origin";

export const Route = createFileRoute("/university/")({
  head: ({ loaderData }) => {
    const image = `${loaderData?.origin ?? ""}/og-university.jpg`;
    return {
      meta: [
        { title: "JETRA University — обучение инвестициям" },
        { name: "description", content: "Бесплатное и платное обучение JETRA University: модули, видеоуроки и материалы." },
        { property: "og:title", content: "JETRA University" },
        { property: "og:description", content: "Обучение инвестициям и управлению капиталом." },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
    };
  },
  loader: async () => ({ ...(await catalogFn()), origin: getSiteOrigin() }),
  component: UniversityPage,
});

type Kind = "all" | "free" | "paid";
const KINDS: [Kind, string, string, string][] = [
  ["all", "Все обучения", "Все", "LayoutGrid"],
  ["free", "Бесплатные", "Бесплатные", "Gift"],
  ["paid", "Платные", "Платные", "Wallet"],
];
const matchKind = (c: Parameters<typeof hasFreeContent>[0], k: Kind) =>
  k === "all" || (k === "paid" ? c.access === "paid" : hasFreeContent(c));

function UniversityPage() {
  const { courses: COURSES, authors, categories, progress, loggedIn } = Route.useLoaderData();
  const AUTHORS = useMemo(
    () => authors.filter((a) => COURSES.some((c) => c.author?.id === a.id)),
    [authors, COURSES],
  );
  const CATEGORIES = useMemo(
    () => [
      { id: 0, name: "Все", count: COURSES.length },
      ...categories
        .map((c) => ({ id: c.id, name: c.name, count: COURSES.filter((x) => x.categories.some((y) => y.id === c.id)).length }))
        .filter((c) => c.count > 0),
    ],
    [COURSES, categories],
  );
  const [cat, setCat] = useState<number>(0);
  const [author, setAuthor] = useState<number | null>(null);
  const [kind, setKind] = useState<Kind>("all");
  const progressOf = useMemo(() => {
    const map = new Map<number, CourseProgress>();
    if (!loggedIn) return map;
    for (const c of COURSES) {
      map.set(c.id, progress.find((p) => p.courseId === c.id) ?? { courseId: c.id, done: 0, total: lessonsTotal(c), percent: 0 });
    }
    return map;
  }, [COURSES, progress, loggedIn]);
  const visibleAuthors = useMemo(
    () => (cat ? AUTHORS.filter((a) => COURSES.some((c) => c.author?.id === a.id && c.categories.some((x) => x.id === cat))) : AUTHORS),
    [AUTHORS, COURSES, cat],
  );
  const selected = visibleAuthors.find((a) => a.id === author) ?? null;

  const list = useMemo(
    () =>
      COURSES.filter(
        (c) =>
          (!author || c.author?.id === author) &&
          (!cat || c.categories.some((x) => x.id === cat)) &&
          matchKind(c, kind),
      ),
    [COURSES, cat, author, kind],
  );

  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <div role="tablist" aria-label="Тип обучений" className="mb-6 grid w-full grid-cols-3 gap-1 rounded-xl border border-brand-ink/10 bg-white p-1 sm:inline-grid sm:w-auto sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none">
            {KINDS.map(([id, label, short, icon]) => {
              const active = kind === id;
              const count = COURSES.filter((c) => matchKind(c, id)).length;
              return (
                <button
                  key={id}
                  onClick={() => setKind(id)}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-[13px] font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm",
                    active ? "bg-brand-blue text-white shadow-sm" : "text-brand-muted hover:bg-brand-light hover:text-brand-ink",
                  )}
                >
                  <Icon name={icon} size={15} className="hidden shrink-0 sm:block" />
                  <span className="truncate sm:hidden">{short}</span>
                  <span className="hidden whitespace-nowrap sm:inline">{label}</span>
                  <span className={cn("shrink-0 text-xs tabular-nums", active ? "text-white/75" : "text-brand-ink/40")}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((c) => {
                const active = cat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCat(c.id);
                      if (author && c.id && !COURSES.some((x) => x.author?.id === author && x.categories.some((y) => y.id === c.id))) setAuthor(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors",
                      active ? "bg-brand-blue text-white" : "bg-white text-brand-muted hover:text-brand-ink",
                    )}
                  >
                    {c.name}
                    <span className={cn("text-xs", active ? "text-white/75" : "text-brand-ink/40")}>{c.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 border-b border-brand-ink/10 pb-8">
            <h2 className="font-display text-xl font-semibold text-brand-ink">Авторы</h2>
            <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-1">
                <AuthorChip active={!author} onClick={() => setAuthor(null)} name="Все авторы" />
                {visibleAuthors.map((a) => (
                  <AuthorChip
                    key={a.id}
                    active={author === a.id}
                    onClick={() => setAuthor(author === a.id ? null : a.id)}
                    name={a.name}
                    role={a.role}
                    photoUrl={a.photoUrl}
                  />
                ))}
            </div>

            {selected && (
              <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-brand-ink/10 bg-white p-6 sm:flex-row sm:items-center">
                <AuthorAvatar name={selected.name} photoUrl={selected.photoUrl} className="h-20 w-20" textClassName="text-xl" />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold text-brand-ink">{selected.name}</div>
                  {selected.role && <div className="text-sm text-brand-muted">{selected.role}</div>}
                  {selected.bio && <p className="mt-3 line-clamp-3 whitespace-pre-line text-[15px] leading-relaxed text-brand-ink/80">{selected.bio}</p>}
                </div>
                <Link
                  to="/university/authors/$slug"
                  params={{ slug: selected.slug }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3271B0]"
                >
                  Подробнее об авторе <Icon name="ArrowRight" size={16} />
                </Link>
              </div>
            )}
          </div>

          {list.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CourseCard
                  key={c.id}
                  c={c}
                  progress={progressOf.get(c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center text-brand-muted">
              По выбранным условиям обучений не найдено.
              {kind !== "all" && (
                <div className="mt-3">
                  <button onClick={() => setKind("all")} className="text-sm font-medium text-brand-blue hover:underline">Показать все обучения</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

function AuthorChip({
  active,
  onClick,
  name,
  role,
  photoUrl,
}: {
  active: boolean;
  onClick: () => void;
  name: string;
  role?: string;
  photoUrl?: string;
}) {
  const isAll = !role && !photoUrl && name === "Все авторы";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-[150px] shrink-0 flex-col items-center rounded-xl border bg-white px-3 py-4 text-center transition-colors",
        active ? "border-brand-blue ring-1 ring-brand-blue" : "border-brand-ink/10 hover:border-brand-blue/40",
      )}
    >
      {isAll ? (
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full font-display text-base font-semibold",
            active ? "bg-brand-blue text-white" : "bg-brand-surface text-brand-ink",
          )}
        >
          Все
        </span>
      ) : (
        <AuthorAvatar
          name={name}
          photoUrl={photoUrl}
          className={cn("h-14 w-14", active && !photoUrl && "bg-brand-blue text-white", active && photoUrl && "ring-2 ring-brand-blue ring-offset-2")}
          textClassName="font-display text-base"
        />
      )}
      <span className="mt-3 text-sm font-medium leading-snug text-brand-ink">{name}</span>
      {role && <span className="mt-1 text-xs leading-snug text-brand-muted">{role}</span>}
    </button>
  );
}