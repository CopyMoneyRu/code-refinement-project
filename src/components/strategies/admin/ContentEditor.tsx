import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import { cn } from "@/lib/utils";
import { publishContentFn, saveBlocksFn, type Block, type BlockType } from "@/lib/strategies";
import BlockEditor, { BLOCK_TYPES, blockMeta } from "./BlockEditor";
import { btnGhost, btnPrimary, Notice } from "./fields";

type Item = Block & { key: string };

export default function ContentEditor({
  strategyId,
  initial,
  hasUnpublished: initialUnpublished,
  canPublish,
  onPreview,
}: {
  strategyId: number;
  initial: Block[];
  hasUnpublished: boolean;
  canPublish: boolean;
  onPreview: () => void;
}) {
  const seq = useRef(0);
  const withKey = (b: Block): Item => ({ ...b, key: `b${seq.current++}` });
  const [items, setItems] = useState<Item[]>(() => initial.map(withKey));
  const [dirty, setDirty] = useState(false);
  const [unpublished, setUnpublished] = useState(initialUnpublished);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [adding, setAdding] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const change = (next: Item[]) => {
    setItems(next);
    setDirty(true);
    setOk("");
  };

  const add = (type: BlockType, at: number) => {
    const meta = blockMeta(type);
    const n = [...items];
    n.splice(at, 0, withKey({ type, data: JSON.parse(JSON.stringify(meta.init)) }));
    change(n);
    setAdding(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    change(n);
  };

  const save = async () => {
    setBusy("save");
    setError("");
    const r = await saveBlocksFn({ data: { id: strategyId, blocks: items.map(({ type, data }) => ({ type, data })) } });
    setBusy("");
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    setItems(r.blocks.map(withKey));
    setDirty(false);
    setUnpublished(r.hasUnpublished);
    setOk("Черновик сохранён");
    return true;
  };

  const publish = async () => {
    if (dirty && !(await save())) return;
    setBusy("publish");
    setError("");
    const r = await publishContentFn({ data: { id: strategyId } });
    setBusy("");
    if (!r.ok) return setError(r.message);
    setUnpublished(false);
    setOk("Содержимое опубликовано на странице стратегии");
  };

  const preview = async () => {
    if (dirty && !(await save())) return;
    onPreview();
  };

  const Adder = ({ at }: { at: number }) =>
    adding === at ? (
      <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Добавить блок</span>
          <button type="button" onClick={() => setAdding(null)} className="text-brand-muted hover:text-brand-ink" aria-label="Закрыть"><Icon name="X" size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {BLOCK_TYPES.map((b) => (
            <button key={b.type} type="button" onClick={() => add(b.type, at)} className="flex flex-col items-center gap-1.5 rounded-lg bg-white px-2 py-3 text-xs font-medium text-brand-ink ring-1 ring-brand-ink/10 hover:ring-brand-blue">
              <Icon name={b.icon} size={18} className="text-brand-blue" fallback="Square" /> {b.label}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="group flex items-center gap-2 py-1">
        <span className="h-px flex-1 bg-brand-ink/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <button type="button" onClick={() => setAdding(at)} className="inline-flex items-center gap-1 rounded-full border border-brand-ink/15 bg-white px-3 py-1 text-xs font-medium text-brand-muted hover:border-brand-blue hover:text-brand-blue">
          <Icon name="Plus" size={13} /> Блок
        </button>
        <span className="h-px flex-1 bg-brand-ink/10 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    );

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-ink/10 bg-white/95 p-3 backdrop-blur">
        <span className={cn("inline-flex items-center gap-1.5 text-sm", dirty ? "text-amber-700" : unpublished ? "text-brand-blue" : "text-emerald-700")}>
          <Icon name={dirty ? "CircleDot" : unpublished ? "FileClock" : "CircleCheck"} size={15} />
          {dirty ? "Есть несохранённые изменения" : unpublished ? "Черновик отличается от опубликованной версии" : "Опубликована актуальная версия"}
        </span>
        <span className="flex-1" />
        <button type="button" onClick={preview} disabled={!!busy} className={btnGhost}><Icon name="Eye" size={15} /> Предпросмотр</button>
        <button type="button" onClick={save} disabled={!!busy || !dirty} className={btnGhost}>
          <Icon name={busy === "save" ? "Loader2" : "Save"} size={15} className={busy === "save" ? "animate-spin" : ""} /> Сохранить черновик
        </button>
        {canPublish && (
          <button type="button" onClick={publish} disabled={!!busy || (!dirty && !unpublished)} className={btnPrimary}>
            <Icon name={busy === "publish" ? "Loader2" : "Send"} size={15} className={busy === "publish" ? "animate-spin" : ""} /> Опубликовать
          </button>
        )}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="ok">{ok}</Notice>}

      {!items.length && (
        <WsCard className="mb-3 text-center">
          <p className="text-brand-muted">Страница пока пустая. Добавьте первый блок: заголовок, текст, изображение, видео, таблицу, график, FAQ или документы.</p>
        </WsCard>
      )}
      <Adder at={0} />
      {items.map((b, i) => {
        const meta = blockMeta(b.type);
        const isCollapsed = collapsed.has(b.key);
        return (
          <div key={b.key}>
            <WsCard className="p-0">
              <div className="flex items-center gap-2 border-b border-brand-ink/[0.07] px-4 py-2.5">
                <Icon name={meta.icon} size={16} className="text-brand-blue" fallback="Square" />
                <span className="text-sm font-medium">{meta.label}</span>
                <span className="text-xs text-brand-muted">#{i + 1}</span>
                <span className="flex-1" />
                <button type="button" onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(b.key)) n.delete(b.key); else n.add(b.key); return n; })} className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-brand-surface" aria-label="Свернуть">
                  <Icon name={isCollapsed ? "ChevronsUpDown" : "ChevronsDownUp"} size={15} />
                </button>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-brand-surface disabled:opacity-30" aria-label="Выше"><Icon name="ArrowUp" size={15} /></button>
                <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-brand-surface disabled:opacity-30" aria-label="Ниже"><Icon name="ArrowDown" size={15} /></button>
                <button type="button" onClick={() => change([...items.slice(0, i + 1), withKey({ type: b.type, data: JSON.parse(JSON.stringify(b.data)) }), ...items.slice(i + 1)])} className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-brand-surface" aria-label="Дублировать"><Icon name="Copy" size={15} /></button>
                <button type="button" onClick={() => change(items.filter((_, j) => j !== i))} className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-red-50 hover:text-red-600" aria-label="Удалить блок"><Icon name="Trash2" size={15} /></button>
              </div>
              {!isCollapsed && (
                <div className="p-4">
                  <BlockEditor block={b} onChange={(nb) => change(items.map((x, j) => (j === i ? { ...nb, key: x.key } : x)))} />
                </div>
              )}
            </WsCard>
            <Adder at={i + 1} />
          </div>
        );
      })}
    </div>
  );
}
