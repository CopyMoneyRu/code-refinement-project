import { useState } from "react";
import Icon from "@/components/ui/icon";
import { FormAlert } from "@/components/auth/AuthLayout";
import { rememberRedirect } from "@/lib/requireAuth";
import { oauthStartFn, type Provider } from "@/lib/oauth";

const META: Record<Provider, { label: string; badge: string; badgeClass: string }> = {
  google: { label: "Google", badge: "G", badgeClass: "bg-white text-[#4285F4] border border-brand-ink/10" },
};

export default function SocialLogin({ providers, redirectTo }: { providers: Provider[]; redirectTo?: string }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  if (!providers.length) return null;

  const go = async (p: Provider) => {
    setBusy(p);
    setError("");
    const r = await oauthStartFn({ data: { provider: p } });
    if (r.ok) {
      rememberRedirect(redirectTo);
      window.location.href = r.url;
    }
    else {
      setBusy(null);
      setError(r.message);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3">
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy !== null}
            onClick={() => go(p)}
            className="flex h-12 items-center justify-center gap-3 rounded-lg border border-brand-ink/15 bg-white text-[15px] font-medium text-brand-ink transition-colors hover:bg-brand-surface disabled:opacity-60"
          >
            {busy === p ? (
              <Icon name="Loader2" size={18} className="animate-spin" />
            ) : (
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${META[p].badgeClass}`}>{META[p].badge}</span>
            )}
            Продолжить с {META[p].label}
          </button>
        ))}
      </div>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div className="flex items-center gap-4 text-xs uppercase tracking-[0.14em] text-brand-muted">
        <span className="h-px flex-1 bg-brand-ink/10" />
        или по email
        <span className="h-px flex-1 bg-brand-ink/10" />
      </div>
    </div>
  );
}
