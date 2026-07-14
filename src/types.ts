// Data model — mirrors the DC prototype (Eigenkapitalnachweis.dc.html) exactly.

export type ColType = "value" | "total";

export interface Col {
  id: string;
  title: string;
  /** System columns come from the account mapping and cannot be title-removed
   *  unless they are total columns. Added value columns are non-system. */
  system: boolean;
  type: ColType;
  /** For `total` columns: the value-column ids this total sums. Absent = sum all
   *  value columns. Configurable per total column (see the ⋮ menu). */
  sources?: string[];
}

export type RowType = "movement";

export interface MovementRow {
  id: string;
  type: RowType;
  title: string;
  /** Manual movement amounts keyed by column id (stored as raw input strings). */
  vals: Record<string, string>;
}

export interface Period {
  id: string;
  year: string;
  openLabel: string;
  closeLabel: string;
  /** Opening balances from the mapping (read-only), keyed by column id. */
  sysOpen: Record<string, number>;
  /** Closing target balances from the mapping (read-only), keyed by column id. */
  sysClose: Record<string, number>;
  /** Manual opening balances for non-system (user-added) columns. */
  manOpen: Record<string, string>;
  rows: MovementRow[];
}

export interface EkData {
  uid: number;
  cols: Col[];
  periods: Period[];
}
