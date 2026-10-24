import { createFileRoute, Outlet } from "@tanstack/react-router";
import WorkspaceLayout, { type NavItem } from "@/components/workspace/WorkspaceLayout";

const CABINET_NAV: NavItem[] = [
  { to: "/cabinet", label: "Главная", icon: "LayoutDashboard", exact: true },
  { to: "/cabinet/courses", label: "Мои курсы", icon: "GraduationCap" },
  { to: "/cabinet/learn", label: "Просмотр уроков", icon: "PlayCircle" },
  { to: "/cabinet/progress", label: "Прогресс", icon: "BarChart3" },
  { to: "/cabinet/purchases", label: "История покупок", icon: "Receipt" },
  { to: "/cabinet/settings", label: "Профиль и настройки", icon: "Settings" },
];

export const Route = createFileRoute("/cabinet")({
  head: () => ({ meta: [{ title: "Личный кабинет — JETRA" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <WorkspaceLayout section="Личный кабинет" items={CABINET_NAV}>
      <Outlet />
    </WorkspaceLayout>
  ),
});