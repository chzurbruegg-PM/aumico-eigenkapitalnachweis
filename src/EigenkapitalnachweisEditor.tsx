import { useCallback, useEffect, useRef, useState } from "react";
import type { Col, EkData, Period } from "./types";
import { fmt, fmtInput, isNumeric, pn } from "./format";
import { colOpen, isVal, near0, reinsert, sumForTotal } from "./calc";
import { seed } from "./seed";
import "./eigenkapital.css";

// Default prose content for the two editable text blocks (Einleitung /
// Anmerkungen). Kept as constant HTML so React never overwrites user edits.
const EINLEITUNG_HTML = "";
const ANMERKUNGEN_HTML = "";

// Per-column cell style, applied to the header cell AND every body cell:
//  - total columns get a report-style grey band over the full height (#8)
//  - during a column drag, the dragged column is tinted and a full-height
//    insertion line is drawn at the drop position
function cellStyle(
  c: Col,
  idx: number,
  draggedId: string | null,
  dropIdx: number | null,
  colCount: number,
): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (c.type === "total") s.background = "#f3f5f6"; // greyed like the final report
  if (draggedId) {
    if (c.id === draggedId) s.background = "rgba(15,163,168,0.10)"; // dragged column wins
    if (dropIdx != null) {
      if (dropIdx === idx) s.boxShadow = "inset 2px 0 0 0 #0fa3a8";
      else if (idx === colCount - 1 && dropIdx === colCount) s.boxShadow = "inset -2px 0 0 0 #0fa3a8";
    }
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
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null); // "add column" chooser
  // pending destructive action awaiting confirmation in the modal
  const [confirm, setConfirm] = useState<
    | { kind: "col"; id: string; label: string }
    | { kind: "row"; pid: string; rid: string; label: string }
    | null
  >(null);
  const liveDropIdx = useRef<number | null>(null); // latest insertion index during a drag
  // floating preview chip that follows the cursor while dragging (like CDK/dnd-kit)
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; label: string } | null>(null);

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
  const valColIds = (d: EkData) => d.cols.filter((c) => c.type !== "total").map((c) => c.id);
  const addTotalCol = () =>
    update((d) => {
      // A new total sums every current value column by default; configurable via ⋮.
      // Manually added → system:false, so it stays deletable.
      d.cols.push({ id: "c" + d.uid++, title: "Total", system: false, type: "total", sources: valColIds(d) });
    });
  // Toggle whether a value column is part of a total column's sum.
  const toggleTotalSource = (totalId: string, colId: string) =>
    update((d) => {
      const t = d.cols.find((c) => c.id === totalId);
      if (!t) return;
      const base = t.sources ?? valColIds(d);
      t.sources = base.includes(colId) ? base.filter((x) => x !== colId) : [...base, colId];
    });
  const removeCol = (cid: string) =>
    update((d) => {
      d.cols = d.cols.filter((c) => c.id !== cid);
      d.cols.forEach((c) => {
        if (c.sources) c.sources = c.sources.filter((x) => x !== cid);
      });
      d.periods.forEach((p) => {
        p.rows.forEach((r) => delete r.vals[cid]);
        delete p.manOpen[cid];
      });
    });
  const moveRowByInsert = (pid: string, from: number, beforeIdx: number) =>
    update((d) => {
      const p = P(d, pid);
      p.rows = reinsert(p.rows, from, beforeIdx);
    });
  const moveColByInsert = (from: number, beforeIdx: number) =>
    update((d) => {
      d.cols = reinsert(d.cols, from, beforeIdx);
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
    setDragGhost({ x: e.clientX, y: e.clientY, label: cols[fromIdx].title });
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
      setDragGhost((g) => (g ? { ...g, x: ev.clientX, y: ev.clientY } : g));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const ins = liveDropIdx.current;
      if (ins != null) moveColByInsert(fromIdx, ins);
      liveDropIdx.current = null;
      setColDrag(null);
      setColDropIdx(null);
      setDragGhost(null);
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
    const rowLabel =
      data.periods.find((p) => p.id === pid)?.rows[fromIdx]?.title?.trim() || "Bewegung";
    setDragGhost({ x: e.clientX, y: e.clientY, label: rowLabel });
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
      setDragGhost((g) => (g ? { ...g, x: ev.clientX, y: ev.clientY } : g));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const ins = liveDropIdx.current;
      if (ins != null) moveRowByInsert(pid, fromIdx, ins);
      liveDropIdx.current = null;
      setRowDrag(null);
      setRowDropIdx(null);
      setDragGhost(null);
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

  // close the "add column" chooser on any outside pointer-down / Escape
  useEffect(() => {
    if (!addMenu) return;
    const onDown = (ev: PointerEvent) => {
      const t = ev.target as HTMLElement;
      if (!t.closest(".ek-menu") && !t.closest(".ek-addcol")) setAddMenu(null);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setAddMenu(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [addMenu]);

  // Escape cancels the delete confirmation
  useEffect(() => {
    if (!confirm) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setConfirm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

  // Route destructive actions through the confirmation modal instead of deleting
  // immediately.
  const requestDeleteCol = (cid: string) => {
    const c = data.cols.find((c) => c.id === cid);
    setMenuCol(null);
    setConfirm({ kind: "col", id: cid, label: c?.title?.trim() || "Spalte ohne Titel" });
  };
  const requestDeleteRow = (pid: string, rid: string) => {
    const r = data.periods.find((p) => p.id === pid)?.rows.find((r) => r.id === rid);
    setConfirm({ kind: "row", pid, rid, label: r?.title?.trim() || "Zeile ohne Titel" });
  };
  const confirmDelete = () => {
    if (!confirm) return;
    if (confirm.kind === "col") removeCol(confirm.id);
    else removeRow(confirm.pid, confirm.rid);
    setConfirm(null);
  };

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
                ...cellStyle(c, idx, colDrag, colDropIdx, cols.length),
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
  // Nur manuell ergänzte Spalten sind löschbar. System-Spalten (Kontogruppen aus
  // der Saldobilanz) UND System-Total-Spalten bleiben bestehen.
  const menuRemovable = menuTarget ? !menuTarget.system : false;

  return (
    <>
    <div style={{ margin: "0 0 14px" }}>
      <RichTextBlock
        label="Einleitung"
        placeholder="Einleitenden Text vor dem Eigenkapitalnachweis erfassen …"
        addLabel="Einleitung hinzufügen"
        initialHtml={EINLEITUNG_HTML}
      />
    </div>
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
              in CHF
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            <button
              className="ek-btn ek-addcol"
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setAddMenu((m) => (m ? null : { x: r.right - 232, y: r.bottom + 6 }));
              }}
            >
              + Neue Spalte <span style={{ fontSize: 9, opacity: 0.85 }}>▾</span>
            </button>
          </div>
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
                    onRemoveRow={(rid) => requestDeleteRow(p.id, rid)}
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
    </div>

    <div style={{ margin: "14px 0 0" }}>
      <RichTextBlock
        label="Anmerkungen"
        placeholder="Anmerkungen nach dem Eigenkapitalnachweis erfassen …"
        addLabel="Anmerkung hinzufügen"
        initialHtml={ANMERKUNGEN_HTML}
      />
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
        {menuTarget.type === "total" && (
          <>
            <div className="ek-menu-sep" />
            <div className="ek-menu-label">Summiert diese Spalten</div>
            {cols
              .filter((vc) => vc.type !== "total")
              .map((vc) => {
                const srcs =
                  menuTarget.sources ?? cols.filter((x) => x.type !== "total").map((x) => x.id);
                return (
                  <label className="ek-menu-check" key={vc.id}>
                    <input
                      type="checkbox"
                      checked={srcs.includes(vc.id)}
                      onChange={() => toggleTotalSource(menuTarget.id, vc.id)}
                    />
                    <span>{vc.title}</span>
                  </label>
                );
              })}
          </>
        )}
        {menuRemovable && (
          <>
            <div className="ek-menu-sep" />
            <button className="ek-menu-item danger" onClick={() => requestDeleteCol(menuCol.id)}>
              Löschen
            </button>
          </>
        )}
      </div>
    )}

    {addMenu && (
      <div className="ek-menu" style={{ top: addMenu.y, left: Math.max(8, addMenu.x), minWidth: 232 }}>
        <div className="ek-menu-label">Spaltentyp wählen</div>
        <button
          className="ek-menu-item ek-menu-item-desc"
          onClick={() => {
            addCol();
            setAddMenu(null);
          }}
        >
          Wertspalte
          <span className="ek-menu-hint">Position mit erfassbaren Werten</span>
        </button>
        <button
          className="ek-menu-item ek-menu-item-desc"
          onClick={() => {
            addTotalCol();
            setAddMenu(null);
          }}
        >
          Total-Spalte
          <span className="ek-menu-hint">Summe ausgewählter Wertspalten</span>
        </button>
      </div>
    )}

    {confirm && (
      <div className="ek-modal-overlay" onPointerDown={() => setConfirm(null)}>
        <div
          className="ek-modal"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="ek-modal-title">
            {confirm.kind === "col" ? "Spalte löschen" : "Zeile löschen"}
          </div>
          <div className="ek-modal-text">
            {confirm.kind === "col" ? "Die Spalte " : "Die Zeile "}
            <b>„{confirm.label}"</b>
            {confirm.kind === "col"
              ? " und alle darin erfassten Werte werden gelöscht. "
              : " wird gelöscht. "}
            Diese Aktion kann nicht rückgängig gemacht werden.
          </div>
          <div className="ek-modal-actions">
            <button className="ek-btn-ghost" onClick={() => setConfirm(null)} autoFocus>
              Abbrechen
            </button>
            <button className="ek-btn-danger" onClick={confirmDelete}>
              Löschen
            </button>
          </div>
        </div>
      </div>
    )}

    {dragGhost && (
      <div className="ek-drag-ghost" style={{ top: dragGhost.y + 16, left: dragGhost.x + 16 }}>
        <span className="ek-drag-ghost-grip">⣿</span>
        <span className="ek-drag-ghost-label">{dragGhost.label || "—"}</span>
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

// --- numeric amount input: formats on blur (apostrophe grouping, ASCII minus),
// flags non-numeric input, and keeps the raw string round-trippable via pn(). ---
function NumberInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [invalid, setInvalid] = useState(false);
  return (
    <input
      className={"ek-in ek-num" + (invalid ? " ek-invalid" : "")}
      value={value}
      inputMode="decimal"
      placeholder="–"
      onChange={(e) => {
        if (invalid) setInvalid(false);
        onChange(e.target.value);
      }}
      onBlur={(e) => {
        const raw = e.target.value;
        if (raw.trim() === "") {
          setInvalid(false);
          return;
        }
        if (!isNumeric(raw)) {
          setInvalid(true);
          return;
        }
        setInvalid(false);
        const f = fmtInput(raw);
        if (f !== raw) onChange(f);
      }}
    />
  );
}

// --- one period's table body: opening, movements, closing, diff ---
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
              ...cellStyle(c, idx, colDragId, colDropIdx, cols.length),
            }}
          >
            {c.type === "total"
              ? numCell(fmt(sumForTotal(c, cols, (cc) => colOpen(p, cc))), "#0b7f84")
              : c.system
                ? numCell(fmt(p.sysOpen[c.id] || 0), "#3f4d54")
                : (
                    <NumberInput
                      value={p.manOpen[c.id] || ""}
                      onChange={(v) => onManOpen(c.id, v)}
                    />
                  )}
          </td>
        ))}
        <td style={{ width: 40, padding: "5px 12px 5px 4px", textAlign: "center" }} />
      </tr>

      {/* movement rows */}
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
              ...cellStyle(c, idx, colDragId, colDropIdx, cols.length),
            }}
          >
                {c.type === "total" ? (
                  numCell(fmt(sumForTotal(c, cols, (cc) => pn(r.vals[cc.id])), true), "#0b7f84")
                ) : (
                  <NumberInput
                    value={r.vals[c.id] || ""}
                    onChange={(v) => onCellInput(r.id, c.id, v)}
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
              ...cellStyle(c, idx, colDragId, colDropIdx, cols.length),
            }}
          >
            {c.type === "total"
              ? numCell(
                  fmt(
                    sumForTotal(c, cols, (cc) =>
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
            const dv = sumForTotal(c, cols, (cc) => (cc.system ? (diff[cc.id] ?? 0) : 0));
            const ok = near0(dv);
            return (
              <td
            key={c.id}
            style={{
              padding: "5px 12px",
              textAlign: "right",
              ...cellStyle(c, idx, colDragId, colDropIdx, cols.length),
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
              ...cellStyle(c, idx, colDragId, colDropIdx, cols.length),
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
              ...cellStyle(c, idx, colDragId, colDropIdx, cols.length),
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
