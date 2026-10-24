import { requirePermission } from "@/lib/adminGuard";
import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/teachers")({
  beforeLoad: ({ context }) => requirePermission(context, "authors"),
  component: TeachersAdmin,
});

function TeachersAdmin() {
  return (
    <AdminTable
      title="Авторы"
      text="Профили авторов курсов и преподавателей."
      columns={['Автор', 'Специализация', 'Курсов', 'Статус']}
      addLabel="Добавить автора"
      emptyIcon="UserRound"
      emptyTitle="Авторов пока нет"
      emptyText="Добавленные авторы будут отображаться в каталоге курсов."
    />
  );
}
