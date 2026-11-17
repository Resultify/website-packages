/* The calculations page: the files behind the estimator (src/estimator.csv and src/rules.csv), with
   every number and rule in them open to change. It runs on the dev server only (bun run dev, /calc/).

   The table is laid out as the estimator is: the site basics, the shelf, the Blog and the Product
   catalogue. Save writes the files; the estimator on the same server uses them at once. Everything
   is compared with the last commit, so git holds the drafts: a change is published by committing
   it, and undone with git checkout. Changes not saved yet are kept in this tab. */
import type { Tables } from "./api.ts";
import {
  buildCatalog,
  type Catalog,
  type DesignChoice,
  designChoices,
  designInputUnit,
  type Edition,
  editionLabel,
  hasStatus,
  hasTile,
  isSource,
  partsOf,
  placeName,
  projectName,
  places,
  startingDesign,
  tileMode,
  withCatalog,
} from "../catalog.ts";
import { designFor, hoursLabel, lineHours } from "../controls.ts";
import { h, type Kid } from "../dom.ts";
import { codeIn } from "../link.ts";
import { type PreviewFiles, previewAddress, previewKey } from "../preview.ts";
import {
  decodeSelection,
  encodeSelection,
  formatHours,
  managementLineId,
  type Quote,
  quote,
  type Selection,
  selectionForShape,
  setTile,
} from "../quote.ts";
import {
  applyCells,
  type Cells,
  type CodeEntry,
  type Column,
  cellKey,
  columns,
  designKinds,
  parseCodes,
  parseRules,
  parseTable,
  type Row,
  type RuleName,
  type Rules,
  rowKey,
  ruleNames,
  serializeCodes,
  serializeRules,
  serializeTable,
} from "../table.ts";

const found = document.querySelector("#calc");
if (!(found instanceof HTMLElement)) throw new Error("Missing #calc");
const root: HTMLElement = found;

/* ---------- What the page knows ---------- */

/** What the page's own estimates add to the starting estimate: a row of the Estimates panel, with
    each design that has design hours. title: the row's heading. */
type Setup = { name: string; title: string; adds: readonly string[] };
const setups: readonly Setup[] = [
  { name: "Starting estimate", title: "Starting estimate", adds: [] },
  { name: "Blog and Search", title: "+ Blog and Search", adds: ["blog-setups", "search"] },
  {
    name: "Blog, Search and Products",
    title: "+ Products",
    adds: ["blog-setups", "search", "product-catalogue"],
  },
];
/** The panel's columns: each design that has design hours, in the estimator's order. */
const pricedDesigns = designChoices.filter((choice) => choice.kind !== "none");
/** A design's name in the panel, as the Design panel and the table name it. */
const designShort: Record<DesignChoice["kind"], string> = {
  ai: "AI",
  nimbly: "Nimbly",
  custom: "Custom",
  none: "None",
};

/** An estimate on the right. One of the page's own is made from the files it is priced with, so a
    change to what an estimate starts with (an option, a quantity) shows in it; its code is the
    one the saved files make, for its link. */
type Estimate = { name: string; code: string; design?: DesignChoice; setup?: Setup };

/** The estimate a new page starts with, with a design and what a row adds (each at what the table
    starts it with), under the catalog in use. */
const startWith = (design: DesignChoice, adds: readonly string[] = []) =>
  adds
    .filter((id) => hasTile(id))
    .reduce(
      (selection, id) => setTile(selection, id, true),
      setTile(selectionForShape("essential"), design.id, true),
    );

/** The page's own estimates: each row, once for each design. */
const startingEstimates: Estimate[] = setups.flatMap((setup) =>
  pricedDesigns.map((choice) => ({
    name: `${setup.name} · ${choice.label}`,
    code: encodeSelection(startWith(choice, setup.adds)),
    design: choice,
    setup,
  })),
);

/** An estimate under a catalog: one of the page's own made with it, any other read from its code. */
function selectionOf(item: Estimate, catalog: Catalog): Selection | null {
  return withCatalog(catalog, () =>
    item.design ? startWith(item.design, item.setup?.adds) : decodeSelection(item.code),
  );
}

/** The code of an estimate under a catalog, for the preview of this page's files. */
function codeWith(item: Estimate, catalog: Catalog): string {
  const selection = selectionOf(item, catalog);
  return selection ? withCatalog(catalog, () => encodeSelection(selection)) : item.code;
}

const unsavedKey = "website-packages.unsaved";
/** Items added on this page, new items taken out again, and rules changed, until Save. */
const unsavedRowsKey = "website-packages.unsaved-rows";
/** Set on Save: the dev server reloads this page once the file changes, and the page says Saved then. */
const savedKey = "website-packages.saved";

type AddForm = { label: string; type: string; hours: string; unit: string; design: string };
const emptyForm: AddForm = { label: "", type: "", hours: "fixed", unit: "", design: "" };

const state = {
  /** The files on disk, and what was read from them. */
  savedTable: "",
  savedRulesText: "",
  savedRows: [] as Row[],
  savedRules: null as Rules | null,
  codes: [] as CodeEntry[],
  /** The table and rules in the last commit; null when there are none, or this code cannot read them. */
  committedRows: null as Row[] | null,
  committedRules: null as Rules | null,
  /** Cells changed on this page and not saved yet, by "row-key column". */
  cells: {} as Cells,
  /** Rules changed on this page and not saved yet. */
  rules: {} as Partial<Rules>,
  /** Items added on this page and not saved yet. */
  added: [] as Row[],
  /** Saved items that are not in the last commit, taken out on this page: by row key. */
  dropped: [] as string[],
  /** An item just added: its name gets the focus. */
  reveal: "",
  addError: "",
  /** What the Add an item form holds: kept through a redraw, and while it says what is missing. */
  addForm: { ...emptyForm },
  loadError: "",
  saveError: "",
  saving: false,
  /** A preview of the estimator is open: it follows every change made here. */
  previewing: false,
  /** The estimate in the address, when there is one. */
  code: codeIn(location.hash),
  /** Which estimate the table's last columns show. */
  picked: 0,
  said: new Map<string, string>(),
  linkError: "",
};

/* ---------- Words ---------- */

type Help = { name: string; text: string; example?: string };

/* Each design choice, named as the Design panel names it, with its design and build hours side by
   side */
const designPairs = [
  ["AI", "design-ai", "build-ai"],
  ["Nimbly", "design-nimbly", "build-nimbly"],
  ["Custom", "design-custom", "build-custom"],
] as const;
const hourColumns: readonly Column[] = designPairs.flatMap(([, design, build]) => [design, build]);

/** What each column is, for the popups and the list of changes. */
const help: Record<Column, Help> = {
  id: { name: "Id", text: "The item's name in the code. Made from its name when it is added." },
  item: {
    name: "Name",
    text: "The item as the estimator names it. An item with options has its name once, with each option's name under it.",
    example: "Menu · Simple, Advanced",
  },
  option: {
    name: "Option",
    text: "One of the item's choices; an estimate has one of them. Written as Group: Option, it sits under a small heading in the estimator. A link knows an option by its name: renamed, links that had it open with the option the item starts with.",
    example: "HubDB · Dynamic pages: Simple",
  },
  place: {
    name: "Place",
    text: "Where the estimator shows the item: the site basics, the shelf, the Blog or the Product catalogue.",
  },
  type: {
    name: "Type",
    text: "Build: its hours are build hours. Content: they are content hours, counted apart, and the item sits with Content in the estimate (items of the shelf). Project: the work around the site, as the kick-off and training are, counted with project management (the site basics and the shelf). Design hours are design hours whatever the type.",
  },
  status: {
    name: "Status",
    text: "Live: ready to add or choose. Soon: shown, but locked. Hidden: not shown anywhere, and left out of every estimate. Each option has its own, and so does each part added on its own (Recent blog posts, Favorite products, Related products, Social sign-in, Member area). The site basics, the Blog's templates and Memberships' access groups are always shown. A source of products is live while one of its options is.",
  },
  unit: {
    name: "Unit",
    text: "What the item counts, such as templates. Empty: it is on or off. hours: its hours are entered in the estimate.",
  },
  start: {
    name: "Start",
    text: "The quantity an item starts at when it is added, or in a new estimate for the site basics. For an item with options: the option it starts with.",
    example: "Page templates: 3",
  },
  max: {
    name: "Max",
    text: "The highest quantity, or the most hours that can be entered. A link with more is cut to it.",
    example: "Sections: 40",
  },
  "build-ai": {
    name: "Build hours with AI generated design",
    text: "For each unit when the item counts something, for the item otherwise.",
    example: "Sections: 4, so 8 sections are 32h",
  },
  "build-nimbly": {
    name: "Build hours with Nimbly design",
    text: "Counted the same way.",
  },
  "build-custom": {
    name: "Build hours with Custom design, or none",
    text: "Custom design and no design build the same. Counted the same way.",
  },
  "design-ai": {
    name: "Design hours, AI generated",
    text: "While AI generated design is chosen: for each unit when the item counts something, for the item otherwise.",
    example: "Sections: 1, so 8 sections add 8h",
  },
  "design-nimbly": {
    name: "Design hours, Nimbly",
    text: "While Nimbly design is chosen, counted as AI's.",
    example: "Sections: 3, so 8 sections add 24h",
  },
  "design-custom": {
    name: "Design hours, Custom",
    text: "While Custom design is chosen, counted as AI's.",
    example: "Sections: 3, so 8 sections add 24h",
  },
  package: {
    name: "Package it needs",
    text: "Growth or Platform. With from: from that quantity on. On an option: while that option is chosen. Any: it needs none.",
    example: "Page templates: Growth from 5",
  },
  tier: {
    name: "HubSpot tier it needs",
    text: "Content Hub Professional (Pro) or Enterprise, the same way as the package. Starter: it needs none.",
    example: "HubDB section: Pro",
  },
  note: { name: "Note", text: "The line under the item's name in the estimator." },
};

function ownHelp(picked: Estimate): Record<"qty" | "build" | "design", Help> {
  return {
    qty: {
      name: `In ${picked.name}`,
      text: 'How much of the item the chosen estimate has: its quantity, the hours entered, or "in". Choose the estimate on the right.',
    },
    build: {
      name: `Build hours in ${picked.name}`,
      text: "Build and content hours the item adds to the chosen estimate, for its design choice. Yellow: this page's files give other hours than the last commit; point at it for the committed figure.",
    },
    design: {
      name: `Design hours in ${picked.name}`,
      text: "Design hours the item adds for the estimate's design choice: AI generated, Nimbly or Custom.",
    },
  };
}

/** The places in the order the estimator shows them, with what each is. */
const placeInfo: Record<(typeof places)[number], { title: string; note: string }> = {
  basics: {
    title: "Site basics",
    note: "In every estimate. Their quantities and options choose the package.",
  },
  shelf: {
    title: "Shelf",
    note: "Added when the site needs it. Its type says whether its hours are build, content or project.",
  },
  blog: {
    title: placeName.blog,
    note: "One item on the shelf: how many blogs, and their list and post templates: shared, or with more than one blog, up to one for each.",
  },
  catalogue: {
    title: placeName.catalogue,
    note: "One item on the shelf: where the products come from (each source with the same options), how they show, and what goes with them.",
  },
  membership: {
    title: placeName.membership,
    note: "One item on the shelf: how members sign in, their access groups (Enterprise from 3), and what goes with them.",
  },
};

/** The rules, as the page names them in the list of changes: what, and which number of it. */
const ruleLabels: Record<RuleName, string> = {
  "ai-variants-included": "AI variants · included",
  "ai-variants-max": "AI variants · at most",
  "ai-variant-percent": "AI variants · each extra, % of AI design",
  "ai-feedback-included": "AI feedback · rounds included",
  "ai-feedback-each": "AI feedback · hours an extra round",
  "ai-feedback-max": "AI feedback · at most",
  "nimbly-feedback-included": "Nimbly feedback · rounds included",
  "nimbly-feedback-each": "Nimbly feedback · hours an extra round",
  "nimbly-feedback-max": "Nimbly feedback · at most",
  "custom-feedback-included": "Custom feedback · rounds included",
  "custom-feedback-each": "Custom feedback · hours an extra round",
  "custom-feedback-max": "Custom feedback · at most",
  "ai-package": "AI generated · package it needs",
  "nimbly-package": "Nimbly · package it needs",
  "custom-package": "Custom · package it needs",
  "none-package": "No design · package it needs",
  "pm-percent": "Project management · %",
  "languages-included": "Languages · included",
  "languages-second": "Languages · the 2nd",
  "languages-each": "Languages · each after it",
  "languages-max": "Languages · at most",
  "languages-growth-from": "Languages · Growth from",
  "languages-professional-from": "Languages · Pro from",
  "pages-start": "Website pages · to start with",
  "pages-max": "Website pages · at most",
  "pages-professional-from": "Website pages · Pro from",
};

const statusNames: Record<string, string> = { "": "Live", soon: "Soon", hidden: "Hidden" };
const typeNames: Record<string, string> = { "": "Build", content: "Content" };
const packageNames: [string, string][] = [
  ["", "Any"],
  ["growth", "Growth"],
  ["platform", "Platform"],
];
const tierNames: [string, string][] = [
  ["", "Starter"],
  ["professional", "Pro"],
  ["enterprise", "Enterprise"],
];

/* ---------- The draft ---------- */

const rowName = (row: Row) => (row.option ? `${row.item} · ${row.option}` : row.item);
const isAdded = (row: Row) => state.added.some((item) => rowKey(item) === rowKey(row));
const ruleEdits = () => Object.keys(state.rules).length;
/** Columns that belong to the whole item: written on each of its rows, listed once. */
const itemColumns: readonly Column[] = ["item", "type"];
/** What a changed cell is listed as: the cell, or, for the item's name, type and the option it
    starts with, the item. */
function changeOf(key: string): string {
  const at = key.lastIndexOf(" ");
  const column = key.slice(at + 1) as Column;
  const owner = key.slice(0, at);
  const id = owner.split("·")[0] ?? owner;
  const whole = itemColumns.includes(column) || (column === "start" && owner.includes("·"));
  return whole ? `${id} ${column}` : key;
}
const unsavedCount = () =>
  new Set(
    Object.keys(state.cells)
      .filter((key) => !state.added.some((row) => key.startsWith(`${rowKey(row)} `)))
      .map(changeOf),
  ).size +
  state.added.length +
  state.dropped.length +
  ruleEdits();
const shownValue = (text: string) => (text === "" ? "empty" : text);
/** A cell's value as the list of changes shows it. */
const valueOf = (column: Column, text: string) =>
  column === "status"
    ? (statusNames[text] ?? text)
    : column === "type"
      ? (typeNames[text] ?? text)
      : shownValue(text);
/** The table on this page: the saved file, with the cells changed here, the items added here (each
    at the end of its place) and without the new items taken out here. */
function workingRows(): Row[] {
  const rows = state.savedRows.filter((row) => !state.dropped.includes(rowKey(row)));
  for (const row of state.added) {
    let at = rows.length;
    rows.forEach((item, index) => {
      if (item.place === row.place) at = index + 1;
    });
    rows.splice(at, 0, row);
  }
  return applyCells(rows, state.cells);
}

function workingRules(): Rules {
  return { ...(state.savedRules as Rules), ...state.rules };
}

/** What changes are counted from: the last commit, or the saved files when there is none. */
const baseRows = () => state.committedRows ?? state.savedRows;
const baseRules = () => state.committedRules ?? (state.savedRules as Rules);

/** An item that is not in the last commit: no link has its code yet, so it can still go. */
const isNew = (row: Row) => !baseRows().some((item) => rowKey(item) === rowKey(row));

type Change = { key: string; row: Row; column: Column; was: string; now: string };
type RuleChange = { name: RuleName; was: string; now: string };
type Diff = { cells: Change[]; rules: RuleChange[]; added: Row[]; removed: Row[] };

const differs = (changes: Diff) =>
  new Set(changes.cells.map((change) => changeOf(change.key))).size +
  changes.rules.length +
  new Set(changes.added.map((row) => row.id)).size +
  changes.removed.length;

/** The option an item starts with: the live one marked with start 1, or else the first live one. */
function startingOption(rows: readonly Row[]): Row | undefined {
  return (
    rows.find((row) => row.start === "1" && row.status === "") ??
    rows.find((row) => row.status === "")
  );
}

/** How the files on this page differ from the last commit, cell by cell and rule by rule. */
function diff(): Diff {
  const working = workingRows();
  const base = baseRows();
  const before = new Map(base.map((row) => [rowKey(row), row]));
  const after = new Set(working.map(rowKey));
  const out: Diff = {
    cells: [],
    rules: [],
    added: [],
    removed: base.filter((row) => !after.has(rowKey(row))),
  };
  for (const row of working) {
    const old = before.get(rowKey(row));
    if (!old) {
      out.added.push(row);
      continue;
    }
    for (const column of columns) {
      if (row[column] !== old[column]) {
        out.cells.push({
          key: cellKey(row, column),
          row,
          column,
          was: old[column],
          now: row[column],
        });
      }
    }
  }
  const rules = workingRules();
  const was = baseRules();
  for (const name of ruleNames) {
    if (rules[name] !== was[name]) out.rules.push({ name, was: was[name], now: rules[name] });
  }
  return out;
}

function committedValue(row: Row, column: Column): string | undefined {
  return baseRows().find((item) => rowKey(item) === rowKey(row))?.[column];
}

/** Sets a cell on this page. Back at its saved value, it is no longer unsaved. */
function setCell(key: string, value: string): void {
  const at = key.lastIndexOf(" ");
  const row = [...state.savedRows, ...state.added].find(
    (item) => rowKey(item) === key.slice(0, at),
  );
  if (row && row[key.slice(at + 1) as Column] === value) delete state.cells[key];
  else state.cells[key] = value;
  keepUnsaved();
}

/** Sets a column on every row of an item: its name, or its type. */
function setItemCell(id: string, column: Column, value: string): void {
  for (const row of workingRows().filter((item) => item.id === id)) {
    setCell(cellKey(row, column), value);
  }
}

function setRule(name: RuleName, value: string): void {
  if (state.savedRules?.[name] === value) delete state.rules[name];
  else state.rules[name] = value;
  keepUnsaved();
}

function keepUnsaved(): void {
  try {
    if (state.added.length + state.dropped.length + ruleEdits() === 0) {
      sessionStorage.removeItem(unsavedRowsKey);
    } else {
      sessionStorage.setItem(
        unsavedRowsKey,
        JSON.stringify({ added: state.added, dropped: state.dropped, rules: state.rules }),
      );
    }
    if (Object.keys(state.cells).length === 0) sessionStorage.removeItem(unsavedKey);
    else sessionStorage.setItem(unsavedKey, JSON.stringify(state.cells));
  } catch {
    /* Without storage the unsaved changes live as long as the page */
  }
}

function readUnsaved(): void {
  try {
    const cells = JSON.parse(sessionStorage.getItem(unsavedKey) ?? "{}") as unknown;
    state.cells =
      typeof cells === "object" && cells !== null
        ? Object.fromEntries(
            Object.entries(cells).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : {};
    const raw = JSON.parse(sessionStorage.getItem(unsavedRowsKey) ?? "{}") as {
      added?: unknown;
      dropped?: unknown;
      rules?: unknown;
    };
    state.added = Array.isArray(raw.added)
      ? raw.added.filter(
          (row): row is Row =>
            typeof row === "object" &&
            row !== null &&
            columns.every((column) => typeof (row as Record<string, unknown>)[column] === "string"),
        )
      : [];
    state.dropped = Array.isArray(raw.dropped)
      ? raw.dropped.filter((key): key is string => typeof key === "string")
      : [];
    state.rules =
      typeof raw.rules === "object" && raw.rules !== null
        ? (Object.fromEntries(
            Object.entries(raw.rules).filter(
              ([name, value]) =>
                ruleNames.some((item) => item === name) && typeof value === "string",
            ),
          ) as Partial<Rules>)
        : {};
  } catch {
    state.cells = {};
    state.added = [];
    state.dropped = [];
    state.rules = {};
  }
}

/* ---------- Adding an item ---------- */

function newId(label: string): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  const taken = new Set(
    [...baseRows(), ...state.savedRows, ...state.added, ...state.codes].map((row) => row.id),
  );
  let id = base;
  for (let index = 2; taken.has(id); index += 1) id = `${base}-${index}`;
  return id;
}

function readForm(form: HTMLFormElement): AddForm {
  const data = new FormData(form);
  return {
    label: String(data.get("label") ?? "").trim(),
    type: String(data.get("type") ?? ""),
    hours: String(data.get("hours") ?? "fixed"),
    unit: String(data.get("unit") ?? "").trim(),
    design: data.get("design") ? "1" : "",
  };
}

/** A new item goes to the end of the shelf, Live. Its hours are fixed, for each unit, or entered in
    the estimate; the first two start at 0 until they are filled in in the table. */
function addItem(form: AddForm): void {
  state.addForm = form;
  if (!form.label) {
    state.addError = "Give the item a name.";
    return;
  }
  if (form.hours === "unit" && (!form.unit || form.unit === "hours")) {
    state.addError = "Say what it counts, such as calendars.";
    return;
  }
  /* Design hours entered too go with build hours only */
  const entered = form.design && form.type === "" ? designInputUnit : "hours";
  const unit = form.hours === "entered" ? entered : form.hours === "unit" ? form.unit : "";
  const row = Object.fromEntries(columns.map((column) => [column, ""])) as Row;
  Object.assign(row, {
    id: newId(form.label),
    item: form.label,
    place: "shelf",
    type: form.type === "content" || form.type === "project" ? form.type : "",
    unit,
  });
  if (unit === "hours" || unit === designInputUnit) Object.assign(row, { start: "0", max: "400" });
  else if (unit) Object.assign(row, { start: "1", max: "10" });
  state.added.push(row);
  state.addError = "";
  state.addForm = { ...emptyForm };
  state.reveal = rowKey(row);
  keepUnsaved();
}

/** Takes out an item that no commit has: one added here, or saved since the last commit. */
function dropItem(key: string): void {
  const before = state.added.length;
  state.added = state.added.filter((row) => rowKey(row) !== key);
  if (state.added.length === before && !state.dropped.includes(key)) state.dropped.push(key);
  for (const cell of Object.keys(state.cells)) {
    if (cell.startsWith(`${key} `)) delete state.cells[cell];
  }
  keepUnsaved();
}

/* ---------- Pricing ---------- */

type Priced = { live: Quote; draft: Quote | null };
type Share = { qty: string; hours: number; design: number };

/** Prices an estimate with the committed files and, when they differ, with the ones on this page. */
function price(item: Estimate, base: Catalog, working: Catalog | null): Priced | null {
  const priceWith = (catalog: Catalog) => {
    const selection = selectionOf(item, catalog);
    return selection ? withCatalog(catalog, () => quote(selection)) : null;
  };
  const live = priceWith(base);
  if (!live) return null;
  return { live, draft: working ? priceWith(working) : null };
}

/** The starting estimates, their codes made with the saved files: as the estimator on this server
    writes them, so a link from it picks its card even when what an estimate starts with changed
    since this page loaded. */
let startingCodes: { rows: readonly Row[]; rules: Rules; list: Estimate[] } | null = null;
function startingList(): Estimate[] {
  const { savedRows: rows, savedRules: rules } = state;
  if (!rules) return startingEstimates;
  if (startingCodes?.rows === rows && startingCodes.rules === rules) return startingCodes.list;
  const saved = catalogOf(rows, rules);
  const list =
    "catalog" in saved
      ? startingEstimates.map((item) => ({ ...item, code: codeWith(item, saved.catalog) }))
      : startingEstimates;
  startingCodes = { rows, rules, list };
  return list;
}

/** The estimates on the right: the one in the address first, unless it is one of the others. */
function estimates(): Estimate[] {
  const listed = startingList();
  const own =
    decodeSelection(state.code) && !listed.some((item) => item.code === state.code)
      ? [{ name: "From your link", code: state.code }]
      : [];
  return [...own, ...listed];
}

/** The estimate the address names, picked for the table's last columns; with none, the starting
    estimate with the starting design, as a new estimate in the estimator. */
function pickAddress(): void {
  const list = estimates();
  const named = list.findIndex((item) => item.code === state.code);
  const starting = list.findIndex(
    (item) => item.design === startingDesign && item.setup === setups[0],
  );
  state.picked = Math.max(0, named !== -1 ? named : starting);
}

/** What a row adds to an estimate: how much of it is in, its build hours, and its design hours.
    Every hour of an item is on its rows, so the columns add up to the item's part of the total. An
    option is matched by its name, so a hidden option before it changes nothing. */
function share(result: Quote, catalog: Catalog, row: Row): Share | null {
  const qty = result.selection.tiles[row.id];
  const tile = catalog.byId.get(row.id);
  if (!tile || qty === undefined) return null;
  if (row.option) {
    const mode = tileMode(tile, qty);
    const name = mode ? (mode.group ? `${mode.group}: ${mode.label}` : mode.label) : "";
    if (name !== row.option) return null;
  }
  return {
    qty: tile.hourInput ? hoursLabel(qty) : tile.unit ? String(qty) : "in",
    hours: lineHours(result, row.id),
    design: designFor(result, row.id),
  };
}

/** The catalogue's Custom option, with the hours entered for it. */
function customShare(result: Quote, catalog: Catalog, row: Row, hours: Row | null): Share | null {
  const own = share(result, catalog, row);
  const entered = hours ? share(result, catalog, hours) : null;
  if (!own || !entered) return own;
  return { qty: entered.qty, hours: own.hours + entered.hours, design: own.design };
}

/* ---------- Small parts ---------- */

const classes = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ") || null;

function button(
  act: string,
  label: string,
  options: {
    primary?: boolean;
    quiet?: boolean;
    disabled?: boolean;
    cell?: string;
    title?: string;
  } = {},
): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: classes("c-btn", options.primary && "primary", options.quiet && "quiet"),
      disabled: options.disabled,
      title: options.title,
      data: {
        act,
        focus: `act ${act} ${options.cell ?? ""}`.trim(),
        ...(options.cell ? { cell: options.cell } : {}),
      },
    },
    state.said.get(act) ?? label,
  );
}

/** A figure of the draft, marked when it is not the published one. */
function figure(live: string, draft: string | null, className = ""): HTMLElement {
  const changed = draft !== null && draft !== live;
  return h(
    "span",
    {
      class: classes(className, changed && "is-changed"),
      title: changed ? `Last commit: ${live || "not in"}` : null,
    },
    draft ?? live,
  );
}

function signed(hours: number): string {
  if (hours === 0) return "No change";
  return `${hours > 0 ? "+" : "−"}${formatHours(Math.abs(hours))}h`;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** How a cell compares with the last commit, and whether it is saved. */
function cellState(row: Row, column: Column) {
  const before = committedValue(row, column);
  const value = row[column];
  /* An item added here is marked as a whole, on its row, not cell by cell */
  const added = isAdded(row);
  const changed = before === undefined ? value !== "" && !added : value !== before;
  const unsaved = state.cells[cellKey(row, column)] !== undefined && !added;
  const title = changed
    ? `Last commit: ${before === undefined ? "a new item" : valueOf(column, before)}${unsaved ? ". Not saved" : ""}`
    : unsaved
      ? "Not saved"
      : null;
  return { changed, unsaved, title };
}

/* ---------- The left column ---------- */

function head(error: string | null, changes: Diff, picked: Estimate): HTMLElement {
  const unsaved = unsavedCount();
  const differ = differs(changes);
  let status = "No changes since the last commit.";
  if (differ > 0) {
    status = `${plural(differ, "change", "changes")} from the last commit${
      unsaved > 0 ? `, ${plural(unsaved, "edit", "edits")} not saved yet` : ", all saved"
    }.`;
  } else if (unsaved > 0) status = `${plural(unsaved, "edit", "edits")} not saved yet.`;
  return h(
    "header",
    { class: "c-head" },
    h(
      "div",
      { class: "c-title" },
      h("h1", null, "Calculations"),
      h(
        "p",
        null,
        "The hours and rules behind the estimator. ",
        h(
          "a",
          {
            href: `../#${picked.code}`,
            title: "The estimator on this server uses the saved files",
          },
          "Open the estimator",
        ),
      ),
    ),
    h(
      "div",
      { class: "c-actions" },
      button("save", state.saving ? "Saving" : "Save", {
        primary: true,
        disabled: unsaved === 0 || error !== null || state.saving,
        title: "Writes src/estimator.csv and src/rules.csv",
      }),
      button("preview", "Preview", {
        disabled: error !== null,
        title:
          "Opens the estimator with this page's files, saved or not, and keeps it up to date. Nothing is written",
      }),
      /* One edit goes back with its Undo in the list of changes; this throws them all away */
      unsaved === 0
        ? null
        : button("reset", "Discard", {
            quiet: true,
            title: `Throws away the ${plural(unsaved, "edit", "edits")} not saved`,
          }),
    ),
    h(
      "div",
      { class: "c-status", role: "status" },
      h(
        "p",
        { class: differ > 0 || unsaved > 0 ? "c-draft" : null },
        h("span", {
          class: classes("c-led", unsaved > 0 ? "is-pending" : differ > 0 && "is-kept"),
          "aria-hidden": "true",
        }),
        status,
      ),
      error
        ? h("p", { class: "c-warn", role: "alert" }, `This cannot be saved yet. ${error}.`)
        : null,
      state.saveError
        ? h("p", { class: "c-warn", role: "alert" }, `Not saved. ${state.saveError}.`)
        : null,
      state.said.has("save")
        ? h(
            "p",
            { class: "c-small is-done" },
            "Saved. To publish: bun run build, then commit src/ with docs/.",
          )
        : null,
    ),
  );
}

function changesList(changes: Diff): HTMLElement {
  /* A name or a type is on each row of its item: listed once, under the item's name */
  const once = new Set<string>();
  const cells = changes.cells.filter((change) => {
    const key = changeOf(change.key);
    if (key === change.key) return true;
    if (once.has(key)) return false;
    once.add(key);
    return true;
  });
  const act = (name: string, cell: string, label: string, title: string) =>
    h(
      "button",
      {
        type: "button",
        class: "c-undo",
        title,
        data: { act: name, cell, focus: `act ${name} ${cell}` },
      },
      label,
    );
  const line = (
    what: Kid,
    fromTo: [string, string] | null,
    unsaved: boolean,
    action: Kid,
  ): HTMLElement =>
    h(
      "li",
      null,
      h("span", { class: "c-what" }, what),
      fromTo
        ? h(
            "span",
            { class: "c-fromto" },
            h("span", { class: "c-was" }, fromTo[0]),
            h("span", { class: "c-arrow", "aria-hidden": "true" }, "→"),
            h("span", { class: "is-changed" }, fromTo[1]),
            unsaved ? h("small", { class: "c-unsaved" }, "not saved") : null,
          )
        : unsaved
          ? h("small", { class: "c-unsaved" }, "not saved")
          : null,
      action,
    );
  const items: HTMLElement[] = cells.map((change) =>
    change.column === "start" && change.row.option
      ? startLine(change)
      : line(
          [
            h(
              "b",
              null,
              itemColumns.includes(change.column) ? change.row.item : rowName(change.row),
            ),
            h("small", null, help[change.column].name),
          ],
          [valueOf(change.column, change.was), valueOf(change.column, change.now)],
          state.cells[change.key] !== undefined,
          act("undo", change.key, "Undo", "Back to the last commit"),
        ),
  );
  /* The option an item starts with is one change, whichever rows it moved between */
  function startLine(change: Change): HTMLElement {
    const id = change.row.id;
    const name = (rows: readonly Row[]) =>
      startingOption(rows.filter((row) => row.id === id))?.option ?? "none";
    return line(
      [h("b", null, change.row.item), h("small", null, "Starts with")],
      [name(baseRows()), name(workingRows())],
      Object.keys(state.cells).some((key) => changeOf(key) === `${id} start` && key.includes("·")),
      act("undo-start", id, "Undo", "Back to the last commit"),
    );
  }
  for (const change of changes.rules) {
    const [group, name] = ruleLabels[change.name].split(" · ");
    items.push(
      line(
        [h("b", null, group), h("small", null, name)],
        [shownValue(change.was), shownValue(change.now)],
        state.rules[change.name] !== undefined,
        act("undo-rule", change.name, "Undo", "Back to the last commit"),
      ),
    );
  }
  const listed = new Set<string>();
  for (const row of changes.added) {
    if (listed.has(row.id)) continue;
    listed.add(row.id);
    items.push(
      line(
        [h("b", null, row.item), h("small", null, "New on the shelf")],
        null,
        isAdded(row),
        row.option
          ? null
          : act("drop", rowKey(row), "Remove", "No link has it yet, so it can still go"),
      ),
    );
  }
  for (const row of changes.removed) {
    items.push(
      line([h("b", null, rowName(row)), h("small", null, "Taken out")], null, false, null),
    );
  }
  return h(
    "section",
    { class: "c-card", "aria-label": "Changes from the last commit" },
    h(
      "h2",
      null,
      "Changes",
      items.length ? h("span", { class: "c-count" }, String(items.length)) : null,
    ),
    items.length
      ? h("ul", { class: "c-changes" }, items)
      : h(
          "p",
          { class: "c-empty" },
          "Nothing changed. What you change shows here, with the value it had.",
        ),
  );
}

/** A number of the rules, in the Design or Languages panel. */
function ruleField(name: RuleName): HTMLElement {
  const value = workingRules()[name];
  const before = baseRules()[name];
  const changed = value !== before;
  const unsaved = state.rules[name] !== undefined;
  return h("input", {
    class: classes("c-in", "c-rule", changed && "is-changed", unsaved && "is-unsaved"),
    type: "text",
    inputmode: "decimal",
    value,
    autocomplete: "off",
    spellcheck: "false",
    "aria-label": ruleLabels[name],
    title: changed ? `Last commit: ${shownValue(before)}${unsaved ? ". Not saved" : ""}` : null,
    data: { rule: name, focus: `rule ${name}` },
  });
}

/** A package one of the rules names, in the Design panel: Any, Growth or Platform. */
function rulePick(name: RuleName): HTMLElement {
  const value = workingRules()[name];
  const before = baseRules()[name];
  const changed = value !== before;
  const unsaved = state.rules[name] !== undefined;
  const known = packageNames.some(([id]) => id === value);
  return h(
    "select",
    {
      class: classes(
        "c-pick",
        `package-${value || "none"}`,
        changed && "is-changed",
        unsaved && "is-unsaved",
      ),
      "aria-label": ruleLabels[name],
      title: changed ? `Last commit: ${shownValue(before)}${unsaved ? ". Not saved" : ""}` : null,
      data: { rule: name, focus: `rule ${name}` },
    },
    packageNames.map(([id, text]) => h("option", { value: id, selected: id === value }, text)),
    known ? null : h("option", { value, selected: true }, value),
  );
}

function designPanel(): HTMLElement {
  const kinds = designKinds;
  const row = (label: string, cells: (HTMLElement | null)[], unit = "") =>
    h(
      "tr",
      null,
      h("th", { scope: "row" }, label),
      cells.map((cell) =>
        h("td", { class: cell ? null : "c-na" }, cell ?? h("span", { "aria-hidden": "true" }, "–")),
      ),
      h("td", { class: "c-unit" }, unit),
    );
  const feedback = (what: "included" | "each" | "max") =>
    kinds.map((kind) => ruleField(`${kind}-feedback-${what}` as RuleName));
  const sub = (label: string) =>
    h("tr", { class: "c-sub" }, h("th", { colspan: "5", scope: "rowgroup" }, label));
  return h(
    "section",
    { class: "c-card", "aria-label": "Design" },
    h("h2", null, "Design"),
    h(
      "table",
      { class: "c-grid-form" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("td", null),
          h("th", { scope: "col" }, "AI"),
          h("th", { scope: "col" }, "Nimbly"),
          h("th", { scope: "col" }, "Custom"),
          h("td", null),
        ),
      ),
      h(
        "tbody",
        null,
        sub("Feedback rounds"),
        row("Included", feedback("included")),
        row("Each extra", feedback("each"), "h"),
        row("At most", feedback("max")),
        sub("Variants"),
        row("Included", [ruleField("ai-variants-included"), null, null]),
        row("At most", [ruleField("ai-variants-max"), null, null]),
        row("Each extra", [ruleField("ai-variant-percent"), null, null], "%"),
      ),
    ),
    h(
      "p",
      { class: "c-small" },
      "An extra variant costs its share of the AI design hours, rounded up.",
    ),
    h("h3", { class: "c-subhead" }, "Each design"),
    h(
      "div",
      { class: "c-per" },
      h("span", null),
      h("span", { class: "c-per-head" }, "Package"),
      designChoices.flatMap((choice) => [
        h("span", { class: "c-per-name" }, choice.label),
        rulePick(`${choice.kind}-package` as RuleName),
      ]),
    ),
    h("p", { class: "c-small" }, "Package: the least the estimate is with that design."),
  );
}

/** Project: project management's share, the same whatever the design. The kick-off and training
    are rows of the site basics, Project by their type. */
function projectPanel(): HTMLElement {
  return h(
    "section",
    { class: "c-card", "aria-label": projectName },
    h("h2", null, projectName),
    h(
      "div",
      { class: "c-lines" },
      h(
        "label",
        { class: "c-line" },
        h("span", null, "Project management"),
        ruleField("pm-percent"),
        h("span", { class: "c-unit" }, "%"),
      ),
    ),
    h(
      "p",
      { class: "c-small" },
      "Of the estimate's design, build and content hours, not the kick-off and training, rounded up, whatever the design.",
    ),
  );
}

function languagesPanel(): HTMLElement {
  const line = (label: string, name: RuleName, unit = "") =>
    h(
      "label",
      { class: "c-line" },
      h("span", null, label),
      ruleField(name),
      h("span", { class: "c-unit" }, unit),
    );
  return h(
    "section",
    { class: "c-card", "aria-label": "Languages" },
    h("h2", null, "Languages"),
    h(
      "div",
      { class: "c-lines" },
      line("Included", "languages-included"),
      line("At most", "languages-max"),
      line("The 2nd", "languages-second", "h"),
      line("Each after it", "languages-each", "h"),
      line("Growth from", "languages-growth-from", "languages"),
      line("Pro from", "languages-professional-from", "languages"),
    ),
  );
}

/** A choice of a few, as buttons in a row. */
function segmented(name: string, value: string, options: [string, string][], label: string) {
  return h(
    "div",
    { class: "c-seg", role: "radiogroup", "aria-label": label },
    options.map(([id, text]) =>
      h(
        "label",
        { class: id === value ? "is-on" : null },
        h("input", {
          type: "radio",
          name,
          value: id,
          checked: id === value,
          data: { focus: `add ${name} ${id}` },
        }),
        h("span", null, text),
      ),
    ),
  );
}

function addCard(): HTMLElement {
  const form = state.addForm;
  const field = (label: string, control: Kid, note?: string) =>
    h(
      "div",
      { class: "c-field" },
      h("span", { class: "c-field-name" }, label),
      control,
      note ? h("small", null, note) : null,
    );
  return h(
    "section",
    { class: "c-card", "aria-label": "Add an item" },
    h("h2", null, "Add an item"),
    h(
      "p",
      { class: "c-note" },
      "It goes to the end of the shelf, Live. Its hours are filled in in the table.",
    ),
    h(
      "form",
      { class: "c-add", data: { form: "add" }, novalidate: true },
      h(
        "label",
        { class: "c-field" },
        h("span", { class: "c-field-name" }, "Name"),
        h("input", {
          name: "label",
          value: form.label,
          class: "c-text",
          autocomplete: "off",
          placeholder: "Event calendar",
          data: { focus: "add label" },
        }),
      ),
      field(
        "Type",
        segmented(
          "type",
          form.type,
          [
            ["", "Build"],
            ["content", "Content"],
            ["project", projectName],
          ],
          "Type",
        ),
      ),
      field(
        "Hours",
        segmented(
          "hours",
          form.hours,
          [
            ["fixed", "Fixed"],
            ["unit", "For each"],
            ["entered", "Entered"],
          ],
          "Hours",
        ),
        form.hours === "entered"
          ? "The estimate gets an empty hours field, as Content has."
          : form.hours === "unit"
            ? "Hours for each one it counts."
            : "One number of hours for the item.",
      ),
      form.hours === "entered" && form.type === ""
        ? h(
            "label",
            { class: "c-check" },
            h("input", {
              type: "checkbox",
              name: "design",
              checked: form.design === "1",
              data: { focus: "add design" },
            }),
            h("span", null, "Its design hours are entered too"),
          )
        : null,
      form.hours === "unit"
        ? h(
            "label",
            { class: "c-field" },
            h("span", { class: "c-field-name" }, "It counts"),
            h("input", {
              name: "unit",
              value: form.unit,
              class: "c-text",
              autocomplete: "off",
              placeholder: "calendars",
              data: { focus: "add unit" },
            }),
          )
        : null,
      h(
        "div",
        { class: "c-add-row" },
        h(
          "button",
          { type: "submit", class: "c-btn", data: { focus: "act add" } },
          "Add to the shelf",
        ),
      ),
      state.addError ? h("p", { class: "c-warn", role: "alert" }, state.addError) : null,
    ),
  );
}

/* ---------- The right column ---------- */

/** A tier in an estimate's cell: short, as the estimator's badges have it. */
const tierShort: Record<Edition, string> = {
  free: "Free tools",
  starter: "Starter",
  professional: "Pro",
  enterprise: "Ent",
};

function estimatesCard(
  list: Estimate[],
  priced: (Priced | null)[],
  error: string | null,
): HTMLElement {
  const figures =
    ({ live, draft }: Priced) =>
    (read: (result: Quote) => string, figureName: string, title?: string) =>
      h(
        "span",
        { data: { figure: figureName }, title },
        figure(read(live), draft ? read(draft) : null),
      );
  /* One estimate: its hours, then how they differ from the last commit, its package and tier. The
     whole cell picks it */
  const cell = (item: Estimate, wide = false) => {
    const index = list.indexOf(item);
    const pair = priced[index];
    if (!pair) return h("span", { class: "c-est-item is-none" }, "–");
    const { live, draft } = pair;
    const pickFigure = figures(pair);
    return h(
      "label",
      {
        class: classes("c-est-item", index === state.picked && "is-picked", wide && "is-wide"),
        title: item.name,
        data: { estimate: item.name },
      },
      h("input", {
        type: "radio",
        name: "estimate",
        value: String(index),
        checked: index === state.picked,
        "aria-label": item.name,
        data: { focus: `pick ${index}` },
      }),
      draft
        ? h(
            "span",
            { class: "c-est-total", data: { figure: "table" } },
            figure(hoursLabel(live.hours), hoursLabel(draft.hours)),
          )
        : h(
            "span",
            { class: "c-est-total", data: { figure: "committed" } },
            hoursLabel(live.hours),
          ),
      draft
        ? h(
            "span",
            {
              class: draft.hours === live.hours ? "c-same" : "c-delta",
              data: { figure: "change" },
            },
            signed(draft.hours - live.hours),
          )
        : null,
      pickFigure((result) => result.label, "package"),
      pickFigure(
        (result) => tierShort[result.edition],
        "tier",
        `Content Hub ${editionLabel[(draft ?? live).edition]}`,
      ),
    );
  };
  const own = list.filter((item) => !item.setup);
  const grid = h(
    "div",
    {
      class: "c-est",
      role: "radiogroup",
      "aria-label": "Estimates",
      style: `grid-template-columns: repeat(${pricedDesigns.length}, minmax(0, 1fr))`,
    },
    own.length > 0
      ? [h("p", { class: "c-est-row" }, "From your link"), own.map((item) => cell(item, true))]
      : null,
    pricedDesigns.map((choice) => h("p", { class: "c-est-col" }, designShort[choice.kind])),
    setups.map((setup) => [
      h("p", { class: "c-est-row" }, setup.title),
      pricedDesigns.map((choice) => {
        const item = list.find((one) => one.setup === setup && one.design === choice);
        return item ? cell(item) : h("span", { class: "c-est-item is-none" }, "–");
      }),
    ]),
  );
  /* The chosen estimate: its hours by kind, and its link */
  const picked = list[state.picked];
  const pair = priced[state.picked];
  const detail =
    picked && pair
      ? h(
          "div",
          { class: "c-est-detail", data: { estimate: picked.name } },
          h("b", null, picked.name),
          h(
            "dl",
            { class: "c-est-split" },
            (
              [
                ["Design", (result: Quote) => result.designHours, "design"],
                ["Build", (result: Quote) => result.implementationHours, "build"],
                ["Content", (result: Quote) => result.contentHours, "content"],
                [projectName, (result: Quote) => result.projectHours, "project"],
              ] as const
            ).map(([name, read, key]) =>
              h(
                "div",
                { class: `is-${key}` },
                h("dt", null, name),
                h(
                  "dd",
                  null,
                  figures(pair)((result) => hoursLabel(read(result)), key),
                ),
              ),
            ),
          ),
          h(
            "div",
            { class: "c-links" },
            h(
              "a",
              { href: `../#${picked.code}`, title: `Open ${picked.name} in the estimator` },
              "Open",
            ),
            h("code", { title: "The estimate's link code" }, picked.code),
          ),
        )
      : null;
  return h(
    "section",
    { class: "c-card", "aria-label": "Estimates" },
    h("h2", null, "Estimates"),
    h(
      "p",
      { class: "c-note" },
      "Hours with this page's files. Yellow: not what the last commit gives, which pointing at it shows. The one chosen fills the table's last columns.",
    ),
    grid,
    detail,
    h(
      "form",
      { class: "c-load", data: { form: "load" } },
      h("label", { for: "c-link" }, "Price another estimate"),
      h(
        "div",
        { class: "c-load-row" },
        h("input", {
          id: "c-link",
          class: "c-text",
          type: "text",
          name: "link",
          placeholder: "Paste a link or its code",
          autocomplete: "off",
          spellcheck: "false",
          data: { focus: "link" },
        }),
        h("button", { type: "submit", class: "c-btn", data: { focus: "act load" } }, "Load"),
      ),
      state.linkError ? h("span", { class: "c-warn", role: "alert" }, state.linkError) : null,
    ),
    error
      ? h("p", { class: "c-note" }, "Figures for these files come back once they can be read.")
      : null,
  );
}

/* ---------- The table ---------- */

/** A cell of the table, as a text field. */
function input(
  row: Row,
  column: Column,
  options: {
    name?: boolean;
    label?: string;
    placeholder?: string;
    data?: Record<string, string>;
  } = {},
): HTMLElement {
  const key = cellKey(row, column);
  const { changed, unsaved, title } = cellState(row, column);
  return h("input", {
    class: classes(
      "c-in",
      options.name && "c-name-in",
      changed && "is-changed",
      unsaved && "is-unsaved",
    ),
    type: "text",
    inputmode: options.name ? null : "decimal",
    value: row[column],
    placeholder: options.placeholder ?? null,
    autocomplete: "off",
    spellcheck: "false",
    "aria-label": `${rowName(row)}, ${options.label ?? help[column].name}`,
    title,
    data: options.data ?? { cell: key, focus: `cell ${key}` },
  });
}

/** A pick-list cell, coloured by its value. */
function pick(
  row: Row,
  column: Column,
  names: [string, string][],
  options: { tone: string; label: string; data?: Record<string, string>; value?: string },
): HTMLElement {
  const key = cellKey(row, column);
  const value = options.value ?? row[column];
  const { changed, unsaved, title } = cellState(row, column);
  const known = names.some(([id]) => id === value);
  return h(
    "select",
    {
      class: classes(
        "c-pick",
        `${options.tone}-${value || "none"}`,
        changed && "is-changed",
        unsaved && "is-unsaved",
      ),
      "aria-label": `${rowName(row)}, ${options.label}`,
      title,
      data: options.data ?? { cell: key, focus: `cell ${key}` },
    },
    names.map(([id, text]) => h("option", { value: id, selected: id === value }, text)),
    known ? null : h("option", { value, selected: true }, value),
  );
}

/** The package or tier an item needs, and from which quantity on when it counts something. */
function need(row: Row, column: "package" | "tier", counted: boolean): HTMLElement {
  const key = cellKey(row, column);
  const match = /^(\w+)(?:\s+from\s+(\d+))?$/.exec(row[column]);
  const name = match?.[1] ?? row[column];
  const from = match?.[2] ?? "";
  return h(
    "div",
    { class: "c-need" },
    pick(row, column, column === "package" ? packageNames : tierNames, {
      tone: column,
      label: help[column].name,
      value: name,
      data: { need: key, part: "name", focus: `need ${key}` },
    }),
    counted && name
      ? h(
          "label",
          { class: from ? "c-from" : "c-from is-empty" },
          h("span", null, "from"),
          h("input", {
            class: "c-in",
            type: "text",
            inputmode: "numeric",
            value: from,
            placeholder: "1",
            autocomplete: "off",
            "aria-label": `${rowName(row)}, ${help[column].name}, from`,
            data: { need: key, part: "from", focus: `from ${key}` },
          }),
        )
      : null,
  );
}

function statusPick(row: Row): HTMLElement {
  /* A source with no options cannot be live: the estimator has nothing to offer for it yet */
  const names: [string, string][] =
    isSource(row.id, row.place) && !row.option
      ? [
          ["soon", "Soon"],
          ["hidden", "Hidden"],
        ]
      : [
          ["", "Live"],
          ["soon", "Soon"],
          ["hidden", "Hidden"],
        ];
  return pick(row, "status", names, { tone: "status", label: "status" });
}

/** Build, Content or Project on an item of the shelf; Build or Project in the site basics. */
function typePick(row: Row): HTMLElement {
  const names: [string, string][] = [["", "Build"]];
  if (row.place === "shelf") names.push(["content", "Content"]);
  names.push(["project", projectName]);
  return pick(row, "type", names, {
    tone: "type",
    label: "type",
    data: { type: row.id, focus: `type ${row.id}` },
  });
}

/** Where a row's type can be chosen: the shelf and the site basics. */
const hasType = (row: Row) => row.place === "shelf" || row.place === "basics";

/** Where an item sits when it has no status of its own. */
function fixedStatus(id: string): string {
  const withThe: Record<string, string> = {
    "blog-setups": "With the blog",
    "product-catalogue": "With the catalogue",
    membership: "With memberships",
  };
  for (const [owner, parts] of Object.entries(partsOf)) {
    if (parts.includes(id)) return withThe[owner] ?? "With its item";
  }
  return "Always in";
}

const singular = (unit: string) => unit.replace(/s$/, "");

/** The line under an item's name: what it counts, or what it is. */
function captionOf(row: Row, hasOptions: boolean): string {
  if (isSource(row.id, row.place))
    return hasOptions ? "Source, with its options" : "Source, to come";
  if (hasOptions) return "";
  if (row.unit === "hours") return "Hours entered in the estimate";
  if (row.unit === designInputUnit) return "Build and design hours entered in the estimate";
  if (row.unit) return `Per ${singular(row.unit)}`;
  return "";
}

type Pricing = { pair: Priced | null; base: Catalog; working: Catalog | null };

/** The chosen estimate's three columns for a row. */
function ownCells(pricing: Pricing, live: Share | null, draft: Share | null): HTMLElement[] {
  const hasDraft = !!pricing.pair?.draft;
  const own = (read: (item: Share) => number) => {
    const was = live && read(live) > 0 ? hoursLabel(read(live)) : "";
    const now = draft && read(draft) > 0 ? hoursLabel(read(draft)) : "";
    return figure(was, hasDraft ? now : null);
  };
  return [
    h(
      "td",
      { class: "c-own first" },
      figure(live?.qty ?? "", hasDraft ? (draft?.qty ?? "") : null),
    ),
    h(
      "td",
      { class: "c-own d" },
      own((item) => item.design),
    ),
    h(
      "td",
      { class: "c-own" },
      own((item) => item.hours),
    ),
  ];
}

function sharesOf(pricing: Pricing, read: (result: Quote, catalog: Catalog) => Share | null) {
  const { pair, base, working } = pricing;
  return {
    live: pair ? read(pair.live, base) : null,
    draft: pair?.draft && working ? read(pair.draft, working) : null,
  };
}

/** Hours cells for a row: six fields, or one line when its hours are entered in the estimate, or
    when it is a source of products that has no options yet. */
function hourCells(row: Row): HTMLElement[] {
  const line = (text: string) => [
    h("td", { class: "c-entered g1", colspan: String(hourColumns.length) }, text),
  ];
  if (row.unit === "hours") return line("Entered in the estimate");
  if (row.unit === designInputUnit) return line("Build and design entered in the estimate");
  if (
    isSource(row.id, row.place) &&
    !row.option &&
    hourColumns.every((column) => row[column] === "")
  ) {
    return line("Its options come later");
  }
  return hourColumns.map((column, index) =>
    h(
      "td",
      {
        class: classes(
          "c-num",
          index % 2 === 0 && "g1",
          column.startsWith("design-") && "is-design",
        ),
      },
      input(row, column, { placeholder: "0" }),
    ),
  );
}

/** Project management: in every estimate, a share of all its hours that the Project panel sets. A
    row of the rules, so the table's rows add up to the estimate. */
function managementRow(pricing: Pricing): HTMLElement {
  const { live, draft } = sharesOf(pricing, (result, catalog) => ({
    qty: `${formatHours(catalog.managementPercent)}%`,
    hours: result.lines.find((line) => line.id === managementLineId)?.openHours ?? 0,
    design: 0,
  }));
  const share = formatHours((pricing.working ?? pricing.base).managementPercent);
  return h(
    "tr",
    { class: "c-row is-item is-rule" },
    h(
      "th",
      { scope: "row", class: "c-item" },
      h("div", { class: "c-name" }, h("span", { class: "c-rule-name" }, "Project management")),
      h("small", null, "Share of all the estimate's hours"),
    ),
    h("td", { class: "c-stat" }, h("span", { class: "c-fixed" }, "Always in")),
    h("td", { class: "c-type" }, h("span", { class: "c-fixed" }, projectName)),
    h("td", { class: "c-num" }),
    h("td", { class: "c-num" }),
    h(
      "td",
      { class: "c-entered g1", colspan: String(hourColumns.length) },
      `${share}%, whatever the design: in the Project panel`,
    ),
    h("td", { class: "c-needs g1" }),
    h("td", { class: "c-needs" }),
    ownCells(pricing, live, draft),
  );
}

/** The rows of one item: one, or a heading row with a row for each option under it. hoursRow: the catalogue's custom hours, which a source's Custom option
    carries; its most hours are a field on the first source that has one, and said on the others. */
function itemRows(
  rows: Row[],
  pricing: Pricing,
  hoursRow: Row | null,
  editsHours = true,
): HTMLElement[] {
  const first = rows[0] as Row;
  const hasOptions = first.option !== "";
  const caption = captionOf(first, hasOptions);
  const nameCell = h(
    "th",
    { scope: "row", class: "c-item" },
    h(
      "div",
      { class: "c-name" },
      input(first, "item", {
        name: true,
        label: "name",
        data: { name: first.id, focus: `name ${first.id}`, cell: cellKey(first, "item") },
      }),
      isNew(first) ? h("span", { class: "c-newtag" }, "New") : null,
    ),
    caption ? h("small", null, caption) : null,
  );
  const tone = (row: Row) =>
    classes(row.status === "soon" && "is-soon", row.status === "hidden" && "is-hidden");

  if (!hasOptions) {
    const counted = !!first.unit && first.unit !== "hours" && first.unit !== designInputUnit;
    const { live, draft } = sharesOf(pricing, (result, catalog) => share(result, catalog, first));
    return [
      h(
        "tr",
        {
          class: classes("c-row", "is-item", isAdded(first) && "is-added", tone(first)),
          data: { row: rowKey(first) },
        },
        nameCell,
        h(
          "td",
          { class: "c-stat" },
          hasStatus(first.id)
            ? statusPick(first)
            : h("span", { class: "c-fixed" }, fixedStatus(first.id)),
        ),
        h("td", { class: "c-type" }, hasType(first) ? typePick(first) : null),
        h("td", { class: "c-num" }, counted ? input(first, "start") : null),
        h("td", { class: "c-num" }, first.unit ? input(first, "max") : null),
        hourCells(first),
        h("td", { class: "c-needs g1" }, need(first, "package", counted)),
        h("td", { class: "c-needs" }, need(first, "tier", counted)),
        ownCells(pricing, live, draft),
      ),
    ];
  }

  const starts = startingOption(rows);
  const live = rows.filter((row) => row.status === "").length;
  const shown = rows.filter((row) => row.status !== "hidden").length;
  const summary =
    shown === 0
      ? "All hidden"
      : live === 0
        ? "None live"
        : `${plural(rows.length, "option", "options")}`;
  const out: HTMLElement[] = [
    h(
      "tr",
      {
        class: classes(
          "c-row",
          "is-item",
          "is-head",
          shown === 0 && "is-hidden",
          shown > 0 && live === 0 && "is-soon",
        ),
      },
      nameCell,
      h("td", { class: "c-stat" }, h("span", { class: "c-fixed" }, summary)),
      h("td", { class: "c-type" }, hasType(first) ? typePick(first) : null),
      h("td", { colspan: String(2 + hourColumns.length + 2), class: "c-head-fill" }),
      ownCells(pricing, null, null),
    ),
  ];
  rows.forEach((row, index) => {
    const isHours = row.unit === "hours";
    const { live: mine, draft: theirs } = sharesOf(pricing, (result, catalog) =>
      isHours ? customShare(result, catalog, row, hoursRow) : share(result, catalog, row),
    );
    out.push(
      h(
        "tr",
        {
          class: classes("c-row", "is-option", index === rows.length - 1 && "is-last", tone(row)),
          data: { row: rowKey(row) },
        },
        h(
          "th",
          { scope: "row", class: "c-item c-opt" },
          h("div", { class: "c-name" }, input(row, "option", { name: true })),
          isHours ? h("small", null, "Hours entered in the estimate") : null,
        ),
        h("td", { class: "c-stat" }, statusPick(row)),
        h("td", { class: "c-type" }),
        h(
          "td",
          { class: "c-num c-start" },
          h(
            "label",
            {
              class: classes("c-radio", cellState(row, "start").changed && "is-changed"),
              title:
                row.status !== ""
                  ? "Only a live option can be the one it starts with"
                  : "The option it starts with",
            },
            h("input", {
              type: "radio",
              name: `start ${row.id}`,
              value: rowKey(row),
              checked: row === starts,
              disabled: row.status !== "",
              "aria-label": `${rowName(row)}, starts with it`,
              data: { start: row.id, focus: `start ${rowKey(row)}` },
            }),
          ),
        ),
        h(
          "td",
          { class: "c-num" },
          isHours && hoursRow
            ? editsHours
              ? input(hoursRow, "max", { label: "most hours" })
              : h(
                  "span",
                  { class: "c-fixed", title: "The same for every source: set on the first" },
                  hoursRow.max,
                )
            : null,
        ),
        hourCells(row),
        h("td", { class: "c-needs g1" }, need(row, "package", false)),
        h("td", { class: "c-needs" }, need(row, "tier", false)),
        ownCells(pricing, mine, theirs),
      ),
    );
  });
  return out;
}

function tableCard(picked: Estimate, pricing: Pricing): HTMLElement {
  const rows = workingRows();
  const span = 5 + hourColumns.length + 2 + 3;
  /* Each source's Custom option carries the hours entered for it, so that row is not shown */
  const hoursRow = rows.find((row) => row.id === "catalogue-custom") ?? null;
  const withHours = [
    ...new Set(
      rows
        .filter((row) => isSource(row.id, row.place) && row.option && row.unit === "hours")
        .map((row) => row.id),
    ),
  ];
  const merged = hoursRow !== null && withHours.length > 0;
  const body: Kid[] = [];
  const known = new Set<string>(places);
  const strays = [...new Set(rows.map((row) => row.place))].filter((place) => !known.has(place));
  for (const place of [...places, ...strays]) {
    const own = rows.filter(
      (row) => row.place === place && !(merged && row.id === "catalogue-custom"),
    );
    if (own.length === 0) continue;
    const info = placeInfo[place as (typeof places)[number]] ?? {
      title: place || "No place",
      note: "Not a place the estimator has: fix it in src/estimator.csv.",
    };
    body.push(
      h(
        "tr",
        { class: "c-group", data: { place } },
        h(
          "th",
          { colspan: String(span), scope: "colgroup" },
          h("span", { class: "c-group-in" }, h("b", null, info.title), h("span", null, info.note)),
        ),
      ),
    );
    for (const id of new Set(own.map((row) => row.id))) {
      body.push(
        itemRows(
          own.filter((row) => row.id === id),
          pricing,
          merged && withHours.includes(id) ? hoursRow : null,
          id === withHours[0],
        ),
      );
    }
    if (place === "basics") body.push(managementRow(pricing));
  }
  /* The table's hours column: every hour that is not design, Content and Project too */
  const sum = (result: Quote) =>
    hoursLabel(result.implementationHours + result.contentHours + result.projectHours);
  const own = ownHelp(picked);
  const heading = (label: Kid, about: Help, attrs: Record<string, string | null> = {}) =>
    h(
      "th",
      {
        scope: "col",
        tabindex: "0",
        ...attrs,
        data: {
          tipName: about.name,
          tip: about.text,
          ...(about.example ? { tipExample: about.example } : {}),
        },
      },
      label,
    );
  const { pair } = pricing;
  return h(
    "section",
    { class: "c-card c-table-card", "aria-label": "The table" },
    h(
      "div",
      { class: "c-bar" },
      h("h2", null, "Items"),
      h(
        "p",
        { class: "c-legend" },
        h("span", { class: "c-key status-none" }, "Live"),
        h("span", { class: "c-key status-soon" }, "Soon"),
        h("span", { class: "c-key status-hidden" }, "Hidden"),
        h("span", { class: "c-sep", "aria-hidden": "true" }),
        h("span", { class: "c-key-changed" }, "Changed"),
        h("span", { class: "c-key-unsaved" }, "Not saved"),
        h("span", { class: "c-sep", "aria-hidden": "true" }),
        h("span", { class: "c-hint" }, "Point at a heading for what it means"),
      ),
    ),
    h(
      "div",
      { class: "c-scroll", data: { keepScroll: "table" } },
      h(
        "table",
        { class: "c-main" },
        h(
          "colgroup",
          null,
          h("col", { class: "w-item" }),
          h("col", { class: "w-stat" }),
          h("col", { class: "w-type" }),
          h("col", { class: "w-num" }),
          h("col", { class: "w-num" }),
          hourColumns.map(() => h("col", { class: "w-hours" })),
          h("col", { class: "w-pack" }),
          h("col", { class: "w-tier" }),
          h("col", { class: "w-own" }),
          h("col", { class: "w-own" }),
          h("col", { class: "w-own" }),
        ),
        h(
          "thead",
          null,
          h(
            "tr",
            { class: "c-heads" },
            heading("Item", help.item, { class: "c-item", rowspan: "2" }),
            heading("Status", help.status, { rowspan: "2" }),
            heading("Type", help.type, { rowspan: "2" }),
            heading("Start", help.start, { class: "n", rowspan: "2" }),
            heading("Max", help.max, { class: "n", rowspan: "2" }),
            designPairs.map(([name]) =>
              h("th", { class: "c-span is-choice g1", colspan: "2", scope: "colgroup" }, name),
            ),
            h("th", { class: "c-span is-needs g1", colspan: "2", scope: "colgroup" }, "Needs"),
            h("th", { class: "c-span c-own first", colspan: "3", scope: "colgroup" }, picked.name),
          ),
          h(
            "tr",
            { class: "c-heads2" },
            designPairs.flatMap(([, design, build]) => [
              heading("Design", help[design], { class: "n g1 is-design" }),
              heading("Build", help[build], { class: "n" }),
            ]),
            heading("Package", help.package, { class: "g1" }),
            heading("Tier", help.tier),
            heading("In it", own.qty, { class: "c-own n first" }),
            heading("Design", own.design, { class: "c-own n" }),
            heading("Build", own.build, { class: "c-own n" }),
          ),
        ),
        h("tbody", null, body),
        pair
          ? h(
              "tfoot",
              null,
              h(
                "tr",
                null,
                h(
                  "th",
                  { colspan: String(span - 3), scope: "row" },
                  `${picked.name}: `,
                  figure(
                    hoursLabel(pair.live.hours),
                    pair.draft ? hoursLabel(pair.draft.hours) : null,
                  ),
                ),
                h("td", { class: "c-own first" }),
                h(
                  "td",
                  { class: "c-own d" },
                  figure(
                    hoursLabel(pair.live.designHours),
                    pair.draft ? hoursLabel(pair.draft.designHours) : null,
                  ),
                ),
                h(
                  "td",
                  { class: "c-own" },
                  figure(sum(pair.live), pair.draft ? sum(pair.draft) : null),
                ),
              ),
            )
          : null,
      ),
    ),
  );
}

/* ---------- Drawing ---------- */

/** Files read: the catalog, or why it cannot be one. */
/** Leaves this page's files for the estimator's preview, in this browser only. The open preview
    reloads when they change. */
function writePreview(code: string): void {
  const files: PreviewFiles = {
    table: serializeTable(workingRows()),
    rules: serializeRules(workingRules()),
    codes: serializeCodes(state.codes),
    code,
  };
  try {
    localStorage.setItem(previewKey, JSON.stringify(files));
  } catch {}
}

function catalogOf(rows: readonly Row[], rules: Rules): { catalog: Catalog } | { error: string } {
  try {
    return { catalog: buildCatalog(rows, rules, state.codes) };
  } catch (problem) {
    return { error: problem instanceof Error ? problem.message : String(problem) };
  }
}

function draw(): void {
  if (state.loadError) {
    root.replaceChildren(
      h(
        "main",
        { class: "c-page is-error" },
        h(
          "header",
          { class: "c-head" },
          h("div", { class: "c-title" }, h("h1", null, "Calculations")),
        ),
        h("p", { class: "c-warn", role: "alert" }, state.loadError),
      ),
    );
    return;
  }
  if (!state.savedRules) return;
  const based = catalogOf(baseRows(), baseRules());
  if ("error" in based) {
    /* The last commit's files are not ones this code can read: compare with the saved files */
    state.committedRows = null;
    state.committedRules = null;
    draw();
    return;
  }
  const changes = diff();
  const worked = differs(changes) > 0 ? catalogOf(workingRows(), workingRules()) : null;
  const working = worked && "catalog" in worked ? worked.catalog : null;
  const error = worked && "error" in worked ? worked.error : null;
  const list = estimates();
  if (state.picked >= list.length) state.picked = 0;
  const priced = list.map((item) => price(item, based.catalog, working));
  const picked = list[state.picked] ?? (list[0] as Estimate);
  /* An open preview follows the files and the chosen estimate, while they can be read */
  if (state.previewing && error === null) {
    writePreview(codeWith(picked, working ?? based.catalog));
  }

  const focus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.focus
      : undefined;
  const scroll = new Map<string, [number, number]>();
  for (const node of root.querySelectorAll<HTMLElement>("[data-keep-scroll]")) {
    scroll.set(node.dataset.keepScroll ?? "", [node.scrollLeft, node.scrollTop]);
  }
  root.replaceChildren(
    h(
      "main",
      { class: "c-page" },
      h(
        "div",
        { class: "c-layout" },
        h(
          "aside",
          {
            class: "c-side c-left",
            "aria-label": "Changes and rules",
            data: { keepScroll: "left" },
          },
          head(error, changes, picked),
          changesList(changes),
          designPanel(),
          projectPanel(),
          languagesPanel(),
          addCard(),
        ),
        h(
          "div",
          { class: "c-middle" },
          tableCard(picked, { pair: priced[state.picked] ?? null, base: based.catalog, working }),
        ),
        h(
          "aside",
          { class: "c-side c-right", "aria-label": "Estimates", data: { keepScroll: "right" } },
          estimatesCard(list, priced, error),
        ),
      ),
    ),
  );
  for (const node of root.querySelectorAll<HTMLElement>("[data-keep-scroll]")) {
    const [left, top] = scroll.get(node.dataset.keepScroll ?? "") ?? [0, 0];
    node.scrollLeft = left;
    node.scrollTop = top;
  }
  if (state.reveal) {
    const cell = root.querySelector<HTMLElement>(
      `[data-cell="${CSS.escape(`${state.reveal} item`)}"]`,
    );
    state.reveal = "";
    cell?.scrollIntoView({ block: "center", inline: "nearest" });
    cell?.focus({ preventScroll: true });
  } else if (focus) {
    root
      .querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`)
      ?.focus({ preventScroll: true });
  }
}

/** Takes what the server says is on disk and in the last commit. */
function take(tables: Tables): void {
  state.savedTable = tables.saved.table;
  state.savedRulesText = tables.saved.rules;
  state.savedRows = parseTable(tables.saved.table);
  state.savedRules = parseRules(tables.saved.rules);
  state.codes = parseCodes(tables.saved.codes);
  state.committedRows = null;
  state.committedRules = null;
  /* With no commit of the files, or one this code cannot read, changes are counted from the saved
     files */
  if (tables.committed !== null) {
    try {
      state.committedRows = parseTable(tables.committed.table);
      state.committedRules = parseRules(tables.committed.rules);
    } catch {
      state.committedRows = null;
      state.committedRules = null;
    }
  }
  /* Added items the file now has, and new items taken out that it no longer has, are done with.
     Unsaved changes the file now has anyway are dropped */
  const saved = new Set(state.savedRows.map(rowKey));
  state.added = state.added.filter((row) => !saved.has(rowKey(row)));
  state.dropped = state.dropped.filter((key) => saved.has(key));
  const cells = state.cells;
  state.cells = {};
  for (const [key, value] of Object.entries(cells)) {
    const owner = key.slice(0, key.lastIndexOf(" "));
    if (saved.has(owner) || state.added.some((row) => rowKey(row) === owner)) setCell(key, value);
  }
  const rules = state.rules;
  state.rules = {};
  for (const name of ruleNames) {
    const value = rules[name];
    if (value !== undefined) setRule(name, value);
  }
  keepUnsaved();
}

async function load(): Promise<void> {
  try {
    const response = await fetch("api/table", { cache: "no-store" });
    if (!response.ok) throw new Error(`the server answered ${response.status}`);
    readUnsaved();
    take((await response.json()) as Tables);
    /* The starting estimates' codes are the saved files' now: the address may name one of them */
    pickAddress();
    try {
      const at = Number(sessionStorage.getItem(savedKey));
      sessionStorage.removeItem(savedKey);
      if (Date.now() - at < 10000) window.setTimeout(() => say("save", "Saved"), 0);
    } catch {}
  } catch (problem) {
    const why = problem instanceof Error ? problem.message : String(problem);
    state.loadError = `The files could not be read: ${why}. The calculations page needs the dev server (bun run dev), and src/estimator.csv and src/rules.csv must be files it can read; fix them in an editor if they are not.`;
  }
  draw();
}

async function save(): Promise<void> {
  state.saving = true;
  state.saveError = "";
  draw();
  try {
    const response = await fetch("api/table", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        table: serializeTable(workingRows()),
        rules: serializeRules(workingRules()),
      }),
    });
    const answer = (await response.json()) as Tables & { error?: string };
    if (!response.ok) throw new Error(answer.error ?? `the server answered ${response.status}`);
    state.cells = {};
    state.added = [];
    state.dropped = [];
    state.rules = {};
    take(answer);
    state.saving = false;
    try {
      sessionStorage.setItem(savedKey, String(Date.now()));
    } catch {}
    say("save", "Saved");
  } catch (problem) {
    state.saving = false;
    state.saveError = problem instanceof Error ? problem.message : String(problem);
    draw();
  }
}

function say(key: string, text: string, time = 6000): void {
  state.said.set(key, text);
  draw();
  window.setTimeout(() => {
    if (state.said.get(key) !== text) return;
    state.said.delete(key);
    draw();
  }, time);
}

/* ---------- Actions ---------- */

/** The package or tier cell, from its name and its "from". */
function needValue(key: string): string {
  const parts = root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    `[data-need="${CSS.escape(key)}"]`,
  );
  let name = "";
  let from = "";
  for (const part of parts) {
    if (part.dataset.part === "name") name = part.value;
    else from = part.value.trim();
  }
  return name && from ? `${name} from ${from}` : name;
}

root.addEventListener("change", (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
  if (field.name === "estimate") {
    state.picked = Number(field.value) || 0;
    draw();
    return;
  }
  if (field.form?.dataset.form === "add") {
    /* The form shows what its choices need: what it counts, for hours for each one */
    if (field instanceof HTMLInputElement && field.type === "radio") {
      state.addForm = readForm(field.form);
      state.addError = "";
      draw();
    }
    return;
  }
  const { cell, rule, need, type, name, start } = field.dataset;
  if (name) setItemCell(name, "item", field.value.trim());
  else if (type) setItemCell(type, "type", field.value);
  else if (start) {
    /* The option an item starts with: 1 on it, empty on the others. Back to the one the saved file
       starts with, its cells are the file's again, so nothing is listed as changed */
    const saved = [...state.savedRows, ...state.added].filter((item) => item.id === start);
    const back = startingOption(saved);
    for (const row of workingRows().filter((item) => item.id === start)) {
      const own = saved.find((item) => rowKey(item) === rowKey(row));
      const value =
        back && rowKey(back) === field.value
          ? (own?.start ?? "")
          : rowKey(row) === field.value
            ? "1"
            : "";
      setCell(cellKey(row, "start"), value);
    }
  } else if (cell) setCell(cell, field.value.trim());
  else if (rule) setRule(rule as RuleName, field.value.trim());
  else if (need) setCell(need, needValue(need));
  else return;
  state.saveError = "";
  draw();
});

root.addEventListener("click", (event) => {
  const target =
    event.target instanceof Element ? event.target.closest<HTMLElement>("[data-act]") : null;
  if (!(target instanceof HTMLButtonElement)) return;
  const act = target.dataset.act;
  if (act === "undo" && target.dataset.cell) {
    const key = target.dataset.cell;
    const at = key.lastIndexOf(" ");
    const column = key.slice(at + 1) as Column;
    const row = workingRows().find((item) => rowKey(item) === key.slice(0, at));
    /* A name or a type goes back on every row of its item */
    const own =
      row && itemColumns.includes(column)
        ? workingRows().filter((item) => item.id === row.id)
        : row
          ? [row]
          : [];
    for (const item of own) {
      const before = committedValue(item, column);
      if (before !== undefined) setCell(cellKey(item, column), before);
    }
    draw();
  } else if (act === "undo-start" && target.dataset.cell) {
    for (const row of workingRows().filter((item) => item.id === target.dataset.cell)) {
      setCell(cellKey(row, "start"), committedValue(row, "start") ?? "");
    }
    draw();
  } else if (act === "undo-rule" && target.dataset.cell) {
    const name = target.dataset.cell as RuleName;
    setRule(name, baseRules()[name]);
    draw();
  } else if (act === "reset") {
    state.cells = {};
    state.added = [];
    state.dropped = [];
    state.rules = {};
    state.saveError = "";
    keepUnsaved();
    draw();
  } else if (act === "save") {
    void save();
  } else if (act === "preview") {
    state.previewing = true;
    /* The estimate as this page's files make it: a starting one starts as they say */
    const picked = estimates()[state.picked] ?? estimates()[0];
    const files = catalogOf(workingRows(), workingRules());
    const code =
      picked && "catalog" in files ? codeWith(picked, files.catalog) : (picked?.code ?? "");
    writePreview(code);
    window.open(`../${previewAddress(code)}`, "estimator-preview");
  } else if (act === "drop" && target.dataset.cell) {
    dropItem(target.dataset.cell);
    state.saveError = "";
    draw();
  }
});

root.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.form === "add") {
    addItem(readForm(form));
    state.saveError = "";
    draw();
    return;
  }
  const code = codeIn(String(new FormData(form).get("link") ?? ""));
  if (!decodeSelection(code)) {
    state.linkError = "That is not a link from the estimator.";
    draw();
    return;
  }
  state.linkError = "";
  state.code = code;
  pickAddress();
  history.replaceState(null, "", `#${code}`);
  draw();
});

window.addEventListener("hashchange", () => {
  state.code = codeIn(location.hash);
  pickAddress();
  draw();
});

/* The files changed outside this page (an editor, git checkout): read them again on coming back */
window.addEventListener("focus", () => {
  if (state.saving || state.loadError) return;
  void fetch("api/table", { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<Tables>) : null))
    .then((tables) => {
      if (
        !tables ||
        (tables.saved.table === state.savedTable && tables.saved.rules === state.savedRulesText)
      )
        return;
      take(tables);
      draw();
    })
    .catch(() => {});
});

/* ---------- Column help: a popup under a heading, on hover or keyboard focus ---------- */

const tip = h("div", { class: "c-tip", role: "tooltip", id: "c-tip", hidden: true });
document.body.append(tip);
let tipFor: HTMLElement | null = null;

function showTip(cell: HTMLElement): void {
  if (tipFor === cell) return;
  hideTip();
  tipFor = cell;
  const { tipName, tip: text, tipExample } = cell.dataset;
  tip.replaceChildren(
    h("strong", null, tipName ?? ""),
    h("p", null, text ?? ""),
    ...(tipExample ? [h("p", { class: "c-tip-eg" }, tipExample)] : []),
  );
  tip.hidden = false;
  cell.setAttribute("aria-describedby", "c-tip");
  const box = cell.getBoundingClientRect();
  const width = tip.offsetWidth;
  const left = Math.max(8, Math.min(box.left + box.width / 2 - width / 2, innerWidth - width - 8));
  const below = box.bottom + 6;
  const top = below + tip.offsetHeight > innerHeight - 8 ? box.top - tip.offsetHeight - 6 : below;
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}

function hideTip(): void {
  tipFor?.removeAttribute("aria-describedby");
  tipFor = null;
  tip.hidden = true;
}

const tipCell = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>("[data-tip]") : null;
root.addEventListener("mouseover", (event) => {
  const cell = tipCell(event.target);
  if (cell) showTip(cell);
  else if (tipFor && document.activeElement !== tipFor) hideTip();
});
root.addEventListener("mouseleave", () => {
  if (document.activeElement !== tipFor) hideTip();
});
root.addEventListener("focusin", (event) => {
  const cell = tipCell(event.target);
  if (cell) showTip(cell);
  else hideTip();
});
root.addEventListener("focusout", (event) => {
  if (tipCell(event.target) === tipFor) hideTip();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideTip();
});
document.addEventListener("scroll", hideTip, true);

pickAddress();
void load();
