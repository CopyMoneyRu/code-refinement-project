import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { fmtDate, myOrdersFn, ORDER_STATUS, PURPOSE_LABEL, rub } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/purchases")({
  loader: () => myOrdersFn(),
  component: PurchasesPage,
});

function PurchasesPage() {
  const r = Route.useLoaderData();
  const orders = r.ok ? r.orders : [];
  return (
    <>
      <WsTitle title="История покупок" text="Заказы, оплаты, продления и возвраты по стратегиям и обучениям." />
      <WsCard className="overflow-x-auto p-0">
        {orders.length ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-brand-ink/[0.08] text-brand-muted">
              <tr>{["Дата", "Заказ", "Сумма", "Статус", ""].map((h) => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/[0.06]">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-brand-muted">{fmtDate(o.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{o.title}</div>
                    <div className="text-xs text-brand-muted">
                      №{o.id} · {PURPOSE_LABEL[o.purpose]}
                      {o.isTest && " · тестовый платёж"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {o.amount > 0 ? rub(o.amount) : "Бесплатно"}
                    {o.refundedAmount > 0 && <div className="text-xs text-violet-700">возврат {rub(o.refundedAmount)}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ORDER_STATUS[o.status].cls)}>{ORDER_STATUS[o.status].label}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {o.productType === "strategy" && (
                      <Link to="/pay/$orderId" params={{ orderId: String(o.id) }} className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline">
                        {o.status === "pending" ? "Оплатить" : "Подробнее"} <Icon name="ChevronRight" size={14} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="Receipt" title="Покупок пока нет" text="После оплаты здесь появится запись, а доступ откроется автоматически." />
        )}
      </WsCard>
    </>
  );
}
