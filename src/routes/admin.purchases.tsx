import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/purchases")({
  component: PurchasesAdmin,
});

function PurchasesAdmin() {
  return (
    <AdminTable
      title="Покупки"
      text="Платежи пользователей и их статусы."
      columns={['Дата', 'Пользователь', 'Курс', 'Сумма', 'Статус оплаты']}
      emptyIcon="Receipt"
      emptyTitle="Покупок пока нет"
      emptyText="Платежи появятся после подключения платёжной системы."
    />
  );
}
