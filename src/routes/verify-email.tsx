import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { FormAlert } from "@/components/auth/AuthLayout";
import Icon from "@/components/ui/icon";
import { verifyEmailFn } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  head: () => ({ meta: [{ title: "Подтверждение email — JETRA" }, { name: "robots", content: "noindex" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setState("error");
      setMessage("Ссылка недействительна.");
      return;
    }
    verifyEmailFn({ data: { token } }).then((r) => {
      if (r.ok) setState("ok");
      else {
        setState("error");
        setMessage(r.message);
      }
    });
  }, [token]);

  return (
    <AuthLayout title="Подтверждение email">
      {state === "loading" && (
        <div className="flex items-center gap-3 text-brand-muted">
          <Icon name="Loader2" size={20} className="animate-spin" /> Проверяем ссылку…
        </div>
      )}
      {state === "ok" && (
        <div className="space-y-6">
          <FormAlert tone="success">Email подтверждён. Теперь вы можете войти в личный кабинет.</FormAlert>
          <Link to="/login" className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue font-medium text-white">
            Войти
          </Link>
        </div>
      )}
      {state === "error" && (
        <div className="space-y-6">
          <FormAlert tone="error">{message}</FormAlert>
          <p className="text-sm text-brand-muted">
            Попробуйте войти — если email не подтверждён, на странице входа можно запросить новое письмо.
          </p>
          <Link to="/login" className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue font-medium text-white">
            Перейти ко входу
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
