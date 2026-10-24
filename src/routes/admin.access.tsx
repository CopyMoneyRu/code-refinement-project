import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/access")({
  component: AccessAdmin,
});

function AccessAdmin() {
  return (
    <AdminTable
      title="Управление доступами"
      text="Выдача и отзыв доступа к курсам."
      columns={['Пользователь', 'Курс', 'Источник', 'Открыт', 'Действует до']}
      addLabel="Выдать доступ"
      emptyIcon="KeyRound"
      emptyTitle="Выданных доступов нет"
      emptyText="Доступ открывается автоматически после оплаты или вручную администратором."
    />
  );
}
