import type { ReactNode } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import ClubLink from "@/components/site/ClubLink";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import CapitalCalculator from "./CapitalCalculator";
import PortfolioShowcase from "./PortfolioShowcase";
import { CommunityArt, EducationArt, HeroArt, PortfolioArt } from "./Illustrations";

const rootApi = getRouteApi("__root__");


const STEPS = [
  { title: "Зарегистрируйтесь", text: "Создайте бесплатный личный кабинет JETRA.", icon: "UserPlus" },
  { title: "Выберите стратегии", text: "Ознакомьтесь с направлениями инвестирования и выберите интересующие вас решения.", icon: "LineChart" },
  { title: "Начните формировать капитал", text: "Используйте доступные инструменты платформы и следите за появлением новых возможностей.", icon: "Sprout" },
];

const TRUST = [
  { title: "Контроль", text: "Вы самостоятельно принимаете решения о своём капитале.", icon: "SlidersHorizontal" },
  { title: "Прозрачность", text: "Изучайте условия, особенности и риски инвестиционных направлений.", icon: "Eye" },
  { title: "Знания", text: "Принимайте решения на основе финансовой грамотности и доступной информации.", icon: "BookOpen" },
];

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3.5 text-[16px] font-medium text-white shadow-[0_12px_30px_-12px_rgba(57,127,196,0.8)] transition-colors hover:bg-[#3271B0]";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-brand-ink/15 bg-white/70 px-6 py-3.5 text-[16px] font-medium text-brand-ink transition-colors hover:border-brand-blue/40";

function StartLink({ className, children }: { className: string; children: ReactNode }) {
  const user = rootApi.useLoaderData();
  return (
    <Link to={user ? "/cabinet" : "/register"} className={className}>
      {children}
    </Link>
  );
}

function SectionHead({ title, text, center, wide }: { title: ReactNode; text?: string; center?: boolean; wide?: boolean }) {
  return (
    <div className={cn(center ? "mx-auto max-w-2xl text-center" : "max-w-2xl", wide && "max-w-none")}>
      <h2 className="font-display text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-brand-ink md:text-[44px]">{title}</h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-brand-muted">{text}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="container-x relative grid items-center gap-10 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-brand-ink sm:text-5xl lg:text-[64px]">
            <img src="/brand/jetra-wordmark.png" alt="JETRA" width={866} height={155} className="inline-block h-[0.72em] w-auto align-baseline" /> — экосистема для создания и&nbsp;роста капитала
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-muted">
            Инвестиционные стратегии, финансовое образование и сообщество инвесторов — в одной платформе.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <StartLink className={btnPrimary}>
              Начать <Icon name="ArrowRight" size={18} />
            </StartLink>
            <a
              href="#ecosystem"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("ecosystem")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={btnGhost}
            >
              Узнать больше <Icon name="ArrowDown" size={18} />
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute inset-6 rounded-[40px] bg-gradient-to-br from-brand-blue/25 to-transparent blur-2xl" />
          <HeroArt className="relative aspect-square w-full rounded-[32px] shadow-[0_40px_90px_-40px_rgba(23,38,60,0.45)]" />
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl backdrop-blur sm:left-[-24px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Icon name="Layers" size={20} />
            </span>
            <span className="text-sm font-medium leading-tight text-brand-ink">
              Стратегии · Обучение
              <br />
              <span className="text-brand-muted">Сообщество</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function EcoCard({ art: Art, title, text, cta, icon, wrap }: { art: (p: { className?: string }) => ReactNode; title: string; text: string; cta: string; icon: string; wrap: (cls: string, children: ReactNode) => ReactNode }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-[24px] border border-brand-ink/[0.06] bg-white transition-shadow hover:shadow-[0_30px_60px_-35px_rgba(23,38,60,0.4)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Art className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-brand-blue shadow-sm backdrop-blur">
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-brand-ink">{title}</h3>
        <p className="mt-3 flex-1 text-[15px] leading-relaxed text-brand-muted">{text}</p>
        {wrap(
          "mt-6 inline-flex items-center gap-2 self-start text-[15px] font-medium text-brand-blue transition-colors hover:text-brand-ink",
          <>
            {cta} <Icon name="ArrowRight" size={17} className="transition-transform group-hover:translate-x-1" />
          </>,
        )}
      </div>
    </div>
  );
}

function Ecosystem() {
  return (
    <section id="ecosystem" className="scroll-mt-24 py-16 md:py-24">
      <div className="container-x">
        <SectionHead wide title="Всё для капитала в одном месте." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <EcoCard
            art={PortfolioArt}
            icon="PieChart"
            title="Стратегии"
            text="Изучайте различные подходы к инвестированию и выбирайте направления, соответствующие вашим целям."
            cta="Смотреть стратегии"
            wrap={(cls, ch) => <Link to="/strategies" className={cls}>{ch}</Link>}
          />
          <EcoCard
            art={EducationArt}
            icon="GraduationCap"
            title="Университет"
            text="Получайте знания от инвесторов, экспертов и авторов образовательных программ."
            cta="Перейти к обучению"
            wrap={(cls, ch) => <Link to="/university" className={cls}>{ch}</Link>}
          />
          <EcoCard
            art={CommunityArt}
            icon="Users"
            title="Сообщество"
            text="Общайтесь с единомышленниками, изучайте инвестиционные идеи и развивайте финансовое мышление."
            cta="Подробнее"
            wrap={(cls, ch) => <ClubLink className={cls}>{ch}</ClubLink>}
          />
        </div>
      </div>
    </section>
  );
}

function Markets() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-x">
        <SectionHead
          title={
            <>
              Разные рынки.
              <br />
              Разные возможности.
            </>
          }
          text="Исследуйте инвестиционные направления и находите подходящие решения для своего капитала." />
        <PortfolioShowcase />
      </div>
    </section>
  );
}

function Calculator() {
  return (
    <section id="calculator" className="py-16 md:py-24">
      <div className="container-x">
        <SectionHead center title="Рассчитайте потенциал вашего капитала" />
        <div className="mt-10 md:mt-12">
          <CapitalCalculator />
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-x">
        <SectionHead center title="Начните создавать капитал с JETRA" />
        <div className="relative mt-12 grid gap-5 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-brand-blue/0 via-brand-blue/40 to-brand-blue/0 md:block" />
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-[22px] bg-brand-light p-6 text-center md:bg-transparent md:p-4">
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-[0_14px_30px_-14px_rgba(57,127,196,0.9)]">
                <Icon name={s.icon} size={26} />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-ink text-xs font-semibold text-white">{i + 1}</span>
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold text-brand-ink">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-brand-muted">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <StartLink className={btnPrimary}>
            Создать аккаунт <Icon name="ArrowRight" size={18} />
          </StartLink>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-x">
        <SectionHead center title="Капитал требует осознанного подхода" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-3">
          {TRUST.map((t) => (
            <div key={t.title} className="rounded-[20px] border border-brand-ink/[0.07] bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Icon name={t.icon} size={21} />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-brand-ink">{t.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-brand-muted">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="pb-20 md:pb-28">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[32px] border border-brand-ink/[0.06] bg-white px-6 py-14 text-center shadow-[0_30px_80px_-40px_rgba(23,38,60,0.35)] sm:px-12 md:py-20">
          <div aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-[#8EC3F0]/20 blur-3xl" />
          <img src="/brand/jetra-mark.png" alt="" className="relative mx-auto h-14 w-auto" />
          <h2 className="relative mx-auto mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-brand-ink md:text-[44px]">
            Начните создавать <span className="whitespace-nowrap">капитал с <img src="/brand/jetra-wordmark.png" alt="JETRA" width={866} height={155} className="inline-block h-[0.72em] w-auto align-baseline" /></span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[17px] text-brand-muted">Знания, стратегии и инвестиционное сообщество — в одной экосистеме.</p>
          <StartLink className={cn(btnPrimary, "relative mt-9 px-7 py-4")}>
            Присоединиться к JETRA <Icon name="ArrowRight" size={18} />
          </StartLink>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PublicLayout>
      <Hero />
      <Ecosystem />
      <Markets />
      <Calculator />
      <Steps />
      <Trust />
      <FinalCta />
    </PublicLayout>
  );
}