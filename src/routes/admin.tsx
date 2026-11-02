import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import WorkspaceLayout, { type NavItem } from "@/components/workspace/WorkspaceLayout";
import { getMe } from "@/lib/auth";
import { ADMIN_SECTIONS, sectionVisible } from "@/lib/adminSections";
import { can, isStaff } from "@/lib/permissions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Администрирование — JETRA" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/login" });
    if (!isStaff(user.role)) throw redirect({ to: "/cabinet" });
    return { user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  const items: NavItem[] = [
    { to: "/admin", label: "Обзор", icon: "LayoutDashboard", exact: true },
    ...ADMIN_SECTIONS.filter((s) => sectionVisible(user, s)),
  ];
  return (
    <WorkspaceLayout section="Администрирование" items={items} user={user}>
      <Outlet />
    </WorkspaceLayout>
  );
}
