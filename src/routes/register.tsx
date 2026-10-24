import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import AuthLayout, { AuthField, FormAlert, SubmitButton } from "@/components/auth/AuthLayout";
import Icon from "@/components/ui/icon";
import { getMe, registerFn, resendFn } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Регистрация — JETRA" }, { name: "description", content: "Создайте аккаунт на платформе JETRA." }] }),
  beforeLoad: async () => {
    const user = await getMe();
    if (user) throw redirect({ to: user.role === "admin" ? "/admin" : "/cabinet" });
  },
  component: RegisterPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ email: string; sent: boolean } | null>(null);
  const [resent, setResent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Укажите имя";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Введите корректный email";
    if (form.password.length < 8) next.password = "Минимум 8 символов";
    else if (!/[A-Za-zА-Яа-я]/.test(form.password) || !/\d/.test(form.password)) next.password = "Пароль должен содержать буквы и цифры";
    if (form.confirm !== form.password) next.confirm = "Пароли не совпадают";
    if (!agree) next.agree = "Необходимо согласие";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    const r = await registerFn({ data: { name: form.name.trim(), email: form.email.trim(), password: form.password } });
    setLoading(false);
    if (!r.ok) {
      setFormError(r.message);
      return;
    }
    setDone({ email: form.email.trim(), sent: r.emailSent !== false });
  };

  if (done) {
    return (
      <AuthLayout title="Подтвердите email" subtitle="Остался один шаг до входа в кабинет">
        <div className="space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-blue">
            <Icon name="MailCheck" size={28} />
          </div>
          {done.sent ? (
            <p className="leading-relaxed text-brand-muted">
              Мы отправили письмо на <span className="font-medium text-brand-ink">{done.email}</span>. Перейдите по ссылке в письме,
              чтобы подтвердить адрес и войти. Если письма нет — проверьте папку «Спам».
            </p>
          ) : (
            <FormAlert tone="error">
              Аккаунт создан, но письмо пока не удалось отправить: почтовый сервис ещё не настроен. Попробуйте отправить письмо позже.
            </FormAlert>
          )}
          {resent && <FormAlert tone="success">Письмо отправлено повторно.</FormAlert>}
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const r = await resendFn({ data: { email: done.email } });
              setLoading(false);
              setResent(r.ok);
            }}
            className="text-sm font-medium text-brand-blue hover:underline disabled:opacity-60"
          >
            Отправить письмо ещё раз
          </button>
          <Link to="/login" className="flex h-12 w-full items-center justify-center rounded-lg border border-brand-ink/15 bg-white font-medium text-brand-ink hover:bg-brand-surface">
            Перейти ко входу
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Регистрация" subtitle="Создайте аккаунт по email и паролю">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Имя" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={form.email} onChange={set("email")} error={errors.email} />
        <AuthField label="Пароль" type="password" autoComplete="new-password" placeholder="Не менее 8 символов, буквы и цифры" value={form.password} onChange={set("password")} error={errors.password} />
        <AuthField label="Повторите пароль" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <label className="flex items-start gap-3 text-sm text-brand-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#397FC4]" />
          <span>Я принимаю условия использования и политику обработки персональных данных</span>
        </label>
        {errors.agree && <span className="block text-sm text-red-600">{errors.agree}</span>}
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <SubmitButton loading={loading}>Создать аккаунт</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        Уже есть аккаунт? <Link to="/login" className="font-medium text-brand-blue hover:underline">Войти</Link>
      </p>
    </AuthLayout>
  );
}
