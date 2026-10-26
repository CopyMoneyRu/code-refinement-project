import { Link } from "@tanstack/react-router";
import BrandLockup from "@/components/brand/BrandLockup";
import BrandIcon from "@/components/site/BrandIcon";
import Icon from "@/components/ui/icon";
import { COMPANY, LEGAL_DOCS, SOCIALS } from "@/lib/company";

const MAILTO = `mailto:${COMPANY.email}?subject=${encodeURIComponent("Вопрос с сайта JETRA")}`;

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-ink/10 bg-brand-light text-brand-ink">
      <div className="container-x py-14">
        <div className="grid items-start gap-10 text-center md:grid-cols-[1fr_2fr_1fr] md:gap-8">
          <div className="flex flex-col items-center md:items-start md:text-left">
            <BrandLockup size={34} />
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-ink/10 bg-white transition-transform hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <BrandIcon name={s.key} size={19} />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-sm font-semibold">Документы</div>
            <ul className="mt-4 grid gap-3 text-sm text-brand-muted lg:grid-cols-[auto_auto] lg:gap-x-12">
              {LEGAL_DOCS.map((d) => (
                <li key={d.to} className="lg:whitespace-nowrap"><Link to={d.to} className="hover:text-brand-ink">{d.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-end md:text-right">
            <div className="text-sm font-semibold">Контакты</div>
            <a href={MAILTO} className="mt-4 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
              <Icon name="Mail" size={16} className="text-brand-blue" /> {COMPANY.email}
            </a>
            <a
              href={COMPANY.support}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3271B0]"
            >
              <BrandIcon name="telegram" size={16} color="#fff" /> Написать нам
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-brand-ink/10 pt-6 text-center text-xs leading-relaxed text-brand-ink/55">
          <p className="mx-auto max-w-3xl">
            Материалы платформы носят информационный и образовательный характер и не являются индивидуальной инвестиционной рекомендацией.
            Инвестиции связаны с риском потери капитала.{" "}
            <Link to="/disclaimer" className="underline hover:text-brand-ink">Подробнее</Link>
          </p>
          <p className="mt-3">
            © JETRA, 2026 · {COMPANY.short} · ИНН {COMPANY.inn} · ОГРНИП {COMPANY.ogrnip}
          </p>
        </div>
      </div>
    </footer>
  );
}