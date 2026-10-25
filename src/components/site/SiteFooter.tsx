import { Link } from "@tanstack/react-router";
import Logo from "@/components/brand/Logo";
import ClubLink from "@/components/site/ClubLink";

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-ink/10 bg-brand-light text-brand-ink">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-muted">
              Технологическая платформа для инвестиций и управления капиталом.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold">Платформа</div>
            <ul className="mt-4 space-y-3 text-sm text-brand-muted">
              <li><Link to="/strategies" className="hover:text-brand-ink">Стратегии</Link></li>
              <li><Link to="/university" className="hover:text-brand-ink">Университет</Link></li>
              <li><ClubLink className="hover:text-brand-ink">Клуб</ClubLink></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Аккаунт</div>
            <ul className="mt-4 space-y-3 text-sm text-brand-muted">
              <li><Link to="/login" className="hover:text-brand-ink">Вход</Link></li>
              <li><Link to="/register" className="hover:text-brand-ink">Регистрация</Link></li>
              <li><Link to="/cabinet" className="hover:text-brand-ink">Личный кабинет</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Управление</div>
            <ul className="mt-4 space-y-3 text-sm text-brand-muted">
              <li><Link to="/admin" className="hover:text-brand-ink">Администрирование</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-brand-ink/10 pt-6 text-xs text-brand-ink/50 md:flex-row">
          <span>© JETRA, 2026</span>
          <span>Материалы платформы не являются индивидуальной инвестиционной рекомендацией.</span>
        </div>
      </div>
    </footer>
  );
}