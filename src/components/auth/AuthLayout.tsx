import type { ReactNode } from "react";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/icon";

export function AuthField({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-brand-ink">{label}</span>
      <input
        {...props}
        className="mt-2 h-12 w-full rounded-lg border border-brand-ink/15 bg-white px-4 text-[15px] text-brand-ink placeholder:text-brand-muted/60 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
      />
      {error && <span className="mt-1.5 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

export function StageNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-brand-blue/25 bg-brand-blue/[0.06] p-4 text-sm leading-relaxed text-brand-ink">
      <Icon name="Info" size={18} className="mt-0.5 shrink-0 text-brand-blue" />
      <span>{children}</span>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between bg-brand-navy p-12 text-brand-snow lg:flex">
        <Logo />
        <div>
          <h2 className="max-w-md font-display text-[44px] font-light leading-[1.1]">
            Капитал под <span className="font-bold">управлением</span> технологий
          </h2>
          <p className="mt-5 max-w-sm text-brand-snow/55">Инвестиционные стратегии и обучение JETRA University на одной платформе.</p>
        </div>
        <div className="text-xs text-brand-snow/35">© JETRA, 2026</div>
      </aside>
      <main className="flex flex-col bg-brand-light px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo tone="light" />
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-3xl font-bold text-brand-ink">{title}</h1>
          {subtitle && <p className="mt-3 text-brand-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
