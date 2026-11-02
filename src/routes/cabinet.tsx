import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import WorkspaceLayout, { type NavItem } from "@/components/workspace/WorkspaceLayout";
import { getMe } from "@/lib/auth";

const CABINET_NAV: NavItem[] = [
  { to: "/cabinet", label: "Главная", icon: "LayoutDashboard", exact: true },
  { to: "/cabinet/strategies", label: "Мои стратегии", icon: "LineChart" },
  { to: "/cabinet/courses", label: "Мои обучения", icon: "GraduationCap" },
  { to: "/cabinet/progress", label: "Прогресс", icon: "BarChart3" },
  { to: "/cabinet/purchases", label: "История покупок", icon: "Receipt" },
  { to: "/cabinet/settings", label: "Профиль и настройки", icon: "Settings" },
];

export const Route = createFileRoute("/cabinet")({
  head: () => ({ meta: [{ title: "Личный кабинет — JETRA" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return (
    <WorkspaceLayout section="Личный кабинет" items={CABINET_NAV} user={user}>
      <Outlet />
    </WorkspaceLayout>
  );
}
