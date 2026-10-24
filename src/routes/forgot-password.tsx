import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { AuthField, FormAlert, SubmitButton } from "@/components/auth/AuthLayout";
import { forgotFn } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Восстановление пароля — JETRA" }, { name: "description", content: "Восстановление доступа к аккаунту JETRA." }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setError(ok ? undefined : "Введите корректный email");
    setFormError("");
    if (!ok) return;
    setLoading(true);
    const r = await forgotFn({ data: { email: email.trim() } });
    setLoading(false);
    if (!r.ok) setFormError(r.message);
    else setSent(true);
  };

  return (
    <AuthLayout title="Восстановление пароля" subtitle="Укажите email — мы отправим ссылку для смены пароля">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        {sent && (
          <FormAlert tone="success">
            Если аккаунт с таким email существует, мы отправили на него ссылку для смены пароля. Ссылка действует 1 час.
          </FormAlert>
        )}
        <SubmitButton loading={loading}>Отправить ссылку</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        <Link to="/login" className="font-medium text-brand-blue hover:underline">Вернуться ко входу</Link>
      </p>
    </AuthLayout>
  );
}
