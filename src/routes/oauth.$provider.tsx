import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import AuthLayout, { FormAlert } from "@/components/auth/AuthLayout";
import Icon from "@/components/ui/icon";
import { oauthFinishFn } from "@/lib/oauth";

export const Route = createFileRoute("/oauth/$provider")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : "",
    state: typeof s.state === "string" ? s.state : "",
    error: typeof s.error === "string" ? s.error : "",
  }),
  beforeLoad: ({ params }) => {
    if (params.provider !== "google") throw notFound();
  },
  head: () => ({ meta: [{ title: "Вход — JETRA" }, { name: "robots", content: "noindex" }] }),
  component: OAuthCallback,
});

function OAuthCallback() {
  const { provider } = Route.useParams();
  const { code, state, error } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (error || !code) {
      setMessage("Вход отменён. Попробуйте ещё раз или войдите по email.");
      return;
    }
    oauthFinishFn({ data: { provider: "google", code, state } }).then(async (r) => {
      if (!r.ok) return setMessage(r.message);
      await router.invalidate();
      navigate({ to: r.role === "user" ? "/cabinet" : "/admin", replace: true });
    });
  }, [provider, code, state, error, navigate, router]);

  return (
    <AuthLayout title="Вход в JETRA">
      {message ? (
        <div className="space-y-6">
          <FormAlert tone="error">{message}</FormAlert>
          <Link to="/login" className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue font-medium text-white">
            Вернуться ко входу
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-brand-muted">
          <Icon name="Loader2" size={20} className="animate-spin" /> Выполняем вход…
        </div>
      )}
    </AuthLayout>
  );
}
