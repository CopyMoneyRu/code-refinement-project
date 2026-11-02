import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Block, BlockType, JsonObj } from "@/lib/strategies";
import FileUpload from "./FileUpload";
import ImageUpload from "./ImageUpload";
import { areaCls, Field, inputCls, Segmented } from "./fields";

type D = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const BLOCK_TYPES: { type: BlockType; label: string; icon: string; init: D }[] = [
  { type: "heading", label: "Заголовок", icon: "Heading", init: { text: "", level: 2 } },
  { type: "text", label: "Текст", icon: "AlignLeft", init: { text: "" } },
  { type: "callout", label: "Выделенный блок", icon: "Info", init: { title: "", text: "", tone: "info" } },
  { type: "image", label: "Изображение", icon: "Image", init: { url: "", caption: "" } },
  { type: "video", label: "Видео", icon: "PlayCircle", init: { kind: "link", url: "", title: "" } },
  { type: "pdf", label: "PDF", icon: "FileText", init: { url: "", title: "", embed: true } },
  { type: "list", label: "Список", icon: "List", init: { title: "", items: [""], ordered: false } },
  { type: "table", label: "Таблица", icon: "Table", init: { title: "", headers: ["Показатель", "Значение"], rows: [["", ""]] } },
  { type: "stats", label: "Показатели", icon: "Gauge", init: { title: "", items: [{ value: "", label: "", hint: "" }] } },
  { type: "chart", label: "График", icon: "LineChart", init: { title: "", kind: "line", suffix: "%", points: [{ label: "Янв", value: 0 }, { label: "Фев", value: 0 }], note: "" } },
  { type: "faq", label: "FAQ", icon: "MessageCircleQuestion", init: { title: "Частые вопросы", items: [{ q: "", a: "" }] } },
  { type: "documents", label: "Документы", icon: "FileCheck2", init: { title: "Юридические документы", items: [{ title: "", url: "", note: "" }] } },
];

export const blockMeta = (t: BlockType) => BLOCK_TYPES.find((b) => b.type === t)!;

function RowTools({ onUp, onDown, onDel }: { onUp?: () => void; onDown?: () => void; onDel: () => void }) {
  const cls = "flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-brand-surface hover:text-brand-ink disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-0.5">
      {onUp !== undefined && <button type="button" className={cls} onClick={onUp} aria-label="Выше"><Icon name="ChevronUp" size={16} /></button>}
      {onDown !== undefined && <button type="button" className={cls} onClick={onDown} aria-label="Ниже"><Icon name="ChevronDown" size={16} /></button>}
      <button type="button" className={cn(cls, "hover:text-red-600")} onClick={onDel} aria-label="Удалить"><Icon name="X" size={16} /></button>
    </div>
  );
}

function AddRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline">
      <Icon name="Plus" size={15} /> {children}
    </button>
  );
}

function move<T>(list: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const n = [...list];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

export default function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const d = block.data as D;
  const set = (patch: D) => onChange({ ...block, data: { ...d, ...patch } as JsonObj });

  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className={inputCls} value={str(d.text)} onChange={(e) => set({ text: e.target.value })} placeholder="Текст заголовка" maxLength={200} />
          <Segmented value={String(d.level ?? 2)} options={[["2", "Крупный"], ["3", "Средний"]]} onChange={(v) => set({ level: Number(v) })} />
        </div>
      );
    case "text":
      return (
        <div>
          <textarea className={areaCls} rows={6} value={str(d.text)} onChange={(e) => set({ text: e.target.value })} placeholder="Текст. Пустая строка — новый абзац." maxLength={20000} />
        </div>
      );
    case "callout":
      return (
        <div className="space-y-3">
          <Segmented value={str(d.tone) || "info"} options={[["info", "Информация"], ["warning", "Предупреждение"], ["success", "Преимущество"]]} onChange={(v) => set({ tone: v })} />
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок (необязательно)" />
          <textarea className={areaCls} rows={3} value={str(d.text)} onChange={(e) => set({ text: e.target.value })} placeholder="Текст" />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div className="max-w-md"><ImageUpload value={str(d.url)} onChange={(url) => set({ url })} /></div>
          <input className={inputCls} value={str(d.caption)} onChange={(e) => set({ caption: e.target.value })} placeholder="Подпись (необязательно)" />
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <Segmented value={str(d.kind) || "link"} options={[["link", "Ссылка"], ["file", "Файл"]]} onChange={(v) => set({ kind: v, url: "" })} />
          {d.kind === "file" ? (
            <div className="flex flex-wrap items-center gap-3">
              <FileUpload kind="video" accept="video/mp4,video/webm,video/quicktime" label="Загрузить видео (до 70 МБ)" onDone={(r) => set({ url: r.url })} />
              {str(d.url) && <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700"><Icon name="Check" size={15} /> Видео загружено</span>}
            </div>
          ) : (
            <input className={inputCls} value={str(d.url)} onChange={(e) => set({ url: e.target.value })} placeholder="https://youtube.com/… , rutube.ru/… , vkvideo.ru/… , kinescope.io/…" />
          )}
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Название (необязательно)" />
        </div>
      );
    case "pdf":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <FileUpload kind="material" accept="application/pdf" label="Загрузить PDF" onDone={(r) => set({ url: r.url, title: str(d.title) || r.filename })} />
            {str(d.url) && <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700"><Icon name="Check" size={15} /> Файл загружен</span>}
          </div>
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Название документа" />
          <label className="flex items-center gap-2 text-sm text-brand-ink">
            <input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={d.embed !== false} onChange={(e) => set({ embed: e.target.checked })} />
            Показывать документ прямо на странице (на компьютере)
          </label>
        </div>
      );
    case "list": {
      const items = arr<string>(d.items);
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок списка (необязательно)" />
            <Segmented value={d.ordered ? "1" : "0"} options={[["0", "Маркеры"], ["1", "Нумерация"]]} onChange={(v) => set({ ordered: v === "1" })} />
          </div>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className={inputCls} value={it} onChange={(e) => set({ items: items.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Пункт ${i + 1}`} />
              <RowTools onUp={() => set({ items: move(items, i, -1) })} onDown={() => set({ items: move(items, i, 1) })} onDel={() => set({ items: items.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <AddRow onClick={() => set({ items: [...items, ""] })}>Добавить пункт</AddRow>
        </div>
      );
    }
    case "table": {
      const headers = arr<string>(d.headers);
      const rows = arr<string[]>(d.rows);
      const setCell = (r: number, c: number, v: string) => set({ rows: rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) });
      return (
        <div className="space-y-3">
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок таблицы (необязательно)" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1">
              <thead>
                <tr>
                  {headers.map((h, c) => (
                    <th key={c} className="align-top">
                      <div className="flex gap-1">
                        <input className={cn(inputCls, "h-9 font-semibold")} value={h} onChange={(e) => set({ headers: headers.map((x, j) => (j === c ? e.target.value : x)) })} placeholder={`Столбец ${c + 1}`} />
                        {headers.length > 1 && (
                          <button type="button" className="px-1 text-brand-muted hover:text-red-600" aria-label="Удалить столбец" onClick={() => set({ headers: headers.filter((_, j) => j !== c), rows: rows.map((r) => r.filter((_, j) => j !== c)) })}>
                            <Icon name="X" size={14} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    {headers.map((_, c) => (
                      <td key={c}><input className={cn(inputCls, "h-9")} value={row[c] ?? ""} onChange={(e) => setCell(r, c, e.target.value)} /></td>
                    ))}
                    <td><RowTools onUp={() => set({ rows: move(rows, r, -1) })} onDown={() => set({ rows: move(rows, r, 1) })} onDel={() => set({ rows: rows.filter((_, j) => j !== r) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-5">
            <AddRow onClick={() => set({ rows: [...rows, headers.map(() => "")] })}>Строка</AddRow>
            {headers.length < 10 && <AddRow onClick={() => set({ headers: [...headers, ""], rows: rows.map((r) => [...r, ""]) })}>Столбец</AddRow>}
          </div>
        </div>
      );
    }
    case "stats": {
      const items = arr<{ value: string; label: string; hint: string }>(d.items);
      const upd = (i: number, p: Partial<(typeof items)[number]>) => set({ items: items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
      return (
        <div className="space-y-3">
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок (необязательно)" />
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[140px_1fr_1fr]">
                <input className={inputCls} value={it.value} onChange={(e) => upd(i, { value: e.target.value })} placeholder="+24%" maxLength={40} />
                <input className={inputCls} value={it.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Подпись" />
                <input className={inputCls} value={it.hint} onChange={(e) => upd(i, { hint: e.target.value })} placeholder="Пояснение (необязательно)" />
              </div>
              <RowTools onUp={() => set({ items: move(items, i, -1) })} onDown={() => set({ items: move(items, i, 1) })} onDel={() => set({ items: items.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {items.length < 12 && <AddRow onClick={() => set({ items: [...items, { value: "", label: "", hint: "" }] })}>Показатель</AddRow>}
        </div>
      );
    }
    case "chart": {
      const pts = arr<{ label: string; value: number | string }>(d.points);
      const upd = (i: number, p: Partial<(typeof pts)[number]>) => set({ points: pts.map((x, j) => (j === i ? { ...x, ...p } : x)) });
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_100px]">
            <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок графика" />
            <Segmented value={str(d.kind) || "line"} options={[["line", "Линия"], ["area", "Область"], ["bar", "Столбцы"]]} onChange={(v) => set({ kind: v })} />
            <input className={inputCls} value={str(d.suffix)} onChange={(e) => set({ suffix: e.target.value })} placeholder="Ед. изм." maxLength={10} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pts.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} value={p.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Подпись" />
                <input className={cn(inputCls, "w-28")} inputMode="decimal" value={String(p.value)} onChange={(e) => upd(i, { value: e.target.value })} placeholder="0" />
                <RowTools onDel={() => set({ points: pts.filter((_, j) => j !== i) })} />
              </div>
            ))}
          </div>
          <AddRow onClick={() => set({ points: [...pts, { label: "", value: 0 }] })}>Точка</AddRow>
          <input className={inputCls} value={str(d.note)} onChange={(e) => set({ note: e.target.value })} placeholder="Примечание под графиком, например источник данных" />
        </div>
      );
    }
    case "faq": {
      const items = arr<{ q: string; a: string }>(d.items);
      const upd = (i: number, p: Partial<(typeof items)[number]>) => set({ items: items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
      return (
        <div className="space-y-3">
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок раздела" />
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-brand-ink/10 p-3">
              <div className="flex-1 space-y-2">
                <input className={inputCls} value={it.q} onChange={(e) => upd(i, { q: e.target.value })} placeholder="Вопрос" />
                <textarea className={areaCls} rows={3} value={it.a} onChange={(e) => upd(i, { a: e.target.value })} placeholder="Ответ" />
              </div>
              <RowTools onUp={() => set({ items: move(items, i, -1) })} onDown={() => set({ items: move(items, i, 1) })} onDel={() => set({ items: items.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <AddRow onClick={() => set({ items: [...items, { q: "", a: "" }] })}>Вопрос</AddRow>
        </div>
      );
    }
    case "documents": {
      const items = arr<{ title: string; url: string; note: string }>(d.items);
      const upd = (i: number, p: Partial<(typeof items)[number]>) => set({ items: items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
      return (
        <div className="space-y-3">
          <input className={inputCls} value={str(d.title)} onChange={(e) => set({ title: e.target.value })} placeholder="Заголовок раздела" />
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-brand-ink/10 p-3">
              <div className="flex-1 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={inputCls} value={it.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Название, например «Договор оферты»" />
                  <input className={inputCls} value={it.note} onChange={(e) => upd(i, { note: e.target.value })} placeholder="Примечание: версия, дата" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <FileUpload kind="material" accept=".pdf,.doc,.docx" label={it.url ? "Заменить файл" : "Загрузить файл"} onDone={(r) => upd(i, { url: r.url, title: it.title || r.filename })} />
                  {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-blue hover:underline">Открыть файл</a>}
                </div>
              </div>
              <RowTools onUp={() => set({ items: move(items, i, -1) })} onDown={() => set({ items: move(items, i, 1) })} onDel={() => set({ items: items.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <AddRow onClick={() => set({ items: [...items, { title: "", url: "", note: "" }] })}>Документ</AddRow>
        </div>
      );
    }
    default:
      return null;
  }
}

export { Field };
