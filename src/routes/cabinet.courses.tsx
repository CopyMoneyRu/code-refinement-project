import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/courses")({
  component: MyCourses,
});

const TABS = ["В процессе", "Завершённые", "Все"] as const;

function MyCourses() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("В процессе");
  return (
    <>
      <WsTitle title="Мои курсы" text="Курсы, к которым у вас открыт доступ." />
      <div className="mb-5 flex gap-1 rounded-lg bg-brand-surface p-1 sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("flex-1 rounded-md px-4 py-2 text-sm transition-colors", tab === t ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink")}
          >
            {t}
          </button>
        ))}
      </div>
      <WsCard>
        <EmptyState
          icon="GraduationCap"
          title="Здесь пока пусто"
          text="Курсы появятся после записи на бесплатный курс или покупки платного — доступ откроется автоматически."
        />
        <div className="pb-6 text-center">
          <Link to="/university" className="text-sm font-medium text-brand-blue hover:underline">Открыть каталог курсов</Link>
        </div>
      </WsCard>
    </>
  );
}
