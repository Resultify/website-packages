/* The calculations page: every hour of hours.csv as a sheet, to try other hours and packages and see
   what they do to the estimates the page compares (the presets of config.calcEstimates, each with
   every design).

   Old is the hours.csv the page has: the published one, or on the dev server the one on disk. New
   is Old with the page's edits. The edits live only in the page's address, so a reload keeps them
   and the address shares them; Download gives hours.csv with them. On the dev server, Save writes
   them into src/hours.csv. The page edits hours and packages of the rows there are; the rest of the
   estimator (where items are shown, the rules, link codes) is in src/config.ts. */
import {
  aiDiscountShares,
  buildCatalog,
  type Catalog,
  type DesignChoice,
  designChoices,
  getTile,
  hasTile,
  isSource,
  optionNotes,
  ownerOf,
  packageName,
  placeName,
  places,
  withCatalog,
} from "../catalog.ts";
import { config, siteUrl } from "../config.ts";
import { h, type Kid } from "../dom.ts";
import { icon } from "../icons.ts";
import { choiceOf, decodeSelection, quote, selectionForShape, withDesign } from "../quote.ts";
import {
  type Config,
  type HoursRow,
  liveHoursText,
  parseHours,
  type Row,
  rowsFrom,
  rulesFrom,
  serializeHours,
} from "../table.ts";
import type { SavedEdit } from "./api.ts";
import {
  applyEdits,
  cellValue,
  checkEdits,
  decodeEdits,
  type Edit,
  type EditColumn,
  editOf,
  editsPrefix,
  encodeEdits,
  enteredUnits,
  fileOnlyId,
  hourColumns,
  isEditable,
  madeOnOther,
  mostHours,
  packageParts,
  packageText,
  setEdit,
} from "./edits.ts";

const found = document.querySelector("#calc");
if (!(found instanceof HTMLElement)) throw new Error("Missing #calc");
const root: HTMLElement = found;

/* ---------- What the page knows ---------- */

/** The names api.ts lets save, written again here: the page takes only types from api.ts, which
    is the dev server's code. On these, the page asks the dev server for src/hours.csv. */
const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

/** Set before a Save is sent: the dev server reloads the page once the file changes, and the page
    says Saved after the reload. The only thing the page keeps in the browser. */
const savedKey = "website-packages.saved";

/** hours.csv read: its text, rows, the rows as the catalog reads them (with config.ts), and the
    catalog. */
type Hours = { text: string; rows: HoursRow[]; read: Row[]; catalog: Catalog; built: boolean };

const catalogOf = (rows: readonly HoursRow[]) =>
  buildCatalog(rowsFrom(rows, config), rulesFrom(config), config.linkCodes);

function readHours(text: string, built = false): Hours {
  const rows = parseHours(text);
  return { text, rows, read: rowsFrom(rows, config), catalog: catalogOf(rows), built };
}

/** A field being typed in whose text is not a value yet: kept as typed until it is, or until the
    field is left. */
type Typing = { focus: string; value: string; problem: string };

const state = {
  /** local: the dev server answered, and Save writes src/hours.csv */
  mode: "public" as "public" | "local",
  /* Left as is: a hours.csv the app can't read stops this bundle as it loads, as it stops the
     estimator's; Save never writes one (api.ts reads the result first) */
  old: readHours(liveHoursText, true),
  edits: [] as Edit[],
  /** Edits of the last link that could not be used */
  unread: 0,
  /** Why src/hours.csv on disk cannot be used, in local mode */
  fileProblem: "",
  typing: null as Typing | null,
  /** A field's value when it got the focus, for Escape */
  before: null as { focus: string; value: string } | null,
  saving: false,
  saveError: "",
  /** Short messages, by what they are about */
  said: new Map<string, string>(),
  /** The field to focus after the next draw, when the one with the focus goes */
  refocus: "",
};

const message = (problem: unknown) =>
  problem instanceof Error ? problem.message : String(problem);
const classes = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ") || null;

/** New: Old with the edits, and its catalog. */
function newHours(): { rows: HoursRow[]; catalog: Catalog } {
  const rows = applyEdits(state.old.rows, state.edits);
  if (state.edits.length === 0) return { rows, catalog: state.old.catalog };
  try {
    return { rows, catalog: catalogOf(rows) };
  } catch {
    /* Edits are checked before they are kept: this is only a guard */
    return { rows: state.old.rows, catalog: state.old.catalog };
  }
}

/** The catalog with these edits, or what the app says is wrong with them. */
function tryEdits(edits: readonly Edit[]): Catalog | string {
  try {
    return catalogOf(applyEdits(state.old.rows, edits));
  } catch (problem) {
    return message(problem);
  }
}

/* ---------- The address ---------- */

/** The hash the page last read or wrote: a fragment change fires popstate and hashchange both,
    and the second must not read the link again (it would lose what the first counted). */
let knownHash = "";

/** The edits in the address, without adding a step to the history. */
function writeHash(): void {
  const encoded = encodeEdits(state.edits, config.linkCodes);
  const want = encoded ? `#${encoded}` : "";
  const has = location.hash.startsWith(`#${editsPrefix}`) ? location.hash : "";
  if (want !== has) {
    history.replaceState(null, "", want || `${location.pathname}${location.search}`);
  }
  knownHash = location.hash;
}

/** Takes the edits of a link's hash, in place of the page's. */
function applyHash(hash: string): void {
  const { edits, unread } = decodeEdits(hash, config.linkCodes);
  const live = liveEdits(edits, state.old.read);
  const checked = checkEdits(
    live.edits,
    state.old.rows,
    state.old.read,
    (some) => typeof tryEdits(some) !== "string",
  );
  state.edits = checked.edits;
  state.unread = unread + live.dropped + checked.dropped;
  state.typing = null;
  writeHash();
}

/** Old changed (the file on disk, or a Save): the edits are checked again. */
function takeOld(next: Hours): void {
  state.old = next;
  const live = liveEdits(state.edits, next.read);
  const checked = checkEdits(
    live.edits,
    next.rows,
    next.read,
    (some) => typeof tryEdits(some) !== "string",
  );
  state.edits = checked.edits;
  state.unread += live.dropped + checked.dropped;
  writeHash();
}

/* ---------- In development ---------- */

/** What a row in development says while the pointer is on one of its fields. */
const inDevelopmentNote = "In development: its hours are shown, not edited here.";

/** In development: coming soon, or a part of an item that is, as the estimator shows it locked.
    The page shows its hours but does not edit them. */
function inDevelopment(read: readonly Row[], row: Pick<Row, "id" | "status">): boolean {
  if (row.status === "soon") return true;
  const owner = ownerOf(row.id);
  return owner !== undefined && read.some((item) => item.id === owner && item.status === "soon");
}

/** A link's edits less those of rows in development, which are left out and counted. */
function liveEdits(
  edits: readonly Edit[],
  read: readonly Row[],
): { edits: Edit[]; dropped: number } {
  const kept = edits.filter((edit) => {
    const row = read.find((item) => item.id === edit.id && item.option === edit.option);
    return !row || !inDevelopment(read, row);
  });
  return { edits: kept, dropped: edits.length - kept.length };
}

/** The tag of what is in development: on its section, item or option, whichever is all of it. */
function devTag(): HTMLElement {
  return h("span", { class: "c-dev", title: inDevelopmentNote }, icon("lock"), "In development");
}

/* ---------- The estimates ---------- */

/** The panel's columns: each design that has design hours, in the estimator's order. */
const pricedDesigns = designChoices.filter((choice) => choice.kind !== "none");
const designShort: Record<DesignChoice["kind"], string> = {
  ai: "AI",
  nimbly: "Nimbly",
  custom: "Custom",
  none: "None",
};

type Figures = {
  total: number;
  design: number;
  build: number;
  content: number;
  project: number;
  label: string;
};

type Preset = Config["calcEstimates"][number];

/** A preset under a catalog, with a design: its link's estimate, the design in place of the link's,
    with that design's own feedback rounds and variants. */
function figuresOf(catalog: Catalog, design: DesignChoice, preset: Preset): Figures {
  return withCatalog(catalog, () => {
    const linked = decodeSelection(preset.link);
    if (!linked) throw new Error(`calcEstimates: "${preset.title}" has no estimator link`);
    const result = quote(withDesign(linked, design.id));
    return {
      /* What the estimator gives as the total: with AI design, after its discount */
      total: result.totalHours,
      design: result.designHours,
      build: result.implementationHours,
      content: result.contentHours,
      project: result.projectHours,
      label: result.label,
    };
  });
}

const figureCache = new Map<Catalog, Figures[]>();
/** Every estimate of the panel under a catalog, in the panel's order. */
function allFigures(catalog: Catalog): Figures[] {
  const known = figureCache.get(catalog);
  if (known) return known;
  const made = config.calcEstimates.flatMap((estimate) =>
    pricedDesigns.map((design) => figuresOf(catalog, design, estimate)),
  );
  /* Only Old's and the latest New's are worth keeping */
  if (figureCache.size > 4) figureCache.clear();
  figureCache.set(catalog, made);
  return made;
}

const hours = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
};

/** The AI discount of each package, for the key: none when no package has one. */
function discountKey(): string | null {
  const shares = aiDiscountShares();
  if (shares.every(([, percent]) => percent === 0)) return null;
  const list = shares.map(([id, percent]) => `${percent}% ${packageName[id]}`).join(", ");
  return ` · AI's Total is after its discount: ${list}`;
}

function estimatesCard(newCatalog: Catalog): HTMLElement {
  const olds = allFigures(state.old.catalog);
  const news = allFigures(newCatalog);
  const kinds = ["total", "design", "build", "content", "project"] as const;
  const kindName: Record<(typeof kinds)[number], string> = {
    total: "Total",
    design: "Design",
    build: "Build",
    content: "Content",
    project: "Project",
  };
  let at = 0;
  /* Each preset a band: its title, then a card for each design */
  const sets = config.calcEstimates.map((estimate) =>
    h("div", { class: "c-set", role: "group", "aria-label": estimate.title }, [
      h(
        "p",
        { class: "c-est-row" },
        /* The preset as its link has it, in the estimator with the live hours */
        h(
          "a",
          {
            href: `../#${estimate.link}`,
            target: "_blank",
            rel: "noopener",
            title: "Open in the estimator",
          },
          estimate.title,
        ),
      ),
      pricedDesigns.map((design) => {
        const old = olds[at] as Figures;
        const now = news[at] as Figures;
        at += 1;
        const name = `${estimate.title} · ${designShort[design.kind]}`;
        const shown = kinds.filter(
          (kind) => kind !== "content" || old.content > 0 || now.content > 0,
        );
        const moved = shown.some((kind) => old[kind] !== now[kind]) || old.label !== now.label;
        const change = now.total - old.total;
        const percent = old.total > 0 ? Math.round((Math.abs(change) / old.total) * 100) : 0;
        const sum =
          change === 0
            ? h("span", { class: "c-sum is-same", data: { figure: "change" } }, "no change")
            : h(
                "span",
                { class: `c-sum ${change > 0 ? "is-up" : "is-down"}`, data: { figure: "change" } },
                `${change > 0 ? "▲" : "▼"} ${hours(Math.abs(change))}h `,
                h("small", null, `${change > 0 ? "+" : "−"}${percent}%`),
              );
        const pack =
          old.label === now.label
            ? h("span", { class: "c-pk", data: { figure: "package" } }, now.label)
            : h(
                "span",
                { class: "c-pk", data: { figure: "package" } },
                h("s", null, old.label),
                " → ",
                h("b", { class: "c-chg" }, now.label),
              );
        const value = (figures: Figures, kind: (typeof kinds)[number]) =>
          kind === "total" ? `${hours(figures.total)}h` : hours(figures[kind]);
        const row = (which: "old" | "new", figures: Figures) =>
          h(
            "tr",
            { class: `is-${which}`, data: { row: which } },
            h("th", { scope: "row" }, which === "old" ? "Old" : "New"),
            shown.map((kind) =>
              h(
                "td",
                {
                  class: classes(
                    `k-${kind}`,
                    which === "new" && old[kind] !== now[kind] && "is-chg",
                  ),
                  data: { kind },
                },
                value(figures, kind),
              ),
            ),
          );
        return h(
          "article",
          {
            class: classes("c-est", `d-${design.kind}`, moved && "is-moved"),
            "aria-label": name,
            data: { estimate: name },
          },
          h(
            "div",
            { class: "c-est-top" },
            /* Shown when the cards stack, with no column heads above them */
            h("span", { class: "c-est-name" }, designShort[design.kind]),
            sum,
            pack,
          ),
          h(
            "table",
            { class: "c-vs" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("td", null),
                shown.map((kind) => h("th", { scope: "col", class: `k-${kind}` }, kindName[kind])),
              ),
            ),
            h(
              "tbody",
              null,
              moved ? row("old", old) : null,
              row("new", now),
              moved
                ? h(
                    "tr",
                    { class: "is-dif", "aria-hidden": "true" },
                    h("td", null),
                    shown.map((kind) => {
                      const by = now[kind] - old[kind];
                      return h(
                        "td",
                        { class: by > 0 ? "is-up" : by < 0 ? "is-down" : null },
                        by === 0 ? "" : `${by > 0 ? "▲" : "▼"} ${hours(Math.abs(by))}`,
                      );
                    }),
                  )
                : null,
            ),
          ),
        );
      }),
    ]),
  );
  return h(
    "section",
    { class: "c-card c-estimates", "aria-label": "Estimates", data: { keepScroll: "estimates" } },
    h("h2", null, "Estimates"),
    h(
      "p",
      { class: "c-key" },
      h("b", { class: "k-old" }, "Old"),
      " hours.csv ",
      h("b", { class: "k-new" }, "New"),
      " with the edits on the left ",
      h("span", { class: "k-chg" }, "differs"),
      " ",
      h("span", { class: "is-up" }, "▲"),
      " more hours ",
      h("span", { class: "is-down" }, "▼"),
      " fewer",
      /* As the estimator gives it: the discount comes off AI design's total only, by its package */
      discountKey(),
    ),
    h(
      "div",
      { class: "c-grid" },
      h(
        "div",
        { class: "c-heads" },
        pricedDesigns.map((design) =>
          h("p", { class: `c-est-col d-${design.kind}` }, designShort[design.kind]),
        ),
      ),
      sets,
    ),
  );
}

/* ---------- The sheet ---------- */

/** The places in the order the estimator shows them. */
const placeTitle: Record<(typeof places)[number], string> = {
  basics: "Site basics",
  shelf: "Shelf",
  blog: placeName.blog,
  catalogue: placeName.catalogue,
  membership: placeName.membership,
};

const designOf: Record<string, string> = { ai: "AI", nimbly: "Nimbly", custom: "Custom" };
const singular = (unit: string) => unit.replace(/s$/, "");
const counts = (unit: string) => unit !== "" && !enteredUnits.includes(unit);
const rowLabel = (row: HoursRow) => (row.option ? `${row.item} · ${row.option}` : row.item);
const cellKey = (row: Pick<HoursRow, "id" | "option">, column: EditColumn) =>
  `${row.id}·${row.option} ${column}`;

/** The line under an item's name: what it counts, or what it is. Hours entered in the estimate
    are said in the row's cells. */
function captionOf(read: Row, hasOptions: boolean): string {
  if (isSource(read.id, read.place)) {
    return hasOptions ? "Source, with its options" : "Source, to come";
  }
  if (hasOptions || enteredUnits.includes(read.unit)) return "";
  return read.unit ? `Per ${singular(read.unit)}` : "";
}

/** A value as the page shows it in ↺ and in its notes. */
const shownValue = (column: EditColumn, value: string) =>
  column === "package" ? packageText(value) : value;

/** ↺ on an edited value: shows the file's value, and puts it back. */
function undoButton(cell: Pick<Edit, "id" | "option" | "column">, old: string): HTMLElement {
  const text = shownValue(cell.column, old);
  return h(
    "button",
    {
      type: "button",
      class: "c-undo",
      "aria-label": `Put back ${text}`,
      title: `Put back ${text}`,
      data: { undo: cellKey(cell, cell.column) },
    },
    "↺ ",
    h("s", null, text),
  );
}

/** What a cell edited on other hours says, on hover or focus. */
function otherNote(edit: Edit, old: string): string {
  const show = (value: string) => shownValue(edit.column, value);
  return `This link changed ${show(edit.was)} → ${show(edit.now)}, but hours.csv has ${show(old)} now. ${show(edit.now)} is used; ↺ puts ${show(old)} back.`;
}

/** An hours column's classes: its design's tone, and a line before each design's first. */
function hourTone(column: EditColumn): string {
  const [design] = column.split("-") as [string];
  return `c-h d-${design}${column.endsWith("-design") ? " is-design" : ""}`;
}

/** A row's cells with no hours or package, as an item's with options has: blank, in the columns'
    tones, so each design's column runs down the sheet unbroken. */
function blankCells(): Kid[] {
  return [
    hourColumns.map((column) => h("td", { class: hourTone(column) })),
    h("td", { class: "c-pack" }),
  ];
}

function hourCell(index: number, row: HoursRow, column: EditColumn): HTMLElement {
  const read = state.old.read[index] as Row;
  const isDesign = column.endsWith("-design");
  const tone = hourTone(column);
  if (!isEditable(read, column)) {
    return h("td", { class: tone }, h("span", { class: "c-none", title: "Not set" }, "–"));
  }
  const key = cellKey(row, column);
  const old = (state.old.rows[index] as HoursRow)[column];
  const edit = editOf(state.edits, { id: row.id, option: row.option, column });
  const other = edit && edit.was !== old;
  const typing = state.typing?.focus === `cell ${key}` ? state.typing : null;
  const [design, kind] = column.split("-") as [string, string];
  const locked = inDevelopment(state.old.read, read);
  return h(
    "td",
    { class: tone },
    h(
      "span",
      { class: "c-cell" },
      h("input", {
        class: classes(
          "c-in",
          isDesign && "is-design",
          edit && "is-edited",
          other && "is-other",
          typing?.problem && "is-wrong",
        ),
        type: "text",
        inputmode: "numeric",
        value: typing ? typing.value : row[column],
        autocomplete: "off",
        spellcheck: "false",
        "aria-label": `${rowLabel(row)}, ${designOf[design]} ${kind} hours`,
        "aria-invalid": typing?.problem ? "true" : null,
        disabled: locked,
        title: locked ? inDevelopmentNote : null,
        data: {
          id: row.id,
          option: row.option,
          column,
          lane: column,
          focus: `cell ${key}`,
          ...(edit && other ? { tip: otherNote(edit, old) } : {}),
        },
      }),
      edit ? undoButton(edit, old) : null,
    ),
  );
}

const packageNames: [string, string][] = [
  ["", "Any"],
  ["growth", "Growth"],
  ["platform", "Platform"],
];

function packageCell(index: number, row: HoursRow): HTMLElement {
  const read = state.old.read[index] as Row;
  const key = cellKey(row, "package");
  const old = (state.old.rows[index] as HoursRow).package;
  const edit = editOf(state.edits, { id: row.id, option: row.option, column: "package" });
  const other = edit && edit.was !== old;
  const { name, from } = packageParts(row.package);
  const typing = state.typing?.focus === `from ${key}` ? state.typing : null;
  const locked = inDevelopment(state.old.read, read);
  const data = { id: row.id, option: row.option, column: "package" };
  return h(
    "td",
    { class: "c-pack" },
    h(
      "span",
      { class: "c-cell" },
      h(
        "select",
        {
          class: classes("c-pick", `is-${name || "any"}`, edit && "is-edited", other && "is-other"),
          "aria-label": `${rowLabel(row)}, package`,
          disabled: locked,
          title: locked ? inDevelopmentNote : null,
          data: {
            ...data,
            part: "name",
            focus: `pack ${key}`,
            ...(edit && other ? { tip: otherNote(edit, old) } : {}),
          },
        },
        packageNames.map(([value, text]) => h("option", { value, selected: value === name }, text)),
      ),
      counts(read.unit) && name
        ? h(
            "label",
            { class: "c-from" },
            h("span", null, "from"),
            h("input", {
              class: classes(
                "c-in",
                "c-from-in",
                edit && "is-edited",
                typing?.problem && "is-wrong",
              ),
              type: "text",
              inputmode: "numeric",
              value: typing ? typing.value : from,
              autocomplete: "off",
              spellcheck: "false",
              "aria-label": `${rowLabel(row)}, package from`,
              "aria-invalid": typing?.problem ? "true" : null,
              disabled: locked,
              title: locked ? inDevelopmentNote : null,
              data: { ...data, part: "from", lane: "from", focus: `from ${key}` },
            }),
          )
        : null,
      edit ? undoButton(edit, old) : null,
    ),
  );
}

/** The cells of a row after its name: six hours, or one line when the estimate takes them, and
    the package. */
function rowCells(index: number, row: HoursRow): Kid[] {
  const read = state.old.read[index] as Row;
  const hoursCells = enteredUnits.includes(read.unit)
    ? h(
        "td",
        { class: "c-entered", colspan: String(hourColumns.length) },
        "hours entered in the estimate",
      )
    : hourColumns.map((column) => hourCell(index, row, column));
  return [hoursCells, packageCell(index, row)];
}

/** What the estimator says of a row, word for word, as a new estimate shows it: its item's or
    option's note, with the build hours of the design a new estimate starts with where it says
    {build}. The app is where the words come from: the page adds none. Empty when the estimator
    shows none, or does not show the item. */
function appNote(catalog: Catalog, row: Pick<HoursRow, "id" | "option">): string {
  return withCatalog(catalog, () => {
    if (!hasTile(row.id)) return "";
    const tile = getTile(row.id);
    if (tile.hidden) return "";
    const notes = optionNotes(tile, choiceOf(selectionForShape("essential")));
    if (!row.option) return notes[0] ?? "";
    const at = (tile.modes ?? []).findIndex(
      (mode) => (mode.group ? `${mode.group}: ${mode.label}` : mode.label) === row.option,
    );
    return at === -1 ? "" : (notes[at] ?? "");
  });
}

/** An item's or option's name: with a note in the estimator, it shows it on hover or focus. */
function nameOf(index: number, text: string, note: string): HTMLElement {
  return note
    ? h(
        "span",
        { class: "c-help", tabindex: "0", data: { tip: note, focus: `help ${index}` } },
        text,
      )
    : h("span", { class: "c-plain" }, text);
}

function sheetCard(rows: readonly HoursRow[], catalog: Catalog): HTMLElement {
  const read = state.old.read;
  const body: Kid[] = [];
  const span = String(2 + hourColumns.length);
  for (const place of places) {
    const own = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => read[index]?.place === place && row.id !== fileOnlyId);
    if (own.length === 0) continue;
    /* In development: striped and locked; the tag on the section, item or option that is all of
       it */
    const dev = (index: number) => inDevelopment(read, read[index] as Row);
    const placeDev = own.every(({ index }) => dev(index));
    body.push(
      h(
        "tr",
        { class: classes("c-sec", placeDev && "is-dev"), data: { place } },
        h(
          "th",
          { colspan: span, scope: "colgroup" },
          h("span", { class: "c-sec-name" }, placeTitle[place]),
          placeDev ? devTag() : null,
        ),
      ),
    );
    /* Every other item on a tone, its options with it, so a row is easy to follow across */
    let count = 0;
    for (const id of new Set(own.map(({ row }) => row.id))) {
      const alt = count % 2 === 1 && "is-alt";
      count += 1;
      const item = own.filter(({ row }) => row.id === id);
      const first = item[0] as { row: HoursRow; index: number };
      const firstRead = read[first.index] as Row;
      const itemDev = item.every(({ index }) => dev(index));
      const itemTag = itemDev && !placeDev ? devTag() : null;
      if (!first.row.option) {
        const caption = captionOf(firstRead, false);
        body.push(
          h(
            "tr",
            {
              class: classes("c-row", alt, itemDev && "is-dev"),
              data: { row: rowLabel(first.row) },
            },
            h(
              "th",
              { scope: "row", class: "c-item" },
              nameOf(first.index, first.row.item, appNote(catalog, first.row)),
              caption ? h("small", null, caption) : null,
              itemTag,
            ),
            rowCells(first.index, first.row),
          ),
        );
        continue;
      }
      const caption = captionOf(firstRead, true);
      body.push(
        h(
          "tr",
          {
            class: classes("c-row is-head", alt, itemDev && "is-dev"),
            data: { row: first.row.item },
          },
          h(
            "th",
            { scope: "row", class: "c-item" },
            h("span", { class: "c-plain" }, first.row.item),
            caption ? h("small", null, caption) : null,
            itemTag,
          ),
          blankCells(),
        ),
      );
      let group = "";
      for (const { row, index } of item) {
        const named = /^(.+?): (.+)$/.exec(row.option);
        const ownGroup = named?.[1] ?? "";
        if (ownGroup && ownGroup !== group) {
          body.push(
            h(
              "tr",
              { class: classes("c-row is-group", alt, itemDev && "is-dev") },
              h("th", { scope: "rowgroup", class: "c-item c-opt" }, ownGroup),
              blankCells(),
            ),
          );
        }
        group = ownGroup;
        body.push(
          h(
            "tr",
            {
              class: classes(
                "c-row",
                "is-option",
                ownGroup && "in-group",
                alt,
                dev(index) && "is-dev",
              ),
              data: { row: rowLabel(row) },
            },
            h(
              "th",
              { scope: "row", class: "c-item c-opt" },
              nameOf(index, named?.[2] ?? row.option, appNote(catalog, row)),
              dev(index) && !itemDev ? devTag() : null,
            ),
            rowCells(index, row),
          ),
        );
      }
    }
  }
  return h(
    "section",
    { class: "c-card c-sheet", "aria-label": "Hours", data: { keepScroll: "sheet" } },
    h(
      "table",
      { class: "c-table" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", { scope: "col", rowspan: "2", class: "c-item" }, "Item"),
          (["ai", "nimbly", "custom"] as const).map((design) =>
            h(
              "th",
              { scope: "colgroup", colspan: "2", class: `c-design d-${design}` },
              designOf[design],
            ),
          ),
          h("th", { scope: "col", rowspan: "2", class: "c-pack" }, "Package"),
        ),
        h(
          "tr",
          null,
          ["ai", "nimbly", "custom"].flatMap((design) => [
            h("th", { scope: "col", class: `c-h is-design d-${design}` }, "Design"),
            h("th", { scope: "col", class: `c-h d-${design}` }, "Build"),
          ]),
        ),
      ),
      h("tbody", null, body),
    ),
  );
}

/* ---------- The head: what the page is, its actions, and its state ---------- */

function header(): HTMLElement {
  const none = state.edits.length === 0;
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
        "Every hour of the estimator, from hours.csv. ",
        h("a", { href: "../" }, "Open the estimator"),
      ),
    ),
    h(
      "div",
      { class: "c-actions" },
      h(
        "button",
        { type: "button", class: "c-btn", data: { act: "download", focus: "act download" } },
        "Download hours.csv",
      ),
      h(
        "button",
        {
          type: "button",
          class: "c-btn",
          disabled: none,
          data: { act: "share", focus: "act share" },
        },
        state.said.get("share") ?? "Copy share link",
      ),
      state.mode === "local"
        ? h(
            "button",
            {
              type: "button",
              class: "c-btn is-main",
              disabled: none || state.saving || state.fileProblem !== "",
              data: { act: "save", focus: "act save" },
            },
            state.saving ? "Saving…" : "Save to src/hours.csv",
          )
        : null,
    ),
  );
}

function statusLine(): HTMLElement {
  const count = state.edits.length;
  const other = madeOnOther(state.edits, state.old.rows).length;
  const parts: Kid[] =
    count > 0
      ? [
          h("span", { class: "c-chip" }, String(count)),
          ` ${count === 1 ? "edit" : "edits"}, kept in this page's link · `,
          h(
            "button",
            { type: "button", class: "c-link", data: { act: "undo-all", focus: "act undo-all" } },
            "Undo all",
          ),
        ]
      : ["No edits. Change an hour or a package to see what it does to the estimates."];
  if (other > 0) parts.push(` · ${other} made on other hours`);
  if (state.unread > 0) {
    parts.push(` · ${state.unread} of this link could not be used`);
  }
  const problems = [
    state.fileProblem
      ? `src/hours.csv can't be used: ${state.fileProblem}. ${state.old.built ? "Showing the hours the page was built with." : "Showing the hours it had before."}`
      : "",
    state.saveError ? `Not saved: ${state.saveError}` : "",
    state.typing?.problem ?? "",
  ].filter(Boolean);
  const said = ["saved", "link"].map((key) => state.said.get(key)).filter(Boolean);
  return h(
    "div",
    { class: "c-status", role: "status", data: { status: "" } },
    h("span", null, parts),
    said.map((text) => h("span", { class: "c-said" }, text ?? "")),
    problems.map((text) => h("span", { class: "c-problem" }, text)),
  );
}

function localBar(): HTMLElement {
  return h(
    "form",
    { class: "c-local", data: { form: "paste" } },
    h("label", { for: "c-paste" }, h("b", null, "Localhost:")),
    h("input", {
      id: "c-paste",
      class: "c-text",
      type: "text",
      name: "link",
      placeholder: "Paste a shared link",
      autocomplete: "off",
      spellcheck: "false",
      data: { focus: "paste" },
    }),
    h("button", { type: "submit", class: "c-btn", data: { focus: "act open" } }, "Open"),
  );
}

/* ---------- Drawing ---------- */

let started = false;
/** While the page is redrawn, a field taken away is not one left */
let drawing = false;

function draw(): void {
  if (!started) return;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focus = state.refocus || active?.dataset.focus;
  state.refocus = "";
  const caret =
    active instanceof HTMLInputElement && active.type === "text"
      ? [active.selectionStart, active.selectionEnd]
      : null;
  const pasted = root.querySelector<HTMLInputElement>("#c-paste")?.value ?? "";
  const scroll = new Map<string, [number, number]>();
  for (const node of root.querySelectorAll<HTMLElement>("[data-keep-scroll]")) {
    scroll.set(node.dataset.keepScroll ?? "", [node.scrollLeft, node.scrollTop]);
  }
  hideTip();
  const now = newHours();
  drawing = true;
  root.replaceChildren(
    h(
      "main",
      { class: "c-page" },
      header(),
      statusLine(),
      state.mode === "local" ? localBar() : null,
      h("div", { class: "c-layout" }, sheetCard(now.rows, now.catalog), estimatesCard(now.catalog)),
    ),
  );
  drawing = false;
  for (const node of root.querySelectorAll<HTMLElement>("[data-keep-scroll]")) {
    const [left, top] = scroll.get(node.dataset.keepScroll ?? "") ?? [0, 0];
    node.scrollLeft = left;
    node.scrollTop = top;
  }
  const paste = root.querySelector<HTMLInputElement>("#c-paste");
  if (paste) paste.value = pasted;
  if (focus) {
    const next = root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`);
    next?.focus({ preventScroll: true });
    if (next instanceof HTMLInputElement && caret) {
      const end = next.value.length;
      next.setSelectionRange(Math.min(caret[0] ?? end, end), Math.min(caret[1] ?? end, end));
    }
  }
}

/** Redraws only the status line: while a field is left, a redraw would take the next one away. */
function drawStatus(): void {
  root.querySelector("[data-status]")?.replaceWith(statusLine());
}

function say(key: string, text: string, time: number): void {
  state.said.set(key, text);
  draw();
  window.setTimeout(() => {
    if (state.said.get(key) !== text) return;
    state.said.delete(key);
    draw();
  }, time);
}

/* ---------- Editing ---------- */

type Cell = Pick<Edit, "id" | "option" | "column">;

function cellOf(field: HTMLElement): Cell | null {
  const { id, option, column } = field.dataset;
  if (id === undefined || option === undefined || !column) return null;
  return { id, option, column: column as EditColumn };
}

/** The cell's value in New. */
function newValue(cell: Cell): string {
  const row = applyEdits(state.old.rows, state.edits).find(
    (item) => item.id === cell.id && item.option === cell.option,
  );
  return row?.[cell.column] ?? "";
}

/** Sets a cell, once the value is one it takes and the catalog builds with it. Null when it is
    kept; otherwise what is wrong. */
function edit(cell: Cell, text: string): string | null {
  const value = cellValue(cell.column, text);
  if (value === null) {
    return cell.column === "package"
      ? "The package needs from as a whole number, 1 or more."
      : `Hours are whole numbers, 0 to ${mostHours}.`;
  }
  const next = setEdit(state.edits, state.old.rows, cell, value);
  const built = tryEdits(next);
  if (typeof built === "string") return built;
  state.edits = next;
  state.saveError = "";
  writeHash();
  return null;
}

/** The package from the select and the "from" field next to it. */
function packageFrom(field: HTMLElement, cell: Cell): string {
  const box = field.closest(".c-pack");
  const name = box?.querySelector<HTMLSelectElement>("select")?.value ?? "";
  const from = box?.querySelector<HTMLInputElement>(".c-from-in")?.value.trim() ?? "";
  if (!name) return "";
  /* Picked from Any, the "from" field is not there yet: the package takes the one it had */
  const had = box?.querySelector(".c-from-in") ? from : packageParts(newValue(cell)).from;
  return had ? `${name} from ${had}` : name;
}

/** A field's text, as the cell's value. */
function typed(field: HTMLInputElement | HTMLSelectElement, cell: Cell): string {
  return cell.column === "package" ? packageFrom(field, cell) : field.value;
}

function onType(field: HTMLInputElement | HTMLSelectElement): void {
  const cell = cellOf(field);
  const focus = field.dataset.focus;
  if (!cell || !focus) return;
  if (field instanceof HTMLInputElement && field.value.trim() === "" && cell.column !== "package") {
    /* Cleared to type another: nothing to say yet */
    state.typing = { focus, value: "", problem: "" };
    draw();
    return;
  }
  const problem = edit(cell, typed(field, cell));
  state.typing = problem ? { focus, value: field.value, problem } : null;
  draw();
}

root.addEventListener("input", (event) => {
  const field = event.target;
  if (field instanceof HTMLInputElement && field.dataset.column) onType(field);
});

root.addEventListener("change", (event) => {
  const field = event.target;
  if (field instanceof HTMLSelectElement && field.dataset.column) onType(field);
});

root.addEventListener("focusin", (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement) || !field.dataset.column) return;
  const focus = field.dataset.focus ?? "";
  if (state.before?.focus !== focus) state.before = { focus, value: field.value };
});

/** A field left with text that is no value shows its value again. */
function leave(field: HTMLInputElement): void {
  if (!state.typing || state.typing.focus !== field.dataset.focus) return;
  state.typing = null;
  const cell = cellOf(field);
  if (cell) {
    field.value = cell.column === "package" ? packageParts(newValue(cell)).from : newValue(cell);
  }
  field.classList.remove("is-wrong");
  field.removeAttribute("aria-invalid");
  drawStatus();
}

root.addEventListener("focusout", (event) => {
  const field = event.target;
  if (drawing) return;
  if (field instanceof HTMLInputElement && field.dataset.column) {
    leave(field);
    if (state.before?.focus === field.dataset.focus) state.before = null;
  }
});

root.addEventListener("keydown", (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement) || !field.dataset.column) return;
  const before = state.before;
  if (event.key === "Escape" && before && before.focus === field.dataset.focus) {
    field.value = before.value;
    onType(field);
    return;
  }
  if (event.key !== "Enter") return;
  event.preventDefault();
  /* Enter: on to the same column one row down */
  const lane = field.dataset.lane ?? "";
  const all = [
    ...root.querySelectorAll<HTMLInputElement>(
      `input[data-lane="${CSS.escape(lane)}"]:not(:disabled)`,
    ),
  ];
  const next = all[all.indexOf(field) + 1];
  leave(field);
  if (next) {
    next.focus();
    next.select();
  }
});

/* ---------- Actions ---------- */

function download(): void {
  const text = serializeHours(applyEdits(state.old.rows, state.edits));
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const link = h("a", { href: url, download: "hours.csv", hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** The link to share: on this machine, the published page's, with the same edits. */
function shareLink(): string {
  return isLocalHost ? `${siteUrl}calc/${location.hash}` : location.href;
}

async function save(): Promise<void> {
  state.saving = true;
  state.saveError = "";
  draw();
  const edits: SavedEdit[] = state.edits.map((item) => ({
    id: item.id,
    option: item.option,
    column: item.column,
    value: item.now,
  }));
  try {
    sessionStorage.setItem(savedKey, String(Date.now()));
  } catch {}
  try {
    const response = await fetch("api/hours", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ edits }),
    });
    const answer = (await response.json()) as { hours?: unknown; error?: string };
    if (!response.ok || typeof answer.hours !== "string") {
      throw new Error(answer.error ?? `the server answered ${response.status}`);
    }
    /* The saved edits are the file's values now: checked again, they are done with */
    takeOld(readHours(answer.hours));
    state.fileProblem = "";
    state.saving = false;
    say("saved", "Saved to src/hours.csv", 6000);
  } catch (problem) {
    try {
      sessionStorage.removeItem(savedKey);
    } catch {}
    state.saving = false;
    state.saveError = message(problem);
    draw();
  }
}

root.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("button") : null;
  if (!target) return;
  const { act, undo } = target.dataset;
  if (undo) {
    const at = undo.lastIndexOf(" ");
    const [id, option] = undo.slice(0, at).split("·") as [string, string];
    const column = undo.slice(at + 1) as EditColumn;
    state.edits = state.edits.filter(
      (item) => !(item.id === id && item.option === option && item.column === column),
    );
    state.typing = null;
    state.refocus = column === "package" ? `pack ${undo}` : `cell ${undo}`;
    writeHash();
    draw();
  } else if (act === "undo-all") {
    state.edits = [];
    state.unread = 0;
    state.typing = null;
    writeHash();
    draw();
  } else if (act === "download") {
    download();
  } else if (act === "share") {
    navigator.clipboard
      .writeText(shareLink())
      .then(() => say("share", "Link copied", 2000))
      .catch(() => say("share", "Copy failed", 2000));
  } else if (act === "save") {
    void save();
  }
});

root.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const field = form.querySelector<HTMLInputElement>("input[name=link]");
  const text = field?.value.trim() ?? "";
  const hash = text.includes("#") ? text.slice(text.indexOf("#") + 1) : text;
  if (!hash.startsWith(editsPrefix)) {
    say("link", "That link has no edits.", 6000);
    return;
  }
  history.pushState(null, "", `#${hash}`);
  applyHash(hash);
  if (field) field.value = "";
  draw();
});

/* Back, Forward, or a hash typed in: the edits it holds */
for (const type of ["popstate", "hashchange"]) {
  window.addEventListener(type, () => {
    if (location.hash === knownHash) return;
    applyHash(location.hash);
    draw();
  });
}

/* The file changed on disk (an editor, a spreadsheet's download): it is Old from now on */
window.addEventListener("focus", () => {
  if (state.mode !== "local" || state.saving) return;
  void fetch("api/hours", { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<{ hours?: unknown }>) : null))
    .then((answer) => {
      if (typeof answer?.hours !== "string") return;
      if (answer.hours === state.old.text && !state.fileProblem) return;
      try {
        takeOld(readHours(answer.hours));
        state.fileProblem = "";
      } catch (problem) {
        state.fileProblem = message(problem);
      }
      draw();
    })
    .catch(() => {});
});

/* ---------- Help: a popup by a name or a cell, on hover or keyboard focus ---------- */

const tip = h("div", { class: "c-tip", role: "tooltip", id: "c-tip", hidden: true });
document.body.append(tip);
let tipFor: HTMLElement | null = null;

function showTip(anchor: HTMLElement): void {
  if (tipFor === anchor) return;
  hideTip();
  tip.replaceChildren(h("p", null, anchor.dataset.tip ?? ""));
  tipFor = anchor;
  tip.hidden = false;
  anchor.setAttribute("aria-describedby", "c-tip");
  const box = anchor.getBoundingClientRect();
  const width = tip.offsetWidth;
  const left = Math.max(8, Math.min(box.left, innerWidth - width - 8));
  const below = box.bottom + 8;
  const top = below + tip.offsetHeight > innerHeight - 8 ? box.top - tip.offsetHeight - 8 : below;
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}

function hideTip(): void {
  tipFor?.removeAttribute("aria-describedby");
  tipFor = null;
  tip.hidden = true;
}

const tipAnchor = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>("[data-tip]") : null;
root.addEventListener("mouseover", (event) => {
  const anchor = tipAnchor(event.target);
  if (anchor) showTip(anchor);
  else if (tipFor && document.activeElement !== tipFor) hideTip();
});
root.addEventListener("mouseleave", () => {
  if (document.activeElement !== tipFor) hideTip();
});
root.addEventListener("focusin", (event) => {
  const anchor = tipAnchor(event.target);
  if (anchor) showTip(anchor);
  else hideTip();
});
root.addEventListener("focusout", (event) => {
  if (!drawing && tipAnchor(event.target) === tipFor) hideTip();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideTip();
});
document.addEventListener("scroll", hideTip, true);

/* ---------- Start ---------- */

async function start(): Promise<void> {
  /* On this machine the dev server may have src/hours.csv; the published page asks for nothing */
  if (isLocalHost) {
    try {
      const response = await fetch("api/hours", { cache: "no-store" });
      const answer = response.ok ? ((await response.json()) as { hours?: unknown }) : null;
      if (typeof answer?.hours === "string") {
        state.mode = "local";
        try {
          state.old = readHours(answer.hours);
        } catch (problem) {
          state.fileProblem = message(problem);
        }
      }
    } catch {}
  }
  if (location.hash.startsWith(`#${editsPrefix}`)) applyHash(location.hash);
  started = true;
  try {
    const at = Number(sessionStorage.getItem(savedKey));
    sessionStorage.removeItem(savedKey);
    if (Date.now() - at < 10000) {
      say("saved", "Saved to src/hours.csv", 6000);
      return;
    }
  } catch {}
  draw();
}

void start();
