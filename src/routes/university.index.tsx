import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import CourseCard from "@/components/university/CourseCard";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import Icon from "@/components/ui/icon";
import { catalogFn } from "@/lib/courses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/university/")({
  head: () => ({
    meta: [
      { title: "JETRA University — обучение инвестициям" },
      { name: "description", content: "Бесплатное и платное обучение JETRA University: модули, видеоуроки и материалы." },
      { property: "og:title", content: "JETRA University" },
      { property: "og:description", content: "Обучение инвестициям и управлению капиталом." },
    ],
  }),
  loader: () => catalogFn(),
  component: UniversityPage,
});

function UniversityPage() {
  const { courses: COURSES, authors, categories, progress } = Route.useLoaderData();
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
  const selected = AUTHORS.find((a) => a.id === author) ?? null;

  const list = useMemo(
    () =>
      COURSES.filter(
        (c) =>
          (!author || c.author?.id === author) &&
          (!cat || c.categories.some((x) => x.id === cat)) ,
      ),
    [COURSES, cat, author],
  );

  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((c) => {
                const active = cat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
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
                {AUTHORS.map((a) => (
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
                <CourseCard key={c.id} c={c} progress={progress.find((p) => p.courseId === c.id)} />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center text-brand-muted">По выбранным условиям обучений не найдено.</div>
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
