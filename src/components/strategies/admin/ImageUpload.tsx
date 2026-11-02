import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { uploadStrategyImageFn } from "@/lib/strategies";
import { readAsBase64 } from "./fields";

export default function ImageUpload({ value, onChange, aspect = "aspect-[16/9]" }: { value: string; onChange: (url: string) => void; aspect?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Подойдут JPG, PNG или WEBP");
    if (file.size > 5 * 1024 * 1024) return setError("Изображение должно быть не больше 5 МБ");
    setBusy(true);
    const r = await uploadStrategyImageFn({ data: { contentType: file.type, data: await readAsBase64(file) } });
    setBusy(false);
    if (ref.current) ref.current.value = "";
    if (!r.ok) return setError(r.message);
    onChange(r.url);
  };

  return (
    <div>
      <div className={`relative ${aspect} overflow-hidden rounded-lg border border-dashed border-brand-ink/20 bg-brand-light`}>
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
            <Icon name={busy ? "Loader2" : "ImagePlus"} size={24} className={busy ? "animate-spin" : ""} />
            {busy ? "Загружаем…" : "Загрузить изображение"}
          </button>
        )}
        {value && (
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => ref.current?.click()} className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-brand-ink shadow hover:bg-white">
              {busy ? "Загружаем…" : "Заменить"}
            </button>
            <button type="button" onClick={() => onChange("")} className="rounded-md bg-white/90 px-2 py-1 text-red-600 shadow hover:bg-white" aria-label="Убрать изображение">
              <Icon name="X" size={14} />
            </button>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
