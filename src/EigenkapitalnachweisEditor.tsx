import { useCallback, useEffect, useRef, useState } from "react";
import type { Col, EkData, Period } from "./types";
import { fmt, pn } from "./format";
import { seed } from "./seed";
import "./eigenkapital.css";

// Default prose content for the two editable text blocks (Einleitung /
// Anmerkungen). Kept as constant HTML so React never overwrites user edits.
const EINLEITUNG_HTML = "";
const ANMERKUNGEN_HTML = "";

const isVal = (c: Col) => c.type !== "total";

const colOpen = (p: Period, c: Col): number =>
  c.system ? p.sysOpen[c.id] || 0 : pn(p.manOpen[c.id] || "");

// Sum a per-value-col numeric over the value cols positioned before index `idx`.
function sumBefore(cols: Col[], idx: number, getv: (c: Col) => number): number {
  let s = 0;
  for (let i = 0; i < idx; i++) {
    const cc = cols[i];
    if (isVal(cc)) s += getv(cc);
  }
  return s;
}

const near0 = (x: number) => Math.abs(x) < 0.005;

// Column drag styling: tint the whole dragged column and draw a full-height
// insertion line at the drop position — applied to the header cell AND every
// body cell of a column so the highlight spans the entire table height.
function colDnDStyle(
  idx: number,
  colId: string,
  draggedId: string | null,
  dropIdx: number | null,
  colCount: number,
): React.CSSProperties {
  if (!draggedId) return {};
  const s: React.CSSProperties = {};
  if (colId === draggedId) s.background = "rgba(15,163,168,0.09)";
  if (dropIdx != null) {
    if (dropIdx === idx) s.boxShadow = "inset 2px 0 0 0 #0fa3a8";
    else if (idx === colCount - 1 && dropIdx === colCount) s.boxShadow = "inset -2px 0 0 0 #0fa3a8";
  }
  return s;
}

export default function Eigenkapitalnachweis() {
  const [data, setData] = useState<EkData>(seed);
  const [editCol, setEditCol] = useState<string | null>(null);
  // Pointer-based drag & drop (reliable in tables, unlike native HTML5 DnD).
  const [colDrag, setColDrag] = useState<string | null>(null); // dragged column id
  const [colDropIdx, setColDropIdx] = useState<number | null>(null); // insertion index 0..cols.length
  const [rowDrag, setRowDrag] = useState<{ pid: string; rid: string } | null>(null);
  const [rowDropIdx, setRowDropIdx] = useState<number | null>(null); // insertion index in that period's rows
  const [menuCol, setMenuCol] = useState<{ id: string; x: number; y: number } | null>(null);
  const liveDropIdx = useRef<number | null>(null); // latest insertion index during a drag

  // --- immutable update helper (deep clone, mutate, commit) ---
  const update = (fn: (d: EkData) => void) =>
    setData((prev) => {
      const d: EkData = JSON.parse(JSON.stringify(prev));
      fn(d);
      return d;
    });

  const P = (d: EkData, pid: string) => d.periods.find((p) => p.id === pid)!;

  // --- mutations (1:1 with the prototype) ---
  const setCell = (pid: string, rid: string, cid: string, val: string) =>
    update((d) => {
      const r = P(d, pid).rows.find((r) => r.id === rid);
      if (r) r.vals[cid] = val;
    });
  const setRowTitle = (pid: string, rid: string, val: string) =>
    update((d) => {
      const r = P(d, pid).rows.find((r) => r.id === rid);
      if (r) r.title = val;
    });
  const setColTitle = (cid: string, val: string) =>
    update((d) => {
      const c = d.cols.find((c) => c.id === cid);
      if (c) c.title = val;
    });
  const setManOpen = (pid: string, cid: string, val: string) =>
    update((d) => {
      P(d, pid).manOpen[cid] = val;
    });
  const addRow = (pid: string) =>
    update((d) => {
      P(d, pid).rows.push({ id: "r" + d.uid++, type: "movement", title: "", vals: {} });
    });
  const removeRow = (pid: string, rid: string) =>
    update((d) => {
      const p = P(d, pid);
      p.rows = p.rows.filter((r) => r.id !== rid);
    });
  const addCol = () =>
    update((d) => {
      const i = d.cols.length;
      d.cols.splice(Math.max(0, i - 1), 0, {
        id: "c" + d.uid++,
        title: "Neue Position",
        system: false,
        type: "value",
      });
    });
  const addTotalCol = () =>
    update((d) => {
      d.cols.push({ id: "c" + d.uid++, title: "Total", system: true, type: "total" });
    });
  const removeCol = (cid: string) =>
    update((d) => {
      d.cols = d.cols.filter((c) => c.id !== cid);
      d.periods.forEach((p) => {
        p.rows.forEach((r) => delete r.vals[cid]);
        delete p.manOpen[cid];
      });
    });
  const moveRowByInsert = (pid: string, from: number, beforeIdx: number) =>
    update((d) => {
      const rows = P(d, pid).rows;
      if (from < 0 || from >= rows.length) return;
      const [m] = rows.splice(from, 1);
      let at = from < beforeIdx ? beforeIdx - 1 : beforeIdx;
      if (at < 0) at = 0;
      if (at > rows.length) at = rows.length;
      rows.splice(at, 0, m);
    });
  // Move column at `from` so it lands immediately before original index
  // `beforeIdx` (beforeIdx === cols.length appends at the end). No-op when the
  // column would keep its place.
  const moveColByInsert = (from: number, beforeIdx: number) =>
    update((d) => {
      if (from < 0 || from >= d.cols.length) return;
      const [m] = d.cols.splice(from, 1);
      let insertAt = from < beforeIdx ? beforeIdx - 1 : beforeIdx;
      if (insertAt < 0) insertAt = 0;
      if (insertAt > d.cols.length) insertAt = d.cols.length;
      d.cols.splice(insertAt, 0, m);
    });

  const cols = data.cols;

  // --- pointer-based column drag: hit-test the header cells by pointer X ---
  const startColDrag = (e: React.PointerEvent, fromIdx: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const headerRow = (e.currentTarget as HTMLElement).closest("tr");
    if (!headerRow) return;
    const cellsOf = () => Array.from(headerRow.querySelectorAll<HTMLElement>("th[data-colcell]"));
    liveDropIdx.current = fromIdx;
    setColDrag(cols[fromIdx].id);
    setColDropIdx(fromIdx);
    const move = (ev: PointerEvent) => {
      const list = cellsOf();
      let ins = list.length;
      for (let i = 0; i < list.length; i++) {
        const r = list[i].getBoundingClientRect();
        if (ev.clientX < r.left + r.width / 2) {
          ins = i;
          break;
        }
      }
      liveDropIdx.current = ins;
      setColDropIdx(ins);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const ins = liveDropIdx.current;
      if (ins != null) moveColByInsert(fromIdx, ins);
      liveDropIdx.current = null;
      setColDrag(null);
      setColDropIdx(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // --- pointer-based row drag: hit-test the period's data rows by pointer Y ---
  const startRowDrag = (e: React.PointerEvent, pid: string, fromIdx: number, rid: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const tbody = (e.currentTarget as HTMLElement).closest("tbody");
    if (!tbody) return;
    const rowsOf = () => Array.from(tbody.querySelectorAll<HTMLElement>("tr[data-rowcell]"));
    liveDropIdx.current = fromIdx;
    setRowDrag({ pid, rid });
    setRowDropIdx(fromIdx);
    const move = (ev: PointerEvent) => {
      const list = rowsOf();
      let ins = list.length;
      for (let i = 0; i < list.length; i++) {
        const r = list[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) {
          ins = i;
          break;
        }
      }
      liveDropIdx.current = ins;
      setRowDropIdx(ins);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const ins = liveDropIdx.current;
      if (ins != null) moveRowByInsert(pid, fromIdx, ins);
      liveDropIdx.current = null;
      setRowDrag(null);
      setRowDropIdx(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // close the column ⋮ menu on any outside pointer-down / Escape
  useEffect(() => {
    if (!menuCol) return;
    const onDown = (ev: PointerEvent) => {
      const t = ev.target as HTMLElement;
      if (!t.closest(".ek-menu") && !t.closest(".ek-kebab")) setMenuCol(null);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setMenuCol(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuCol]);

  // Column header (thead) — rendered fresh inside each year's own table so
  // every Geschäftsjahr-container is self-contained and column-aligned.
  const renderColHeader = () => (
    <thead>
      <tr style={{ borderBottom: "1px solid #1e2a30" }}>
        <th
          style={{
            textAlign: "left",
            padding: "10px 14px 10px 24px",
            minWidth: 250,
            font: "600 11px/1.3 'Inter Tight',sans-serif",
            color: "#7a8891",
            textTransform: "uppercase",
            letterSpacing: ".04em",
            verticalAlign: "bottom",
          }}
        >
          Position / Vorgang
        </th>
        {cols.map((c, idx) => {
          const isTotal = c.type === "total";
          const editing = editCol === c.id;
          return (
            <th
              key={c.id}
              data-colcell
              style={{
                padding: "8px 12px",
                minWidth: 132,
                verticalAlign: "bottom",
                position: "relative",
                ...colDnDStyle(idx, c.id, colDrag, colDropIdx, cols.length),
              }}
            >
              <div className="ek-colhead">
                <span
                  className="ek-drag"
                  onPointerDown={(e) => startColDrag(e, idx)}
                  title="Ziehen zum Verschieben"
                  style={{ touchAction: "none" }}
                >
                  ⣿
                </span>
                {editing ? (
                  <input
                    className="ek-colin"
                    value={c.title}
                    onChange={(e) => setColTitle(c.id, e.target.value)}
                    onBlur={() => setEditCol(null)}
                    autoFocus
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      font: "700 11px/1.35 'Inter Tight',sans-serif",
                      textTransform: "uppercase",
                      letterSpacing: ".03em",
                      color: isTotal ? "#0b7f84" : "#46555e",
                    }}
                  >
                    {c.title}
                  </span>
                )}
                <button
                  className="ek-kebab"
                  title="Spaltenoptionen"
                  onClick={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setMenuCol((m) =>
                      m && m.id === c.id ? null : { id: c.id, x: r.right - 168, y: r.bottom + 6 },
                    );
                  }}
                >
                  ⋮
                </button>
              </div>
            </th>
          );
        })}
        <th style={{ width: 40 }} />
      </tr>
    </thead>
  );

  const menuTarget = menuCol ? cols.find((c) => c.id === menuCol.id) : null;
  const menuIdx = menuCol ? cols.findIndex((c) => c.id === menuCol.id) : -1;
  const menuRemovable = menuTarget
    ? menuTarget.type === "total"
      ? true
      : !menuTarget.system
    : false;

  return (
    <>
    <div
      className="ek-card"
      style={{
        width: "100%",
        background: "#fff",
        border: "1px solid #e2e6e9",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(20,40,50,.06)",
        overflow: "hidden",
      }}
    >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 24px 16px",
          }}
        >
          <div>
            <div style={{ font: "700 16px/1.2 'Inter Tight',sans-serif", color: "#1e2a30" }}>
              Eigenkapitalnachweis
            </div>
            <div
              style={{ marginTop: 5, font: "500 12px/1 'Inter',sans-serif", color: "#7a8891" }}
            >
              in TCHF
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            <button className="ek-btn" onClick={addCol}>
              + Neue Spalte
            </button>
            <button className="ek-btn" onClick={addTotalCol}>
              + Total-Spalte
            </button>
          </div>
        </div>

        <div style={{ margin: "6px 12px 10px" }}>
          <RichTextBlock
            label="Einleitung"
            placeholder="Einleitenden Text vor dem Eigenkapitalnachweis erfassen …"
            addLabel="Einleitung hinzufügen"
            initialHtml={EINLEITUNG_HTML}
          />
        </div>

        {data.periods.map((p) => (
          <div
            key={p.id}
            style={{
              margin: "8px 12px 16px",
              border: "1px solid #e2e6e9",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "13px 20px",
                background: "#fbfcfc",
                borderBottom: "1px solid #eef1f3",
              }}
            >
              <span
                style={{
                  font: "700 11.5px/1 'Inter Tight',sans-serif",
                  color: "#1e2a30",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                Geschäftsjahr {p.year}
              </span>
              <button
                className="ek-btn"
                onClick={() => addRow(p.id)}
                style={{ padding: "6px 11px", fontSize: 11.5 }}
              >
                + Neue Zeile
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1256 }}>
                {renderColHeader()}
                <tbody>
                  <PeriodBody
                    p={p}
                    cols={cols}
                    onCellInput={(rid, cid, v) => setCell(p.id, rid, cid, v)}
                    onManOpen={(cid, v) => setManOpen(p.id, cid, v)}
                    onRowTitle={(rid, v) => setRowTitle(p.id, rid, v)}
                    onRemoveRow={(rid) => removeRow(p.id, rid)}
                    onRowPointerDown={(e, fromIdx, rid) => startRowDrag(e, p.id, fromIdx, rid)}
                    rowDropIdx={rowDrag && rowDrag.pid === p.id ? rowDropIdx : null}
                    dragRowId={rowDrag && rowDrag.pid === p.id ? rowDrag.rid : null}
                    colDragId={colDrag}
                    colDropIdx={colDropIdx}
                  />
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div style={{ margin: "10px 12px 12px" }}>
          <RichTextBlock
            label="Anmerkungen"
            placeholder="Anmerkungen nach dem Eigenkapitalnachweis erfassen …"
            addLabel="Anmerkung hinzufügen"
            initialHtml={ANMERKUNGEN_HTML}
          />
        </div>
    </div>

    {menuCol && menuTarget && (
      <div className="ek-menu" style={{ top: menuCol.y, left: Math.max(8, menuCol.x) }}>
        <button
          className="ek-menu-item"
          onClick={() => {
            setEditCol(menuCol.id);
            setMenuCol(null);
          }}
        >
          Umbenennen
        </button>
        <button
          className="ek-menu-item"
          disabled={menuIdx <= 0}
          onClick={() => {
            moveColByInsert(menuIdx, menuIdx - 1);
            setMenuCol(null);
          }}
        >
          Nach links verschieben
        </button>
        <button
          className="ek-menu-item"
          disabled={menuIdx >= cols.length - 1}
          onClick={() => {
            moveColByInsert(menuIdx, menuIdx + 2);
            setMenuCol(null);
          }}
        >
          Nach rechts verschieben
        </button>
        <div className="ek-menu-sep" />
        <button
          className="ek-menu-item danger"
          disabled={!menuRemovable}
          title={menuRemovable ? undefined : "Kommt aus dem Kontenmapping – nicht löschbar"}
          onClick={() => {
            if (!menuRemovable) return;
            removeCol(menuCol.id);
            setMenuCol(null);
          }}
        >
          Löschen
        </button>
      </div>
    )}
    </>
  );
}

// --- Rich-text block for the intro / notes above & below the table.
// Progressive disclosure: collapsed to a small "add" button while empty and
// unfocused; auto-expanded when content exists (e.g. carried over from the
// prior year); the formatting toolbar shows only while editing (on focus). ---
interface RichTextBlockProps {
  label: string;
  placeholder: string;
  addLabel: string;
  initialHtml?: string;
}

const RT_TOOLS: { cmd: string; icon: React.ReactNode; title: string }[] = [
  { cmd: "bold", icon: <b>B</b>, title: "Fett" },
  { cmd: "italic", icon: <i>I</i>, title: "Kursiv" },
  { cmd: "underline", icon: <u>U</u>, title: "Unterstrichen" },
  { cmd: "insertUnorderedList", icon: "•", title: "Aufzählung" },
  { cmd: "insertOrderedList", icon: "1.", title: "Nummerierte Liste" },
];

function RichTextBlock({ label, placeholder, addLabel, initialHtml = "" }: RichTextBlockProps) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const inited = useRef(false);
  const [active, setActive] = useState(false);
  const [hasContent, setHasContent] = useState(!!initialHtml.trim());
  const expanded = active || hasContent;

  // Seed the editable's HTML exactly once, then never let React touch its
  // contents again (no dangerouslySetInnerHTML) so re-renders can't wipe the
  // user's input. The ref callback is stable, so it only fires on mount.
  const attachArea = useCallback(
    (el: HTMLDivElement | null) => {
      areaRef.current = el;
      if (el && !inited.current) {
        el.innerHTML = initialHtml;
        inited.current = true;
      }
    },
    [initialHtml],
  );

  const syncHasContent = () => {
    const el = areaRef.current;
    setHasContent(!!el && (el.textContent || "").trim().length > 0);
  };
  const open = () => {
    setActive(true);
    requestAnimationFrame(() => areaRef.current?.focus());
  };
  // execCommand is deprecated but universally supported and dependency-free —
  // fine for this prototype. onMouseDown keeps the selection inside the editor.
  const exec = (command: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(command, false);
    areaRef.current?.focus();
    syncHasContent();
  };

  if (!expanded) {
    return (
      <button type="button" className="ek-add-text" onClick={open}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>＋</span> {addLabel}
      </button>
    );
  }

  return (
    <div
      className={"ek-rt" + (active ? " active" : "")}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(false);
      }}
    >
      <div className="ek-rt-head">
        <span className="ek-rt-tag">✎ {label}</span>
        {active && (
          <div className="ek-rt-toolbar" onMouseDown={(e) => e.preventDefault()}>
            {RT_TOOLS.map((t) => (
              <button
                key={t.cmd}
                type="button"
                className="ek-rt-btn"
                title={t.title}
                onMouseDown={exec(t.cmd)}
              >
                {t.icon}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={attachArea}
        className="ek-rt-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => setActive(true)}
        onInput={syncHasContent}
      />
    </div>
  );
}

// --- one period's table body: opening, movements/subtotals, closing, diff ---
interface PeriodBodyProps {
  p: Period;
  cols: Col[];
  onCellInput: (rid: string, cid: string, v: string) => void;
  onManOpen: (cid: string, v: string) => void;
  onRowTitle: (rid: string, v: string) => void;
  onRemoveRow: (rid: string) => void;
  onRowPointerDown: (e: React.PointerEvent, fromIdx: number, rid: string) => void;
  rowDropIdx: number | null; // insertion index while dragging in THIS period, else null
  dragRowId: string | null; // dragged row id in THIS period, else null
  colDragId: string | null; // dragged column id (whole-column highlight), else null
  colDropIdx: number | null; // column insertion index during a column drag, else null
}

function PeriodBody({
  p,
  cols,
  onCellInput,
  onManOpen,
  onRowTitle,
  onRemoveRow,
  onRowPointerDown,
  rowDropIdx,
  dragRowId,
  colDragId,
  colDropIdx,
}: PeriodBodyProps) {
  // movement sums per value col
  const msum: Record<string, number> = {};
  cols.forEach((c) => {
    if (isVal(c)) msum[c.id] = 0;
  });
  p.rows.forEach((r) => {
    if (r.type === "movement")
      cols.forEach((c) => {
        if (isVal(c)) msum[c.id] += pn(r.vals[c.id]);
      });
  });
  const computed: Record<string, number> = {};
  cols.forEach((c) => {
    if (isVal(c)) computed[c.id] = colOpen(p, c) + msum[c.id];
  });
  const diff: Record<string, number | null> = {};
  cols.forEach((c) => {
    if (isVal(c)) diff[c.id] = c.system ? (p.sysClose[c.id] || 0) - computed[c.id] : null;
  });

  const numCell = (display: string, color: string) => (
    <span className="ek-num" style={{ font: "700 12.5px/1 'Inter'", color, display: "block" }}>
      {display}
    </span>
  );

  // running accumulator for subtotals
  const acc: Record<string, number> = {};
  cols.forEach((c) => {
    if (isVal(c)) acc[c.id] = 0;
  });

  return (
    <>
      {/* opening */}
      <tr className="ek-tr-open">
        <td style={{ padding: "8px 14px 8px 24px" }}>
          <div style={{ font: "700 13px/1.2 'Inter',sans-serif", color: "#1e2a30" }}>
            {p.openLabel}
          </div>
        </td>
        {cols.map((c, idx) => (
          <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
            {c.type === "total"
              ? numCell(fmt(sumBefore(cols, idx, (cc) => colOpen(p, cc))), "#0b7f84")
              : c.system
                ? numCell(fmt(p.sysOpen[c.id] || 0), "#3f4d54")
                : (
                    <input
                      className="ek-in ek-num"
                      value={p.manOpen[c.id] || ""}
                      onChange={(e) => onManOpen(c.id, e.target.value)}
                      inputMode="decimal"
                      placeholder="–"
                    />
                  )}
          </td>
        ))}
        <td style={{ width: 40, padding: "5px 12px 5px 4px", textAlign: "center" }} />
      </tr>

      {/* movement / subtotal rows */}
      {p.rows.map((r, ridx) => {
        const dropBefore = rowDropIdx === ridx;
        const dropEnd = ridx === p.rows.length - 1 && rowDropIdx === p.rows.length;
        const rowGrip = (
          <span
            className="ek-drag"
            onPointerDown={(e) => onRowPointerDown(e, ridx, r.id)}
            title="Ziehen zum Verschieben"
            style={{ touchAction: "none" }}
          >
            ⣿
          </span>
        );

        if (r.type === "subtotal") {
          const snap: Record<string, number> = {};
          cols.forEach((c) => {
            if (isVal(c)) snap[c.id] = acc[c.id];
          });
          cols.forEach((c) => {
            if (isVal(c)) acc[c.id] = 0;
          });
          return (
            <tr
              key={r.id}
              className="ek-tr-sub"
              data-rowcell=""
              data-drop-before={dropBefore ? "" : undefined}
              data-drop-end={dropEnd ? "" : undefined}
              style={dragRowId === r.id ? { opacity: 0.4 } : undefined}
            >
              <td style={{ padding: "8px 14px 8px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                  {rowGrip}
                  <input
                    className="ek-title-in"
                    value={r.title}
                    onChange={(e) => onRowTitle(r.id, e.target.value)}
                    placeholder="Text eingeben"
                  />
                </div>
              </td>
              {cols.map((c, idx) => (
                <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
                  {c.type === "total"
                    ? numCell(fmt(sumBefore(cols, idx, (cc) => snap[cc.id]), true), "#0b7f84")
                    : numCell(fmt(snap[c.id], true), "#3f4d54")}
                </td>
              ))}
              <td style={{ width: 40, padding: "5px 12px 5px 4px", textAlign: "center" }}>
                <span className="ek-x" onClick={() => onRemoveRow(r.id)}>
                  −
                </span>
              </td>
            </tr>
          );
        }

        // movement
        cols.forEach((c) => {
          if (isVal(c)) acc[c.id] += pn(r.vals[c.id]);
        });
        return (
          <tr
            key={r.id}
            className="ek-tr-mov"
            data-rowcell=""
            data-drop-before={dropBefore ? "" : undefined}
            data-drop-end={dropEnd ? "" : undefined}
            style={dragRowId === r.id ? { opacity: 0.4 } : undefined}
          >
            <td style={{ padding: "8px 14px 8px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                {rowGrip}
                <input
                  className="ek-title-in"
                  value={r.title}
                  onChange={(e) => onRowTitle(r.id, e.target.value)}
                  placeholder="Text eingeben"
                />
              </div>
            </td>
            {cols.map((c, idx) => (
              <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
                {c.type === "total" ? (
                  numCell(fmt(sumBefore(cols, idx, (cc) => pn(r.vals[cc.id])), true), "#0b7f84")
                ) : (
                  <input
                    className="ek-in ek-num"
                    value={r.vals[c.id] || ""}
                    onChange={(e) => onCellInput(r.id, c.id, e.target.value)}
                    inputMode="decimal"
                    placeholder="–"
                  />
                )}
              </td>
            ))}
            <td style={{ width: 40, padding: "5px 12px 5px 4px", textAlign: "center" }}>
              <span className="ek-x" onClick={() => onRemoveRow(r.id)}>
                −
              </span>
            </td>
          </tr>
        );
      })}

      {/* closing (target from mapping) */}
      <tr className="ek-tr-close">
        <td style={{ padding: "8px 14px 8px 24px" }}>
          <div style={{ font: "700 13px/1.2 'Inter',sans-serif", color: "#1e2a30" }}>
            {p.closeLabel}
          </div>
        </td>
        {cols.map((c, idx) => (
          <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
            {c.type === "total"
              ? numCell(
                  fmt(
                    sumBefore(cols, idx, (cc) =>
                      cc.system ? p.sysClose[cc.id] || 0 : computed[cc.id],
                    ),
                  ),
                  "#0b7f84",
                )
              : numCell(fmt(c.system ? p.sysClose[c.id] || 0 : computed[c.id]), "#3f4d54")}
          </td>
        ))}
        <td style={{ width: 40, padding: "5px 12px 5px 4px", textAlign: "center" }} />
      </tr>

      {/* diff row ("Noch zu erfassen" → shows "Differenz zu …") */}
      <tr className="ek-tr-diff">
        <td style={{ padding: "8px 14px 8px 24px" }}>
          <div style={{ font: "600 11px/1.3 'Inter',sans-serif", color: "#8a6d2a" }}>
            Differenz zu {p.closeLabel}
          </div>
        </td>
        {cols.map((c, idx) => {
          if (c.type === "total") {
            let dv = 0;
            for (let i = 0; i < idx; i++) {
              const cc = cols[i];
              if (isVal(cc) && cc.system) dv += diff[cc.id] as number;
            }
            const ok = near0(dv);
            return (
              <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
                {numCell(ok ? "✓" : fmt(dv), ok ? "#15926B" : "#C77A18")}
              </td>
            );
          }
          if (!c.system)
            return (
              <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
                {numCell("–", "#B4BDC4")}
              </td>
            );
          const dv = diff[c.id] as number;
          const ok = near0(dv);
          return (
            <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...colDnDStyle(idx, c.id, colDragId, colDropIdx, cols.length),
            }}
          >
              {numCell(ok ? "✓" : fmt(dv), ok ? "#15926B" : "#C77A18")}
            </td>
          );
        })}
        <td style={{ width: 40, padding: "5px 12px 5px 4px", textAlign: "center" }} />
      </tr>
    </>
  );
}
