import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pay/result")({
  validateSearch: (s: Record<string, unknown>) => ({ InvId: Number(s.InvId) || 0 }),
  beforeLoad: ({ search }) => {
    if (search.InvId) throw redirect({ to: "/pay/$orderId", params: { orderId: String(search.InvId) } });
    throw redirect({ to: "/cabinet/purchases" });
  },
});
