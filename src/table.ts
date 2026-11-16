/**
 * The files the estimator is built from, all in src/:
 *
 *   estimator.csv   one row for each item, or each option of an item (Menu: Simple, Advanced)
 *   rules.csv       the few prices that are not hours per item: design rounds, languages, pages
 *   link-codes.csv  the number each item and option has in a link. Kept by the app: Save on the
 *                   calculations page and the build add new items to it. Never edited by hand
 *
 * This file only reads and writes them. What the cells mean is in catalog.ts.
 */
import codesSource from "./link-codes.csv" with { type: "text" };
import source from "./estimator.csv" with { type: "text" };
import rulesSource from "./rules.csv" with { type: "text" };

export const columns = [
  "id",
  "item",
  "option",
  "place",
  "type",
  "status",
  "unit",
  "start",
  "max",
  "build-ai",
  "build-nimbly",
  "build-custom",
  "design-ai",
  "design-nimbly",
  "design-custom",
  "package",
  "tier",
  "note",
] as const;

export type Column = (typeof columns)[number];
export type Row = Record<Column, string>;

/** The design choices of an estimate. */
export const choices = ["ai", "nimbly", "custom", "none"] as const;
export type Choice = (typeof choices)[number];
/** The choices that have their own hours: build and design hours for each. With no design, the
    build hours are Custom's. */
export const designKinds = ["ai", "nimbly", "custom"] as const;
export type DesignKind = (typeof designKinds)[number];

/** Whose build hours a design choice uses. */
export function buildKind(choice: Choice): DesignKind {
  return choice === "none" ? "custom" : choice;
}

/** The files as they were built into the page. */
export const liveText: string = source;
export const liveRulesText: string = rulesSource;
export const liveCodesText: string = codesSource;

/** Cells of CSV text. Quoted fields may hold commas, quotes (doubled) and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let wasQuoted = false;
  const endField = () => {
    row.push(field);
    field = "";
    wasQuoted = false;
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"' && field === "" && !wasQuoted) {
      quoted = true;
      wasQuoted = true;
    } else if (char === ",") endField();
    else if (char === "\n") endRow();
    else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("The table has a quote that never closes");
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

function cell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function readTable<Name extends string>(text: string, names: readonly Name[], what: string) {
  const [head, ...body] = parseCsv(text);
  if (!head) throw new Error(`${what} is empty`);
  if (head.length !== names.length || head.some((name, index) => name.trim() !== names[index])) {
    throw new Error(`${what}'s columns must be: ${names.join(", ")}`);
  }
  return body.map((cells, index) => {
    if (cells.length > names.length) {
      throw new Error(
        `${what}, line ${index + 2} (${cells[0]}) has ${cells.length} cells, not ${names.length}`,
      );
    }
    const row = {} as Record<Name, string>;
    names.forEach((name, at) => {
      row[name] = (cells[at] ?? "").trim();
    });
    return row;
  });
}

function writeTable<Name extends string>(
  names: readonly Name[],
  rows: readonly Record<Name, string>[],
): string {
  const lines = [names.join(",")];
  for (const row of rows) lines.push(names.map((name) => cell(row[name])).join(","));
  return `${lines.join("\n")}\n`;
}

/* ---------- The items ---------- */

export function parseTable(text: string): Row[] {
  return readTable(text, columns, "The table");
}

/** The table as text, always written the same way, so a change to one cell is a change to one line. */
export function serializeTable(rows: readonly Row[]): string {
  return writeTable(columns, rows);
}

/** What names a row while it is edited: its item, and its option when it has one. A row keeps the
    name it was read with when its option is renamed, so its other changed cells stay with it. */
const keys = new WeakMap<Row, string>();
export function rowKey(row: Row): string {
  return keys.get(row) ?? (row.option ? `${row.id}·${row.option}` : row.id);
}

/** Cells that differ from the table, by "row-key column". */
export type Cells = Record<string, string>;

export function cellKey(row: Row, column: Column): string {
  return `${rowKey(row)} ${column}`;
}

export function applyCells(rows: readonly Row[], cells: Cells): Row[] {
  return rows.map((row) => {
    const next = { ...row };
    keys.set(next, rowKey(row));
    for (const column of columns) {
      const value = cells[cellKey(row, column)];
      if (value !== undefined) next[column] = value.trim();
    }
    return next;
  });
}

/* ---------- The rules ---------- */

/** Every rule, in the order the file lists them. */
export const ruleNames = [
  "ai-variants-included",
  "ai-variants-max",
  "ai-variant-percent",
  "ai-feedback-included",
  "ai-feedback-each",
  "ai-feedback-max",
  "nimbly-feedback-included",
  "nimbly-feedback-each",
  "nimbly-feedback-max",
  "custom-feedback-included",
  "custom-feedback-each",
  "custom-feedback-max",
  "ai-package",
  "nimbly-package",
  "custom-package",
  "none-package",
  "pm-percent",
  "languages-included",
  "languages-second",
  "languages-each",
  "languages-max",
  "languages-growth-from",
  "languages-professional-from",
  "pages-start",
  "pages-max",
  "pages-professional-from",
] as const;

export type RuleName = (typeof ruleNames)[number];
export type Rules = Record<RuleName, string>;

export function parseRules(text: string): Rules {
  const rules = Object.fromEntries(ruleNames.map((name) => [name, ""])) as Rules;
  for (const { rule, value } of readTable(text, ["rule", "value"] as const, "The rules")) {
    const name = ruleNames.find((item) => item === rule);
    if (!name) throw new Error(`The rules have no rule called ${rule}`);
    rules[name] = value;
  }
  return rules;
}

export function serializeRules(rules: Rules): string {
  return writeTable(
    ["rule", "value"] as const,
    ruleNames.map((name) => ({ rule: name, value: rules[name] })),
  );
}

/* ---------- Link codes ---------- */

/** An item's number in a link, and its options' names: an option's number is its place, from 1. */
export type CodeEntry = { id: string; code: number; options: string[] };

export function parseCodes(text: string): CodeEntry[] {
  return readTable(text, ["id", "code", "options"] as const, "The link codes").map((entry) => {
    const code = Number(entry.code);
    if (!Number.isInteger(code) || code < 1) {
      throw new Error(`The link codes: ${entry.id} has code "${entry.code}"`);
    }
    return { id: entry.id, code, options: entry.options ? entry.options.split("|") : [] };
  });
}

export function serializeCodes(entries: readonly CodeEntry[]): string {
  return writeTable(
    ["id", "code", "options"] as const,
    [...entries]
      .sort((a, b) => a.code - b.code)
      .map((entry) => ({
        id: entry.id,
        code: String(entry.code),
        options: entry.options.join("|"),
      })),
  );
}

/** The link codes with every item and option of these rows in them: an item that has none gets the
    next after the highest ever given, an option the next place in its item's list. Nothing is ever
    taken out, so a number in a link is never given to something else. */
export function withCodes(
  entries: readonly CodeEntry[],
  items: readonly { id: string; option: string }[],
): CodeEntry[] {
  const out = entries.map((entry) => ({ ...entry, options: [...entry.options] }));
  const byId = new Map(out.map((entry) => [entry.id, entry]));
  let highest = Math.max(0, ...out.map((entry) => entry.code));
  for (const { id, option } of items) {
    let entry = byId.get(id);
    if (!entry) {
      highest += 1;
      entry = { id, code: highest, options: [] };
      out.push(entry);
      byId.set(id, entry);
    }
    if (option && !entry.options.includes(option)) entry.options.push(option);
  }
  return out;
}

/** A short name for one version of the table, to tell whether a draft was made from this one. */
export function tableId(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
