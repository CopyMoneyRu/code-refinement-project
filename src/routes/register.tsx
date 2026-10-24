import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { AuthField, StageNotice } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Регистрация — JETRA" }, { name: "description", content: "Создайте аккаунт на платформе JETRA." }] }),
  component: RegisterPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Укажите имя";
    if (!EMAIL_RE.test(form.email)) next.email = "Введите корректный email";
    if (form.password.length < 8) next.password = "Минимум 8 символов";
    if (form.confirm !== form.password) next.confirm = "Пароли не совпадают";
    if (!agree) next.agree = "Необходимо согласие";
    setErrors(next);
    setSent(Object.keys(next).length === 0);
  };

  return (
    <AuthLayout title="Регистрация" subtitle="Создайте аккаунт по email и паролю">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Имя" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={form.email} onChange={set("email")} error={errors.email} />
        <AuthField label="Пароль" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} />
        <AuthField label="Повторите пароль" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <label className="flex items-start gap-3 text-sm text-brand-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#397FC4]" />
          <span>Я принимаю условия использования и политику обработки персональных данных</span>
        </label>
        {errors.agree && <span className="block text-sm text-red-600">{errors.agree}</span>}
        <button type="submit" className="h-12 w-full rounded-lg bg-brand-blue font-medium text-white transition-colors hover:bg-[#3271B0]">
          Создать аккаунт
        </button>
        {sent && (
          <StageNotice>
            Регистрация с подтверждением email подключается на следующем этапе. Данные не отправлены и нигде не сохранены.
          </StageNotice>
        )}
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        Уже есть аккаунт? <Link to="/login" className="font-medium text-brand-blue hover:underline">Войти</Link>
      </p>
    </AuthLayout>
  );
}
