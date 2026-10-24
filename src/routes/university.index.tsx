import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import CourseCard from "@/components/university/CourseCard";
import AuthorAvatar from "@/components/university/AuthorAvatar";
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

function UniversityPage() {
  const { courses: COURSES, authors } = Route.useLoaderData();
  const AUTHORS = useMemo(
    () => authors.filter((a) => COURSES.some((c) => c.author?.id === a.id)),
    [authors, COURSES],
  );
  const CATEGORIES = useMemo(() => ["Все", ...[...new Set(COURSES.map((c) => c.category))].sort()], [COURSES]);
  const [cat, setCat] = useState<string>("Все");
  const [q, setQ] = useState("");
  const [author, setAuthor] = useState<number | null>(null);
  const [authorView, setAuthorView] = useState<"cards" | "list">("cards");
  const selected = AUTHORS.find((a) => a.id === author) ?? null;

  const list = useMemo(
    () =>
      COURSES.filter(
        (c) =>
          (!author || c.author?.id === author) &&
          (cat === "Все" || c.category === cat) &&
          c.title.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [COURSES, cat, q, author],
  );

  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            <div className="shrink-0">
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

          <div className="mt-8 border-b border-brand-ink/10 pb-8">
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
            ) : (
              <ul className="mt-5 divide-y divide-brand-ink/10 overflow-hidden rounded-xl border border-brand-ink/10 bg-white">
                {[{ id: null as number | null, name: "Все авторы", role: "", photoUrl: "" }, ...AUTHORS].map((a) => {
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
                        <span className="flex items-center gap-3.5">
                          {a.id ? (
                            <AuthorAvatar name={a.name} photoUrl={a.photoUrl} className="h-10 w-10" textClassName="text-sm" />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-muted">
                              <Icon name="Users" size={17} />
                            </span>
                          )}
                          <span>
                            <span className="block font-medium text-brand-ink">{a.name}</span>
                            {a.role && <span className="block text-sm text-brand-muted">{a.role}</span>}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-brand-muted">{count} курс.</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selected && (selected.bio || selected.photoUrl) && (
              <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-brand-ink/10 bg-white p-6 sm:flex-row sm:items-start">
                <AuthorAvatar name={selected.name} photoUrl={selected.photoUrl} className="h-20 w-20" textClassName="text-xl" />
                <div className="min-w-0">
                  <div className="font-display text-lg font-semibold text-brand-ink">{selected.name}</div>
                  {selected.role && <div className="text-sm text-brand-muted">{selected.role}</div>}
                  {selected.bio && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-brand-ink/80">{selected.bio}</p>}
                </div>
              </div>
            )}
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
