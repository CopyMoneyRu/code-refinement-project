import Icon from "@/components/ui/icon";
import type { VideoType } from "@/lib/learning";

export function embedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
  if (host.endsWith("youtube.com")) {
    const id = u.searchParams.get("v") || u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "rutube.ru") {
    const id = u.pathname.match(/\/(?:video|play\/embed|shorts)\/(?:private\/)?([\w]+)/)?.[1];
    if (!id) return null;
    const p = u.searchParams.get("p");
    return `https://rutube.ru/play/embed/${id}${p ? `?p=${encodeURIComponent(p)}` : ""}`;
  }
  if (host === "vk.com" || host === "vkvideo.ru" || host === "vk.ru") {
    if (u.pathname.startsWith("/video_ext.php")) return u.toString();
    const m = (u.searchParams.get("z") || u.pathname).match(/video(-?\d+)_(\d+)/);
    return m ? `https://vkvideo.ru/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2` : null;
  }
  if (host.endsWith("kinescope.io")) {
    const id = u.pathname.replace(/^\/(embed\/)?/, "").split("/")[0];
    return id ? `https://kinescope.io/embed/${id}` : null;
  }
  if (host === "player.vimeo.com") return u.toString();
  if (host === "vimeo.com") {
    const id = u.pathname.match(/\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export const isDirectVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

export default function VideoPlayer({ type, url, title }: { type: VideoType; url: string; title: string }) {
  if (type === "none" || !url) return null;

  if (type === "file" || isDirectVideo(url)) {
    return (
      <video key={url} src={url} controls controlsList="nodownload" playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black">
        Ваш браузер не поддерживает воспроизведение видео.
      </video>
    );
  }

  const embed = embedUrl(url);
  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-brand-ink text-white transition-opacity hover:opacity-90"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <Icon name="Play" size={28} />
        </span>
        <span className="text-sm">Открыть видео в новой вкладке</span>
      </a>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        key={embed}
        src={embed}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
