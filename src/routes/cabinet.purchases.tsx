import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";

export const Route = createFileRoute("/cabinet/purchases")({
  component: PurchasesPage,
});

function PurchasesPage() {
  return (
    <>
      <WsTitle title="История покупок" text="Оплаченные обучения и статусы платежей." />
      <WsCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-ink/[0.08] text-brand-muted">
            <tr>
              {["Дата", "Обучение", "Сумма", "Статус", "Доступ"].map((h) => (
                <th key={h} className="px-6 py-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
        </table>
        <EmptyState icon="Receipt" title="Покупок пока нет" text="После оплаты обучения здесь появится запись, а доступ к нему откроется автоматически." />
      </WsCard>
    </>
  );
}
