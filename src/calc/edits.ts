/* The calculations page's edits of hours.csv, and how a link holds them. Pure functions, shared by
   the page and the dev server's save.

   An edit is one cell of hours.csv: its row (id, and option when it has one), its column, the value
   the file had when the edit was made (was), and the new value (now). A link names a row by its link
   code in config.linkCodes, so it stays short and survives a renamed item:

     #e1.<edit>.<edit>…
     edit    <code>[-<option>]<column><was>~<now>
     option  the option's place in its entry's options, from 1; absent for an item without options
     column  a ai-design · b ai-build · c nimbly-design · d nimbly-build · e custom-design ·
             f custom-build · p package
     value   hours: a whole number. package: n (any), g (growth) or p (platform), then the number
             it is needed from, if any

   Menu · Simple, AI design 1 → 4 is 43-1a1~4; Page templates' package growth from 5 → from 3 is
   41pg5~g3. Edits are written sorted by code, option and column, so one set of edits is one link. */
import type { CodeEntry, HoursColumn, HoursRow, Row } from "../table.ts";

/** The columns the page edits, in the link's order. */
export const editColumns = [
  "ai-design",
  "ai-build",
  "nimbly-design",
  "nimbly-build",
  "custom-design",
  "custom-build",
  "package",
] as const satisfies readonly HoursColumn[];
export type EditColumn = (typeof editColumns)[number];
export const hourColumns = editColumns.filter((column) => column !== "package");

const letters = "abcdefp";

export type Edit = { id: string; option: string; column: EditColumn; was: string; now: string };

/** The units whose hours are entered in the estimate, not set in hours.csv: "hours", and catalog.ts's
    designInputUnit. Written here, not imported: catalog.ts builds its catalog from src/hours.csv as
    it loads, and the dev server's save must answer even when that file cannot be read. */
export const enteredUnits: readonly string[] = ["hours", "build and design hours"];

/** The row of hours.csv that only the file edits: each source's Custom option on the page stands
    for it. */
export const fileOnlyId = "catalogue-custom";

/** The prefix of a link's edits; a hash without it (an older /calc/#<estimate>) has none. */
export const editsPrefix = "e1.";

const sameCell = (a: Pick<Edit, "id" | "option" | "column">, b: typeof a) =>
  a.id === b.id && a.option === b.option && a.column === b.column;

/** Whether the page edits this cell. Hours a row takes in the estimate (its unit says so) and a
    project row's design hours stay empty in hours.csv; the custom catalogue's row is the file's. */
export function isEditable(row: Pick<Row, "id" | "unit" | "type">, column: EditColumn): boolean {
  if (row.id === fileOnlyId) return false;
  if (column === "package") return true;
  if (enteredUnits.includes(row.unit)) return false;
  return !(row.type === "project" && column.endsWith("-design"));
}

/** Most hours a cell takes: four digits. */
export const mostHours = 9999;

/** A cell's value as hours.csv writes it, or null when the column cannot take it: hours are whole
    numbers from 0 to 9999 ("05" is 5); a package is empty, growth or platform, then " from N". */
export function cellValue(column: EditColumn, text: string): string | null {
  const value = text.trim();
  if (column !== "package") {
    if (!/^\d{1,4}$/.test(value)) return null;
    return String(Number(value));
  }
  const match = /^(growth|platform)(?: from (\d{1,4}))?$/.exec(value);
  if (value === "") return "";
  if (!match) return null;
  if (match[2] === undefined) return match[1] ?? null;
  const from = Number(match[2]);
  return from >= 1 ? `${match[1]} from ${from}` : null;
}

/** A package cell's name and the number it is needed from ("" for from the start). */
export function packageParts(value: string): { name: "" | "growth" | "platform"; from: string } {
  const match = /^(growth|platform)(?: from (\d+))?$/.exec(value);
  if (!match) return { name: "", from: "" };
  return { name: match[1] === "growth" ? "growth" : "platform", from: match[2] ?? "" };
}

/** A package cell as the page says it: Any, Growth, Growth from 5. */
export function packageText(value: string): string {
  const { name, from } = packageParts(value);
  const named = name === "" ? "Any" : name === "growth" ? "Growth" : "Platform";
  return from ? `${named} from ${from}` : named;
}

/** A package cell in the link: g5 for "growth from 5". */
function packageCode(value: string): string {
  const match = /^(growth|platform)(?: from (\d+))?$/.exec(value);
  if (!match) return "n";
  return `${match[1] === "growth" ? "g" : "p"}${match[2] ?? ""}`;
}

function packageOf(code: string): string | null {
  const match = /^([ngp])(\d{1,4})?$/.exec(code);
  if (!match) return null;
  if (match[1] === "n") return match[2] === undefined ? "" : null;
  return cellValue(
    "package",
    `${match[1] === "g" ? "growth" : "platform"}${match[2] === undefined ? "" : ` from ${match[2]}`}`,
  );
}

const valueCode = (column: EditColumn, value: string) =>
  column === "package" ? packageCode(value) : value;
const valueOf = (column: EditColumn, code: string) =>
  column === "package" ? packageOf(code) : cellValue(column, code);

/** Where an edit sits in the link's order, or null when its row has no code. */
function place(edit: Edit, codes: readonly CodeEntry[]): [number, number, number] | null {
  const entry = codes.find((item) => item.id === edit.id);
  if (!entry) return null;
  const option = edit.option ? entry.options.indexOf(edit.option) + 1 : 0;
  if (edit.option && option === 0) return null;
  return [entry.code, option, editColumns.indexOf(edit.column)];
}

/** The edits as a link's hash, without the #: empty when there are none. An edit whose row has no
    code is left out. */
export function encodeEdits(edits: readonly Edit[], codes: readonly CodeEntry[]): string {
  const placed = edits.flatMap((edit) => {
    const at = place(edit, codes);
    return at ? [{ edit, at }] : [];
  });
  if (placed.length === 0) return "";
  placed.sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1] || a.at[2] - b.at[2]);
  const parts = placed.map(({ edit, at: [code, option, column] }) => {
    const row = option ? `${code}-${option}` : String(code);
    return `${row}${letters[column]}${valueCode(edit.column, edit.was)}~${valueCode(edit.column, edit.now)}`;
  });
  return `${editsPrefix}${parts.join(".")}`;
}

/** The edits of a link's hash (with or without the #), and how many of them could not be read: a
    part that does not parse, or names a code, option or value that does not exist. A hash without
    the prefix holds no edits. Two edits of one cell: the last counts. */
export function decodeEdits(
  hash: string,
  codes: readonly CodeEntry[],
): { edits: Edit[]; unread: number } {
  const text = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!text.startsWith(editsPrefix)) return { edits: [], unread: 0 };
  const edits: Edit[] = [];
  let unread = 0;
  for (const part of text.slice(editsPrefix.length).split(".")) {
    if (part === "") continue;
    const match = /^(\d+)(?:-(\d+))?([a-fp])([^~]*)~(.*)$/.exec(part);
    const entry = match ? codes.find((item) => item.code === Number(match[1])) : undefined;
    const option = match?.[2] === undefined ? "" : entry?.options[Number(match[2]) - 1];
    const column = editColumns[letters.indexOf(match?.[3] ?? "")];
    if (!match || !entry || option === undefined || !column) {
      unread += 1;
      continue;
    }
    /* An item with options is named with one, and one without, without */
    if ((option === "") !== (entry.options.length === 0)) {
      unread += 1;
      continue;
    }
    const was = valueOf(column, match[4] ?? "");
    const now = valueOf(column, match[5] ?? "");
    if (was === null || now === null) {
      unread += 1;
      continue;
    }
    const edit: Edit = { id: entry.id, option, column, was, now };
    const at = edits.findIndex((item) => sameCell(item, edit));
    if (at >= 0) edits.splice(at, 1);
    edits.push(edit);
  }
  return { edits, unread };
}

const rowOf = (rows: readonly HoursRow[], edit: Pick<Edit, "id" | "option">) =>
  rows.find((row) => row.id === edit.id && row.option === edit.option);

/** hours.csv's rows with the edits in them. An edit of a row the file lacks changes nothing. */
export function applyEdits(rows: readonly HoursRow[], edits: readonly Edit[]): HoursRow[] {
  return rows.map((row) => {
    const own = edits.filter((edit) => edit.id === row.id && edit.option === row.option);
    if (own.length === 0) return row;
    const next = { ...row };
    for (const edit of own) next[edit.column] = edit.now;
    return next;
  });
}

/** The edit of one cell, put in place of any other of it. Back to the file's value, it is none. */
export function setEdit(
  edits: readonly Edit[],
  old: readonly HoursRow[],
  cell: Pick<Edit, "id" | "option" | "column">,
  now: string,
): Edit[] {
  const others = edits.filter((edit) => !sameCell(edit, cell));
  const was = rowOf(old, cell)?.[cell.column];
  if (was === undefined || was === now) return others;
  return [...others, { ...cell, was, now }];
}

/** The edit of a cell, if it has one. */
export function editOf(
  edits: readonly Edit[],
  cell: Pick<Edit, "id" | "option" | "column">,
): Edit | undefined {
  return edits.find((edit) => sameCell(edit, cell));
}

/** Edits checked against hours.csv's rows (Old): one whose new value is the file's is done with;
    one of a row or cell the page does not edit, or that the catalog refuses (tried in order, each
    with those kept before it), is dropped and counted. One made on other hours (its was is not the
    file's) is kept: the page marks it. */
export function checkEdits(
  edits: readonly Edit[],
  old: readonly HoursRow[],
  read: readonly Pick<Row, "id" | "option" | "unit" | "type">[],
  works: (edits: readonly Edit[]) => boolean,
): { edits: Edit[]; dropped: number } {
  const kept: Edit[] = [];
  let dropped = 0;
  for (const edit of edits) {
    const row = rowOf(old, edit);
    const own = read.find((item) => item.id === edit.id && item.option === edit.option);
    if (!row || !own || !isEditable(own, edit.column)) {
      dropped += 1;
      continue;
    }
    if (row[edit.column] === edit.now) continue;
    if (!works([...kept, edit])) {
      dropped += 1;
      continue;
    }
    kept.push(edit);
  }
  return { edits: kept, dropped };
}

/** Edits made on other hours than the file has now. */
export function madeOnOther(edits: readonly Edit[], old: readonly HoursRow[]): Edit[] {
  return edits.filter((edit) => rowOf(old, edit)?.[edit.column] !== edit.was);
}
