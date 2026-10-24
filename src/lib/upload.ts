import func2url from "../../backend/func2url.json";
import { uploadStartFn } from "./learning";

const LEARNING_URL = (func2url as Record<string, string>).learning;

export type UploadKind = "video" | "material";
export type UploadResult = { ok: true; url: string; size: number; filename: string } | { ok: false; message: string };

const toBase64 = async (blob: Blob) => {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
};

async function post(body: Record<string, unknown>, tries = 3): Promise<Record<string, unknown>> {
  let last: unknown;
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(LEARNING_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as Record<string, unknown>;
      if (r.ok || (r.status >= 400 && r.status < 500)) return j;
      last = j;
    } catch (e) {
      last = e;
    }
    await new Promise((res) => setTimeout(res, 800 * (a + 1)));
  }
  return { ok: false, message: "Не удалось связаться с сервером. Проверьте интернет и повторите" , detail: String(last) };
}

export async function uploadFile(file: File, kind: UploadKind, onProgress: (percent: number) => void): Promise<UploadResult> {
  const start = await uploadStartFn({ data: { kind, filename: file.name, size: file.size } });
  if (!start.ok) return { ok: false, message: start.message };
  const { uploadId, token, chunkSize, chunks } = start;

  let done = 0;
  let failed: string | null = null;
  let nextIndex = 0;
  onProgress(0);

  const worker = async () => {
    while (!failed && nextIndex < chunks) {
      const i = nextIndex++;
      const data = await toBase64(file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize)));
      const r = await post({ action: "upload_chunk", uploadId, token, index: i, data });
      if (!r.ok) {
        failed = String(r.message || "Ошибка загрузки");
        return;
      }
      done++;
      onProgress(Math.round((done / chunks) * 95));
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, chunks) }, worker));
  if (failed) return { ok: false, message: failed };

  const fin = await post({ action: "upload_finish", uploadId, token }, 2);
  if (!fin.ok) return { ok: false, message: String(fin.message || "Не удалось сохранить файл") };
  onProgress(100);

  void (async () => {
    let from = 0;
    for (let a = 0; a < 30; a++) {
      const c = await post({ action: "upload_cleanup", uploadId, token, from }, 1);
      if (!c.ok || !Number(c.left)) break;
      from = Number(c.next) || 0;
    }
  })();

  return { ok: true, url: String(fin.url), size: Number(fin.size), filename: String(fin.filename) };
}

export const formatSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace(".", ",")} МБ`;
};
