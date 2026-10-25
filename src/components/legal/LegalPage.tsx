import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import { COMPANY, DOC_DATE, LEGAL_DOCS } from "@/lib/company";

const linkify = (text: string): ReactNode[] =>
  text.split(/(info\.jetra@gmail\.com|https:\/\/jetra\.ru)/g).map((part, i) =>
    part === COMPANY.email ? (
      <a key={i} href={`mailto:${COMPANY.email}`} className="text-brand-blue hover:underline">
        {part}
      </a>
    ) : part === COMPANY.site ? (
      <a key={i} href={COMPANY.site} className="text-brand-blue hover:underline">
        {part}
      </a>
    ) : (
      part
    ),
  );

function Body({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines[0].startsWith("## ")) {
          return (
            <h2 key={i} className="mt-10 font-display text-xl font-semibold text-brand-ink first:mt-0">
              {lines[0].slice(3)}
            </h2>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="mt-4 list-disc space-y-1.5 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{linkify(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mt-4">
            {linkify(lines.join(" "))}
          </p>
        );
      })}
    </>
  );
}

export default function LegalPage({ title, text, current }: { title: string; text: string; current: string }) {
  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_280px]">
          <article className="max-w-3xl text-[15px] leading-relaxed text-brand-ink/85">
            <h1 className="font-display text-3xl font-semibold leading-tight text-brand-ink md:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-brand-muted">Редакция от {DOC_DATE}</p>
            <div className="mt-6 rounded-xl border border-brand-ink/[0.08] bg-white p-5 text-sm leading-relaxed">
              <div className="font-medium text-brand-ink">Оператор и исполнитель</div>
              <div className="mt-2 text-brand-muted">
                {COMPANY.name}
                <br />
                ИНН: {COMPANY.inn} · ОГРНИП: {COMPANY.ogrnip}
                <br />
                Адрес регистрации: {COMPANY.address}
                <br />
                Email:{" "}
                <a href={`mailto:${COMPANY.email}`} className="text-brand-blue hover:underline">
                  {COMPANY.email}
                </a>{" "}
                · Телефон:{" "}
                <a href={COMPANY.phoneHref} className="text-brand-blue hover:underline">
                  {COMPANY.phone}
                </a>
              </div>
            </div>
            <div className="mt-10">
              <Body text={text} />
            </div>
          </article>
          <aside className="lg:pt-2">
            <div className="sticky top-28 rounded-xl border border-brand-ink/[0.08] bg-white p-5">
              <div className="text-sm font-semibold">Документы</div>
              <ul className="mt-3 space-y-2.5 text-sm">
                {LEGAL_DOCS.map((d) => (
                  <li key={d.to}>
                    <Link to={d.to} className={d.to === current ? "font-medium text-brand-blue" : "text-brand-muted hover:text-brand-ink"}>
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
