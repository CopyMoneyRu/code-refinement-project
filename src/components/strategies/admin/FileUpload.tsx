import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { uploadFile, type UploadKind } from "@/lib/upload";
import { btnGhost } from "./fields";

export default function FileUpload({
  kind,
  accept,
  label,
  onDone,
}: {
  kind: UploadKind;
  accept: string;
  label: string;
  onDone: (r: { url: string; filename: string }) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");
    setProgress(0);
    const r = await uploadFile(file, kind, setProgress);
    setProgress(null);
    if (ref.current) ref.current.value = "";
    if (!r.ok) return setError(r.message);
    onDone({ url: r.url, filename: r.filename });
  };

  return (
    <div>
      <button type="button" disabled={progress !== null} onClick={() => ref.current?.click()} className={btnGhost}>
        <Icon name={progress !== null ? "Loader2" : "Upload"} size={15} className={progress !== null ? "animate-spin" : ""} />
        {progress !== null ? `Загружаем… ${progress}%` : label}
      </button>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
