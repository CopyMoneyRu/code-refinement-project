import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export function PageIntro({ eyebrow, title, text, children }: { eyebrow: string; title: ReactNode; text?: string; children?: ReactNode }) {
  return (
    <section className="pb-10 pt-14 md:pb-14 md:pt-20">
      <div className="container-x">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-light leading-[1.1] tracking-[-0.01em] text-brand-ink md:text-[56px]">
          {title}
        </h1>
        {text && <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-brand-muted">{text}</p>}
        {children}
      </div>
    </section>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-light text-brand-ink">
      <SiteHeader />
      <main className="relative flex-1">
        <SectionMark />
        <div className="relative">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

const SECTIONS = [
  { prefix: "/strategies", label: "Стратегии", text: "Инвестиционные стратегии", icon: "LineChart", bg: "TrendingUp" },
  { prefix: "/university", label: "Университет", text: "Обучение инвестициям", icon: "GraduationCap", bg: "BookOpen" },
];

function SectionMark() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = SECTIONS.find((s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`));
  if (!section) return null;
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/[0.07] to-transparent" />
        <Icon name={section.bg} size={380} strokeWidth={1} className="absolute -right-16 -top-10 text-brand-blue/[0.06] md:right-8" />
      </div>
      <div className="container-x relative pt-8 md:pt-10">
        <div className="inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue text-white shadow-sm">
            <Icon name={section.icon} size={22} />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-tight text-brand-ink">{section.label}</span>
            <span className="block text-sm text-brand-muted">{section.text}</span>
          </span>
        </div>
      </div>
    </>
  );
}
