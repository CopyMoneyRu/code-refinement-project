import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";
import { requirePermission } from "@/lib/adminGuard";

export const Route = createFileRoute("/admin/strategies")({
  beforeLoad: ({ context }) => requirePermission(context, "strategies"),
  component: StrategiesAdmin,
});

function StrategiesAdmin() {
  return (
    <AdminTable
      title="Стратегии"
      text="Добавление и редактирование инвестиционных стратегий и их разделов."
      columns={["Стратегия", "Раздел", "Фокус", "Горизонт", "Статус"]}
      addLabel="Добавить стратегию"
      emptyIcon="LineChart"
      emptyTitle="Стратегии пока заданы в макете"
      emptyText="Управление стратегиями из админки подключим следующим шагом."
    />
  );
}
