import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import PublicLayout, { PageIntro } from "@/components/site/PublicLayout";
import CourseCard from "@/components/university/CourseCard";
import Icon from "@/components/ui/icon";
import { CATEGORIES, COURSES } from "@/data/catalog";
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
  component: UniversityPage,
});

type AccessFilter = "all" | "free" | "paid";

function UniversityPage() {
  const [cat, setCat] = useState<string>("Все");
  const [access, setAccess] = useState<AccessFilter>("all");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      COURSES.filter(
        (c) =>
          (cat === "Все" || c.category === cat) &&
          (access === "all" || c.access === access) &&
          c.title.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [cat, access, q],
  );

  return (
    <PublicLayout>
      <PageIntro
        eyebrow="JETRA University"
        title={<>Обучение <span className="font-bold">управлению капиталом</span></>}
        text="Курсы от базовых понятий до профессиональных инструментов: модули, видеоуроки, дополнительные материалы и отслеживание прогресса."
      />
      <section className="pb-24">
        <div className="container-x">
          <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors",
                    cat === c ? "bg-brand-blue text-white" : "bg-brand-card text-brand-snow/65 hover:text-brand-snow",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex rounded-lg bg-brand-card p-1 text-sm">
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
                      access === v ? "bg-white/10 text-brand-snow" : "text-brand-snow/55 hover:text-brand-snow",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label className="relative">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-snow/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск курса"
                  className="h-10 w-full rounded-lg border border-white/10 bg-transparent pl-9 pr-3 text-sm text-brand-snow placeholder:text-brand-snow/35 focus:border-brand-blue focus:outline-none sm:w-56"
                />
              </label>
            </div>
          </div>

          {list.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CourseCard key={c.slug} c={c} />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center text-brand-snow/55">По выбранным условиям курсов не найдено.</div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
