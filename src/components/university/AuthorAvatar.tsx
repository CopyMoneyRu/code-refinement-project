import { cn } from "@/lib/utils";

export const authorInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function AuthorAvatar({
  name,
  photoUrl,
  className,
  textClassName,
}: {
  name: string;
  photoUrl?: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-surface text-brand-ink", className)}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className={cn("font-semibold", textClassName)}>{authorInitials(name)}</span>
      )}
    </div>
  );
}
