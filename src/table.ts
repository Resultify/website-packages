/**
 * The files the estimator is built from, both in src/:
 *
 *   hours.csv   one row for each item, or each option of an item (Menu: Simple, Advanced): its
 *               name, help text, hours for each design and the package it needs. It opens in a
 *               spreadsheet as it is
 *   config.ts   the rest: where each item is shown and what it counts, the rules (design rounds,
 *               project management, languages, pages), and each item's number in a link
 *
 * This file only reads and writes them, and puts them together in the rows the catalog reads.
 * What the cells mean is in catalog.ts.
 */
import hoursSource from "./hours.csv" with { type: "text" };

/** The columns of a row as the catalog reads it: hours.csv's cells and config.ts's values. */
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

/** hours.csv as it was built into the page. */
export const liveHoursText: string = hoursSource;

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
  /* A file saved by a spreadsheet may start with a byte-order mark */
  const start = text.startsWith("﻿") ? 1 : 0;
  for (let index = start; index < text.length; index += 1) {
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

/* ---------- The rules ---------- */

/** Every rule, in the order config.ts lists them. */
export const ruleNames = [
  "ai-variants-included",
  "ai-variants-max",
  "ai-variant-percent",
  "ai-discount-essential-percent",
  "ai-discount-growth-percent",
  "ai-discount-platform-percent",
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
  "pm-none-design-percent",
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

/* ---------- Link codes ---------- */

/** An item's number in a link, and its options' names: an option's number is its place, from 1. */
export type CodeEntry = { id: string; code: number; options: string[] };

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

/* ---------- hours.csv and config.ts ---------- */

/** hours.csv's columns, in order: each row's hours for each design, and the package it needs. */
export const hoursColumns = [
  "id",
  "item",
  "option",
  "help",
  "ai-design",
  "ai-build",
  "nimbly-design",
  "nimbly-build",
  "custom-design",
  "custom-build",
  "package",
] as const;

export type HoursColumn = (typeof hoursColumns)[number];
export type HoursRow = Record<HoursColumn, string>;

/** Where an item is shown: the `places` of catalog.ts, whose own `Place` also has "design". */
export type ItemPlace = "basics" | "shelf" | "blog" | "catalogue" | "membership";
/** What a row needs besides its hours: the old columns, left out when empty. */
export type RowConfig = {
  status?: "soon" | "hidden";
  unit?: string;
  start?: number;
  max?: number;
  /** "professional", "enterprise", or "enterprise from 3" */
  tier?: string;
};
export type ItemConfig = RowConfig & {
  place: ItemPlace;
  type?: "content" | "project";
  /** An option's own values, where its item's rows differ. */
  options?: Record<string, RowConfig>;
};
export type Config = {
  items: Record<string, ItemConfig>;
  rules: Record<RuleName, number | string>;
  linkCodes: CodeEntry[];
  /** The calculations page's presets: an estimator link's code (after the #), priced with each
      design. */
  calcEstimates: { title: string; link: string }[];
};

/** The rows of hours.csv. Read the same from the app's file and from a Google Sheets download. */
export function parseHours(text: string): HoursRow[] {
  return readTable(text, hoursColumns, "hours.csv");
}

/** hours.csv as text, always written the same way, so a change to one cell is a change to one line. */
export function serializeHours(rows: readonly HoursRow[]): string {
  return writeTable(hoursColumns, rows);
}

/** The rows the catalog reads: the hours of hours.csv with what config.ts says of each item. A value
    an option has in the config is its own; otherwise it is the item's, or empty. */
export function rowsFrom(rows: readonly HoursRow[], config: Config): Row[] {
  return rows.map((row) => {
    const item = config.items[row.id];
    if (!item) throw new Error(`config.ts has no item ${row.id}: every row of hours.csv needs one`);
    const own = row.option ? item.options?.[row.option] : undefined;
    const value = (field: keyof RowConfig) => String(own?.[field] ?? item[field] ?? "");
    return {
      id: row.id,
      item: row.item,
      option: row.option,
      place: item.place,
      type: item.type ?? "",
      status: value("status"),
      unit: value("unit"),
      start: value("start"),
      max: value("max"),
      "build-ai": row["ai-build"],
      "build-nimbly": row["nimbly-build"],
      "build-custom": row["custom-build"],
      "design-ai": row["ai-design"],
      "design-nimbly": row["nimbly-design"],
      "design-custom": row["custom-design"],
      package: row.package,
      tier: value("tier"),
      note: row.help,
    };
  });
}

/** The rules of config.ts, as the catalog reads them. Every rule must be there: read as empty, a
    lost package rule would be a valid "any package", and Custom design would quietly price as
    Essential. The dev server and the build run without the type check, so this checks it too. */
export function rulesFrom(config: Pick<Config, "rules">): Rules {
  const rules = {} as Rules;
  for (const name of ruleNames) {
    const value = (config.rules as Partial<Record<RuleName, number | string>>)[name];
    if (value === undefined) throw new Error(`config.ts has no rule ${name}`);
    rules[name] = String(value);
  }
  return rules;
}
