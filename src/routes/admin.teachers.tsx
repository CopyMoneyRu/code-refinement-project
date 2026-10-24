import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/teachers")({
  component: TeachersAdmin,
});

function TeachersAdmin() {
  return (
    <AdminTable
      title="Преподаватели"
      text="Профили преподавателей и их курсы."
      columns={['Преподаватель', 'Специализация', 'Курсов', 'Статус']}
      addLabel="Добавить преподавателя"
      emptyIcon="UserRound"
      emptyTitle="Преподавателей пока нет"
      emptyText="Добавленные преподаватели будут отображаться на страницах курсов."
    />
  );
}
