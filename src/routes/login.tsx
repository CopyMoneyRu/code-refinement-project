import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { AuthField, StageNotice } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вход — JETRA" }, { name: "description", content: "Вход в личный кабинет JETRA." }] }),
  component: LoginPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email)) next.email = "Введите корректный email";
    if (password.length < 8) next.password = "Минимум 8 символов";
    setErrors(next);
    setSent(Object.keys(next).length === 0);
  };

  return (
    <AuthLayout title="Вход" subtitle="Войдите в личный кабинет JETRA">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <AuthField label="Пароль" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-brand-blue hover:underline">Забыли пароль?</Link>
        </div>
        <button type="submit" className="h-12 w-full rounded-lg bg-brand-blue font-medium text-white transition-colors hover:bg-[#3271B0]">
          Войти
        </button>
        {sent && <StageNotice>Серверная авторизация подключается на следующем этапе. Данные не отправлены и нигде не сохранены.</StageNotice>}
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        Нет аккаунта? <Link to="/register" className="font-medium text-brand-blue hover:underline">Зарегистрироваться</Link>
      </p>
    </AuthLayout>
  );
}
