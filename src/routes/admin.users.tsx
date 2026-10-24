import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  return (
    <AdminTable
      title="Пользователи"
      text="Зарегистрированные пользователи и их роли."
      columns={['Пользователь', 'Email', 'Роль', 'Email подтверждён', 'Регистрация']}
      emptyIcon="Users"
      emptyTitle="Пользователей пока нет"
      emptyText="Список появится после подключения серверной регистрации."
    />
  );
}
