import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { AuthField, StageNotice } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Восстановление пароля — JETRA" }, { name: "description", content: "Восстановление доступа к аккаунту JETRA." }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError(ok ? undefined : "Введите корректный email");
    setSent(ok);
  };

  return (
    <AuthLayout title="Восстановление пароля" subtitle="Укажите email — мы отправим ссылку для смены пароля">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <button type="submit" className="h-12 w-full rounded-lg bg-brand-blue font-medium text-white transition-colors hover:bg-[#3271B0]">
          Отправить ссылку
        </button>
        {sent && <StageNotice>Отправка писем подключается на следующем этапе вместе с серверной авторизацией.</StageNotice>}
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        <Link to="/login" className="font-medium text-brand-blue hover:underline">Вернуться ко входу</Link>
      </p>
    </AuthLayout>
  );
}
