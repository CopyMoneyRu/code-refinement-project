import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import AuthLayout, { FormAlert, SubmitButton } from "@/components/auth/AuthLayout";
import CodeInput from "@/components/auth/CodeInput";
import { resendFn, verifyEmailFn } from "@/lib/auth";

const RESEND_SECONDS = 60;

export default function VerifyCodeStep({ email, sent = true, onBack }: { email: string; sent?: boolean; onBack: () => void }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("");
    if (code.length !== 6) {
      setError("Введите 6 цифр из письма");
      return;
    }
    setError("");
    setLoading(true);
    const r = await verifyEmailFn({ data: { email, code } });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      if (r.error === "too_many_attempts" || r.error === "code_expired") setCode("");
      return;
    }
    await router.invalidate();
    navigate({ to: r.role && r.role !== "user" ? "/admin" : "/cabinet" });
  };

  const resend = async () => {
    setLoading(true);
    const r = await resendFn({ data: { email } });
    setLoading(false);
    setCode("");
    setError("");
    setWait(RESEND_SECONDS);
    setNotice(r.ok ? "Новый код отправлен. Предыдущий код больше не действует." : "Не удалось отправить код. Попробуйте позже.");
  };

  return (
    <AuthLayout title="Подтвердите email" subtitle="Введите код из письма">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <p className="leading-relaxed text-brand-muted">
          Мы отправили 6-значный код на <span className="font-medium text-brand-ink">{email}</span>. Код действует 15 минут. Если письма нет — проверьте папку «Спам».
        </p>
        {!sent && <FormAlert tone="error">Письмо пока не удалось отправить. Нажмите «Отправить код ещё раз» чуть позже.</FormAlert>}
        <CodeInput value={code} onChange={setCode} error={!!error} disabled={loading} />
        {error && <FormAlert tone="error">{error}</FormAlert>}
        {notice && <FormAlert tone="success">{notice}</FormAlert>}
        <SubmitButton loading={loading}>Подтвердить</SubmitButton>
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={onBack} className="text-brand-muted hover:text-brand-ink">
            Изменить email
          </button>
          {wait > 0 ? (
            <span className="text-brand-muted">Отправить снова через {wait} с</span>
          ) : (
            <button type="button" onClick={resend} disabled={loading} className="font-medium text-brand-blue hover:underline disabled:opacity-60">
              Отправить код ещё раз
            </button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
