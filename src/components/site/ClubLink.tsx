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
        <DialogContent className="theme-light bg-white text-center text-brand-ink sm:max-w-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <Icon name="ExternalLink" size={24} />
          </div>
          <DialogTitle className="mt-2 font-display text-xl font-semibold leading-snug">
            Сейчас вы будете перенаправлены на сайт клуба CAPITALIST
          </DialogTitle>
          <DialogDescription className="text-brand-muted">Сайт откроется в новой вкладке.</DialogDescription>
          <a
            href={CLUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue py-3.5 font-medium text-white transition-colors hover:bg-[#3271B0]"
          >
            Перейти <Icon name="ArrowUpRight" size={17} />
          </a>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-brand-muted hover:text-brand-ink">
            Остаться на сайте
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
