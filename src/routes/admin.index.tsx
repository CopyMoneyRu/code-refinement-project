import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ADMIN_SECTIONS, sectionVisible } from "@/lib/adminSections";
import { can, ROLE_LABEL } from "@/lib/permissions";
import Icon from "@/components/ui/icon";
import { WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import OverviewBlock from "@/components/analytics/OverviewBlock";
import { overviewFn } from "@/lib/analytics";

export const Route = createFileRoute("/admin/")({
  loader: () => overviewFn(),
  component: AdminHome,
});

const adminApi = getRouteApi("/admin");

function AdminHome() {
  const { user } = adminApi.useRouteContext();
  const sections = ADMIN_SECTIONS.filter((s) => sectionVisible(user, s));
  const overview = Route.useLoaderData();
  return (
    <>
      <WsTitle title="Административная панель" text={`Ваша роль: ${ROLE_LABEL[user.role]}. Доступные разделы платформы.`} />
      {overview && <OverviewBlock data={overview} />}
      {!sections.length && (
        <WsCard>
          <p className="text-brand-muted">Вам пока не назначены права. Обратитесь к супер администратору.</p>
        </WsCard>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="group">
            <WsCard className="h-full transition-colors group-hover:border-brand-blue/40">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                <Icon name={s.icon} size={20} />
              </div>
              <div className="mt-5 font-display text-lg font-semibold">{s.label}</div>
              <p className="mt-1.5 text-sm text-brand-muted">{s.text}</p>
            </WsCard>
          </Link>
        ))}
      </div>
    </>
  );
}
