import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import CourseCard from "@/components/university/CourseCard";
import Icon from "@/components/ui/icon";
import { catalogFn } from "@/lib/courses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/university/")({
  head: () => ({
    meta: [
      { title: "JETRA University — курсы по инвестициям" },
      { name: "description", content: "Бесплатные и платные курсы JETRA University: модули, видеоуроки и материалы." },
      { property: "og:title", content: "JETRA University" },
      { property: "og:description", content: "Курсы по инвестициям и управлению капиталом." },
    ],
  }),
  loader: () => catalogFn(),
  component: UniversityPage,
});

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

type AccessFilter = "all" | "free" | "paid";

function UniversityPage() {
  const { courses: COURSES, authors } = Route.useLoaderData();
  const AUTHORS = useMemo(
    () => authors.filter((a) => COURSES.some((c) => c.author?.id === a.id)).map((a) => ({ ...a, initials: initialsOf(a.name) })),
    [authors, COURSES],
  );
  const CATEGORIES = useMemo(() => ["Все", ...[...new Set(COURSES.map((c) => c.category))].sort()], [COURSES]);
  const [cat, setCat] = useState<string>("Все");
  const [access, setAccess] = useState<AccessFilter>("all");
  const [q, setQ] = useState("");
  const [author, setAuthor] = useState<number | null>(null);
  const [authorView, setAuthorView] = useState<"cards" | "list">("cards");

  const list = useMemo(
    () =>
      COURSES.filter(
        (c) =>
          (!author || c.author?.id === author) &&
          (cat === "Все" || c.category === cat) &&
          (access === "all" || c.access === access) &&
          c.title.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [COURSES, cat, access, q, author],
  );

  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <div className="mb-8 border-b border-brand-ink/10 pb-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-semibold text-brand-ink">Авторы</h2>
              <div className="flex rounded-lg bg-white p-1">
                {([
                  ["cards", "LayoutGrid", "Иконки"],
                  ["list", "List", "Список"],
                ] as const).map(([v, ic, l]) => (
                  <button
                    key={v}
                    onClick={() => setAuthorView(v)}
                    aria-label={l}
                    title={l}
                    className={cn(
                      "flex h-8 w-9 items-center justify-center rounded-md transition-colors",
                      authorView === v ? "bg-brand-surface text-brand-ink" : "text-brand-muted hover:text-brand-ink",
                    )}
                  >
                    <Icon name={ic} size={16} />
                  </button>
                ))}
              </div>
            </div>

            {authorView === "cards" ? (
              <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-1">
                <AuthorChip active={!author} onClick={() => setAuthor(null)} initials="Все" name="Все авторы" />
                {AUTHORS.map((a) => (
                  <AuthorChip
                    key={a.id}
                    active={author === a.id}
                    onClick={() => setAuthor(author === a.id ? null : a.id)}
                    initials={a.initials}
                    name={a.name}
                    role={a.role}
                  />
                ))}
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-brand-ink/10 overflow-hidden rounded-xl border border-brand-ink/10 bg-white">
                {[{ id: null as number | null, name: "Все авторы", role: "" }, ...AUTHORS].map((a) => {
                  const count = a.id ? COURSES.filter((c) => c.author?.id === a.id).length : COURSES.length;
                  return (
                    <li key={a.id ?? "all"}>
                      <button
                        onClick={() => setAuthor(a.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors",
                          author === a.id ? "bg-brand-surface" : "hover:bg-brand-light",
                        )}
                      >
                        <span>
                          <span className="block font-medium text-brand-ink">{a.name}</span>
                          {a.role && <span className="block text-sm text-brand-muted">{a.role}</span>}
                        </span>
                        <span className="shrink-0 text-sm text-brand-muted">{count} курс.</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-4 border-b border-brand-ink/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors",
                    cat === c ? "bg-brand-blue text-white" : "bg-white text-brand-muted hover:text-brand-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex rounded-lg bg-white p-1 text-sm">
                {([
                  ["all", "Все"],
                  ["free", "Бесплатные"],
                  ["paid", "Платные"],
                ] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setAccess(v)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 transition-colors",
                      access === v ? "bg-brand-surface text-brand-ink" : "text-brand-muted hover:text-brand-ink",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label className="relative">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/50" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск курса"
                  className="h-10 w-full rounded-lg border border-brand-ink/10 bg-transparent pl-9 pr-3 text-sm text-brand-ink placeholder:text-brand-ink/50 focus:border-brand-blue focus:outline-none sm:w-56"
                />
              </label>
            </div>
          </div>

          {list.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CourseCard key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center text-brand-muted">По выбранным условиям курсов не найдено.</div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

function AuthorChip({
  active,
  onClick,
  initials,
  name,
  role,
}: {
  active: boolean;
  onClick: () => void;
  initials: string;
  name: string;
  role?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-[150px] shrink-0 flex-col items-center rounded-xl border bg-white px-3 py-4 text-center transition-colors",
        active ? "border-brand-blue ring-1 ring-brand-blue" : "border-brand-ink/10 hover:border-brand-blue/40",
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full font-display text-base font-semibold",
          active ? "bg-brand-blue text-white" : "bg-brand-surface text-brand-ink",
        )}
      >
        {initials}
      </span>
      <span className="mt-3 text-sm font-medium leading-snug text-brand-ink">{name}</span>
      {role && <span className="mt-1 text-xs leading-snug text-brand-muted">{role}</span>}
    </button>
  );
}
