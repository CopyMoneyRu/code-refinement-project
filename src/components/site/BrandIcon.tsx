import { siGmail, siTelegram, siTiktok, siVk, siYoutube } from "simple-icons";

const ICONS = { vk: siVk, youtube: siYoutube, telegram: siTelegram, tiktok: siTiktok, gmail: siGmail };

export type BrandKey = keyof typeof ICONS;

export default function BrandIcon({ name, size = 20, color, className }: { name: BrandKey; size?: number; color?: string; className?: string }) {
  const icon = ICONS[name];
  return (
    <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" width={size} height={size} fill={color ?? `#${icon.hex}`} className={className}>
      <path d={icon.path} />
    </svg>
  );
}
