import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import PublicLayout from "@/components/site/PublicLayout";
import StrategyView from "@/components/strategies/StrategyView";
import StrategyCard from "@/components/strategies/StrategyCard";
import { getMe } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { previewStrategyFn } from "@/lib/strategies";
import { cn } from "@/lib/utils";

type Mode = "desktop" | "mobile" | "card";

export const Route = createFileRoute("/preview/strategy/$id")({
  validateSearch: (s: Record<string, unknown>): { frame?: 1 } => (s.frame === 1 || s.frame === "1" ? { frame: 1 } : {}),
  beforeLoad: async ({ location }) => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
    if (!isStaff(user.role)) throw redirect({ to: "/cabinet" });
  },
  loader: ({ params }) => previewStrategyFn({ data: { id: Number(params.id) || 0 } }),
  head: () => ({ meta: [{ title: "Предпросмотр стратегии — JETRA" }, { name: "robots", content: "noindex" }] }),
  component: Preview,
});

function Preview() {
  const r = Route.useLoaderData();
  const { frame } = Route.useSearch();
  const { id } = Route.useParams();
  const [mode, setMode] = useState<Mode>("desktop");
  const [src, setSrc] = useState("");

  useEffect(() => {
    setSrc(`${window.location.pathname}?frame=1`);
  }, []);

  if (!r.ok) {
    return <div className="flex min-h-screen items-center justify-center bg-brand-light p-6 text-center text-brand-muted">{r.message}</div>;
  }
  if (frame) {
    return (
      <PublicLayout>
        <StrategyView s={r.strategy} blocks={r.blocks} preview />
      </PublicLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#E9EEF5]">
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-brand-ink/10 bg-brand-navy px-4 py-2.5 text-white">
        <Icon name="Eye" size={17} className="text-sky-300" />
        <span className="text-sm">
          Предпросмотр черновика · <span className="font-medium">{r.strategy.title}</span>
        </span>
        <span className="flex-1" />
        <div className="inline-flex gap-1 rounded-lg bg-white/10 p-1">
          {(
            [
              ["desktop", "Компьютер", "Monitor"],
              ["mobile", "Телефон", "Smartphone"],
              ["card", "Карточка", "LayoutGrid"],
            ] as const
          ).map(([m, l, ic]) => (
            <button key={m} onClick={() => setMode(m)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", mode === m ? "bg-white text-brand-ink" : "text-white/75 hover:text-white")}>
              <Icon name={ic} size={15} /> <span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>
        <a href={`/admin/strategies/${id}`} className="text-sm text-white/75 hover:text-white">
          К редактору
        </a>
      </div>
      {mode === "card" ? (
        <div className="mx-auto max-w-sm p-8">
          <StrategyCard s={r.strategy} preview />
        </div>
      ) : mode === "mobile" ? (
        <div className="flex justify-center p-6">
          <div className="overflow-hidden rounded-[2.2rem] border-[10px] border-brand-navy bg-white shadow-2xl">
            {src && <iframe src={src} title="Телефон" className="h-[760px] w-[390px] bg-white" />}
          </div>
        </div>
      ) : (
        <PublicLayout>
          <StrategyView s={r.strategy} blocks={r.blocks} preview />
        </PublicLayout>
      )}
    </div>
  );
}
