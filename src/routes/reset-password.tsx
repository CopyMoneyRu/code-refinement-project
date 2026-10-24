import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { AuthField, FormAlert, SubmitButton } from "@/components/auth/AuthLayout";
import { resetPasswordFn } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  head: () => ({ meta: [{ title: "Новый пароль — JETRA" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Минимум 8 символов";
    else if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) next.password = "Пароль должен содержать буквы и цифры";
    if (confirm !== password) next.confirm = "Пароли не совпадают";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    const r = await resetPasswordFn({ data: { token, password } });
    setLoading(false);
    if (!r.ok) setFormError(r.message);
    else setDone(true);
  };

  if (!token) {
    return (
      <AuthLayout title="Ссылка недействительна" subtitle="Запросите восстановление пароля ещё раз">
        <Link to="/forgot-password" className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue font-medium text-white">
          Восстановить пароль
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Пароль изменён" subtitle="Теперь войдите с новым паролем">
        <FormAlert tone="success">Пароль успешно обновлён. Все прежние сессии завершены.</FormAlert>
        <Link to="/login" className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue font-medium text-white">
          Войти
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Новый пароль" subtitle="Придумайте новый пароль для входа в JETRA">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Новый пароль" type="password" autoComplete="new-password" placeholder="Не менее 8 символов, буквы и цифры" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <AuthField label="Повторите пароль" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        {formError && (
          <FormAlert tone="error">
            {formError} <Link to="/forgot-password" className="font-medium underline">Запросить снова</Link>
          </FormAlert>
        )}
        <SubmitButton loading={loading}>Сохранить пароль</SubmitButton>
      </form>
    </AuthLayout>
  );
}
