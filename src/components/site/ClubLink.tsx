import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";

export const CLUB_URL = "https://club-capitalist.ru/";

export default function ClubLink({ className, children, onClose }: { className?: string; children: ReactNode; onClose?: () => void }) {
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    if (!v) onClose?.();
  };

  return (
    <>
      <a
        href={CLUB_URL}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={className}
      >
        {children}
      </a>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="theme-light w-[calc(100%-2.5rem)] max-w-sm gap-3 rounded-2xl border-brand-ink/10 bg-white p-6 text-center text-brand-ink sm:max-w-md sm:p-7">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue sm:h-14 sm:w-14">
            <Icon name="ExternalLink" size={22} />
          </div>
          <DialogTitle className="mt-1 font-display text-lg font-semibold leading-snug sm:text-xl">
            Сейчас вы будете перенаправлены на сайт клуба CAPITALIST
          </DialogTitle>
          <DialogDescription className="text-sm text-brand-muted">Сайт откроется в новой вкладке.</DialogDescription>
          <a
            href={CLUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 font-medium text-white transition-colors hover:bg-[#3271B0]"
          >
            Перейти <Icon name="ArrowUpRight" size={17} />
          </a>
          <button type="button" onClick={() => setOpen(false)} className="py-1 text-sm text-brand-muted hover:text-brand-ink">
            Остаться на сайте
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
