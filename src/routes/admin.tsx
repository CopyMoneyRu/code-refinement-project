import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import WorkspaceLayout, { type NavItem } from "@/components/workspace/WorkspaceLayout";
import { getMe } from "@/lib/auth";

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Обзор", icon: "LayoutDashboard", exact: true },
  { to: "/admin/users", label: "Пользователи", icon: "Users" },
  { to: "/admin/courses", label: "Курсы", icon: "GraduationCap" },
  { to: "/admin/lessons", label: "Уроки", icon: "PlayCircle" },
  { to: "/admin/teachers", label: "Преподаватели", icon: "UserRound" },
  { to: "/admin/purchases", label: "Покупки", icon: "Receipt" },
  { to: "/admin/access", label: "Доступы", icon: "KeyRound" },
];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Администрирование — JETRA" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/login" });
    if (user.role !== "admin") throw redirect({ to: "/cabinet" });
    return { user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return (
    <WorkspaceLayout section="Администрирование" items={ADMIN_NAV} user={user}>
      <Outlet />
    </WorkspaceLayout>
  );
}
