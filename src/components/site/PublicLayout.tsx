import type { ReactNode } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export function PageIntro({ eyebrow, title, text, children }: { eyebrow: string; title: ReactNode; text?: string; children?: ReactNode }) {
  return (
    <section className="pb-10 pt-14 md:pb-14 md:pt-20">
      <div className="container-x">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-light leading-[1.1] tracking-[-0.01em] text-brand-snow md:text-[56px]">
          {title}
        </h1>
        {text && <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-brand-snow/60">{text}</p>}
        {children}
      </div>
    </section>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-navy text-brand-snow">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
