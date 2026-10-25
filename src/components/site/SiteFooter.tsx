import { Link } from "@tanstack/react-router";
import Logo from "@/components/brand/Logo";
import ClubLink from "@/components/site/ClubLink";
import BrandIcon from "@/components/site/BrandIcon";
import Icon from "@/components/ui/icon";
import { COMPANY, LEGAL_DOCS, SOCIALS } from "@/lib/company";

const MAILTO = `mailto:${COMPANY.email}?subject=${encodeURIComponent("Вопрос с сайта JETRA")}`;

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-ink/10 bg-brand-light text-brand-ink">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-muted">
              Технологическая платформа для инвестиций и управления капиталом.
            </p>
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
          <div>
            <div className="text-sm font-semibold">Платформа</div>
            <ul className="mt-4 space-y-3 text-sm text-brand-muted">
              <li><Link to="/strategies" className="hover:text-brand-ink">Стратегии</Link></li>
              <li><Link to="/university" className="hover:text-brand-ink">Университет</Link></li>
              <li><ClubLink className="hover:text-brand-ink">Клуб</ClubLink></li>
              <li><Link to="/cabinet" className="hover:text-brand-ink">Личный кабинет</Link></li>
              <li><Link to="/admin" className="hover:text-brand-ink">Администрирование</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Документы</div>
            <ul className="mt-4 space-y-3 text-sm text-brand-muted">
              {LEGAL_DOCS.map((d) => (
                <li key={d.to}><Link to={d.to} className="hover:text-brand-ink">{d.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Контакты</div>
            <ul className="mt-4 space-y-3 text-sm text-brand-muted">
              <li>
                <a href={MAILTO} className="inline-flex items-center gap-2 hover:text-brand-ink">
                  <Icon name="Mail" size={16} className="text-brand-blue" /> {COMPANY.email}
                </a>
              </li>
              <li>
                <a href={COMPANY.phoneHref} className="inline-flex items-center gap-2 hover:text-brand-ink">
                  <Icon name="Phone" size={16} className="text-brand-blue" /> {COMPANY.phone}
                </a>
              </li>
            </ul>
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

        <div className="mt-12 grid gap-4 border-t border-brand-ink/10 pt-6 text-xs leading-relaxed text-brand-ink/55 md:grid-cols-2">
          <div>
            {COMPANY.short}
            <br />
            ИНН {COMPANY.inn} · ОГРНИП {COMPANY.ogrnip}
            <br />
            {COMPANY.address}
          </div>
          <div className="md:text-right">
            Материалы платформы носят информационный и образовательный характер и не являются индивидуальной инвестиционной рекомендацией.
            Инвестиции связаны с риском потери капитала.{" "}
            <Link to="/disclaimer" className="underline hover:text-brand-ink">Подробнее</Link>
            <div className="mt-2">© JETRA, 2026</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
