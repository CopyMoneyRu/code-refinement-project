import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export default function CategoryChips({ names, className }: { names: string[]; className?: string }) {
  if (!names.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Icon name="Tag" size={13} className="mr-0.5 shrink-0 text-brand-blue/70" />
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center rounded-full border border-brand-blue/15 bg-brand-blue/[0.06] px-2.5 py-0.5 text-xs font-medium leading-5 text-brand-ink/75"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
