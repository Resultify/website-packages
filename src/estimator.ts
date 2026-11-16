/* The page: summary sidebar | Design and Site basics | Features in the estimate | the shelf.
   Every row has one anatomy: lead mark | name and note | control | hours (Build over Design).

   Hours, package and tier, and every row action are the app's own (controls.ts, quote.ts): the buttons
   and fields drawn here carry data-action, data-id and data-focus, so bindActions handles them. Copy
   hours, Share link and Reset with Undo are the client's (PageState). */
import {
  catalogueId,
  catalogueSources,
  editionLabel,
  fillNote,
  getTile,
  placeName,
  shapeChoices,
  starterPageCap,
  type Tile,
} from "./catalog.ts";
import {
  stepper as appStepper,
  blockedShelfIds,
  breakdownList,
  designChoice,
  designFor,
  fixedHours,
  fixedIds,
  hoursInput,
  hoursLabel,
  includedCount,
  includedList,
  laneIds,
  lineHours,
  partIds,
  modes,
  packagePop,
  pagesControl,
  popover,
  ruleFor,
  shelfGroupOf,
  store,
  tierPop,
} from "./controls.ts";
import { h, type Kid } from "./dom.ts";
import { type IconName, icon, logo, sprocket } from "./icons.ts";
import {
  aiVariantCost,
  choiceOf,
  isModuleBased,
  formatHours,
  type Quote,
  quote,
  setTile,
  stepHours,
} from "./quote.ts";

/** What the page needs from the client: the moment's state, and the actions that are not the app's. */
export type PageState = {
  /** Copy hours and Share link say what happened for a moment, in place, keeping their icon. */
  said: ReadonlyMap<string, string>;
  /** Reset can be undone for a while: the Undo toast shows. */
  canUndo: boolean;
  /** Something differs from the starting estimate, so Reset has something to do. */
  canReset: boolean;
  /** Items whose hours you enter, in the estimate with none, after Copy hours found them so. */
  missing: ReadonlySet<string>;
  /** A warning for the toast, or null. */
  warning: string | null;
  copyHours(): void;
  /** False, with a warning, while an item whose hours you enter is in with none. */
  hoursReady(then: string): boolean;
  shareLink(): void;
  reset(): void;
  undoReset(): void;
};

/* ---------- Words and lists ---------- */

const designNote = {
  ai: "Generated from the features in your scope, with two variants to choose from.",
  custom:
    "Designed for this site. Hours follow the features you pick and show in the Design column.",
  none: "No design work in this estimate.",
} as const;
/** The Blog and the Product catalogue are named after their place; every other item by its row. */
const laneNames: Record<string, string> = {
  "blog-setups": placeName.blog,
  [catalogueId]: placeName.catalogue,
};
const basicsIds = ["templates", "sections", "menu", "header", "footer", "setup"];
const shelfGroups = [
  ["Any package", "Any package"],
  ["Needs Growth", "Growth"],
  ["Needs Platform", "Platform"],
] as const;
const tiers = ["starter", "professional", "enterprise"] as const;

const plus = (hours: number) => `+${hoursLabel(hours)}`;
const laneName = (id: string) => laneNames[id] ?? getTile(id).label;
/** A note, with its build hours for the estimate's design choice where it says {build}. */
const noteOf = (tile: Tile, result: Quote) =>
  fillNote(tile.summary, tile.build, choiceOf(result.selection));
const modeNotes = (tile: Tile, result: Quote) =>
  tile.modes?.map((mode) =>
    mode.detail
      ? fillNote(mode.detail, mode.build, choiceOf(result.selection))
      : noteOf(tile, result),
  ) ?? [noteOf(tile, result)];
const rankOf = (shape: string) => shapeChoices.findIndex((item) => item.id === shape);

/* ---------- Small parts ---------- */

function tag(tile: Tile): HTMLElement | null {
  return tile.mark === "Pro" || tile.mark === "Ent" ? h("span", { class: "tag" }, tile.mark) : null;
}

/** The package a choice moves you to ("5+ → Growth"), shown only while it would move you there. Its
    line is kept when it is hidden, so a package change never moves a row. */
function hint(id: string, result: Quote): HTMLElement | null {
  const rule = ruleFor(id, result);
  if (!rule) return null;
  return h(
    "span",
    {
      class: rule.on ? "hint" : "hint off",
      title: rule.on ? "Moves the estimate to this package" : null,
      "aria-hidden": rule.on ? null : "true",
    },
    rule.text,
  );
}

/** Texts that take turns in one place share it, as tall as the longest, so a choice never moves the row. */
function stack(texts: readonly string[], active: number): HTMLElement {
  return h(
    "span",
    { class: "stack" },
    texts.map((text, index) =>
      h(
        "span",
        { class: index === active ? null : "off", "aria-hidden": index === active ? null : "true" },
        text,
      ),
    ),
  );
}

/** A control or text that is not in use yet keeps its place, unseen, so showing it moves nothing. */
function reserved<T extends Element>(node: T, unused: boolean): T {
  if (unused) node.classList.add("reserved");
  return node;
}

/** Build over Design, the same column everywhere. A row that never has design hours keeps one line. */
function hrs(build: number | null, design: number, signed = false, one = false): HTMLElement {
  const format = signed ? plus : hoursLabel;
  return h(
    "span",
    { class: one ? "hrs one" : "hrs" },
    h("span", { class: "hb" }, build === null ? "" : format(build)),
    h("span", { class: "hd" }, design > 0 ? format(design) : ""),
  );
}

/** The figures on a column title's line, each after its label. */
function sums(build: number | null, design: number | null, designCaption = "Design"): HTMLElement {
  return h(
    "span",
    { class: "hrs sum" },
    h(
      "span",
      { class: "hb" },
      build === null ? "" : [h("small", null, "Build"), hoursLabel(build)],
    ),
    h(
      "span",
      { class: "hd" },
      design === null ? "" : [h("small", null, designCaption), hoursLabel(design)],
    ),
  );
}

type RowOptions = {
  /** The lead mark. Left out, the row has no lead column: its name starts where the hairline does. */
  lead?: Kid;
  name: Kid;
  note?: Kid;
  hint?: Kid;
  control?: Kid;
  hours?: HTMLElement;
  className?: string;
  attrs?: Record<string, string>;
};

function row(options: RowOptions): HTMLElement {
  const lead = "lead" in options;
  const className = ["r", options.className, lead ? null : "no-lead"].filter(Boolean).join(" ");
  return h(
    "div",
    { ...options.attrs, class: className },
    lead ? h("span", { class: "lead" }, options.lead) : null,
    h(
      "div",
      { class: "tx" },
      h("b", null, options.name),
      options.note || options.hint
        ? h("small", null, options.note ? h("span", null, options.note) : null, options.hint)
        : null,
    ),
    h("div", { class: "ctl" }, options.control),
    options.hours ?? h("span", { class: "hrs" }),
  );
}

/** The app's stepper (number field and buttons, data-action dec/qty/inc) with drawn signs. */
function stepper(tile: Tile, qty: number, locked = false): HTMLElement {
  const node = appStepper(tile, qty, locked);
  for (const button of node.querySelectorAll<HTMLButtonElement>(".step-btn")) {
    button.replaceChildren(icon(button.dataset.action === "inc" ? "plus" : "minus"));
  }
  return node;
}

function unitField(input: HTMLElement): HTMLElement {
  return h("span", { class: "unit" }, input, h("span", { class: "u", "aria-hidden": "true" }, "h"));
}

function modeButton(
  id: string,
  label: string,
  level: number,
  shown: number,
  soon = false,
): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: level === shown ? "mode is-on" : "mode",
      "aria-pressed": String(level === shown),
      disabled: soon,
      title: soon ? "In development" : null,
      data: { action: "mode", id, qty: String(level), focus: `mode-${id}-${level}` },
    },
    label,
  );
}

function take(id: string, name: string): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: "mk take",
      "aria-label": `Take ${name} out of the estimate`,
      title: "Take out of the estimate",
      data: { action: "tile", id, focus: `tile-${id}` },
    },
    icon("tick", "ic t"),
    icon("cross", "ic x"),
  );
}

/** Add: the same small pill on the shelf and inside an item. */
function addPill(id: string, name: string): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: "add pill",
      "aria-label": `Add ${name}`,
      data: { action: "tile", id, focus: `tile-${id}` },
    },
    "Add",
  );
}

/** Two options stacked, so the name and note next to them keep the width. */
function stacked(node: HTMLElement): HTMLElement {
  node.classList.add("is-stack");
  return node;
}

/** What adding an item would add, from the app's own quote. */
function cue(result: Quote, id: string): { build: number; design: number } {
  const next = quote(setTile(result.selection, id, true));
  const design = next.designHours - result.designHours;
  return { build: next.hours - result.hours - design, design };
}

/* ---------- Design and Site basics ---------- */

function designPart(result: Quote): HTMLElement[] {
  const tiles = result.selection.tiles;
  const isAi = tiles["ai-design"] !== undefined;
  const on = isAi || tiles["custom-design"] !== undefined;
  const feedbackId = isAi ? "ai-feedback" : "design-feedback";
  /* Only extra feedback rounds and extra variants add hours here; every other design hour sits with
     its item */
  const extra = on ? lineHours(result, feedbackId) + lineHours(result, "ai-variants") : 0;
  const out: HTMLElement[] = [
    h(
      "div",
      { class: "sh" },
      h("h2", null, "Design"),
      h("span"),
      sums(null, extra > 0 ? extra : null, "Extra"),
    ),
    h(
      "div",
      { class: "r dsel" },
      h(
        "div",
        { class: "choices", role: "radiogroup", "aria-label": "Design" },
        designChoice(result, "ai-design", "AI generated"),
        designChoice(result, "custom-design", "Custom"),
        designChoice(result, null, "None"),
      ),
      h("small", null, designNote[isAi ? "ai" : on ? "custom" : "none"]),
    ),
  ];
  if (on) {
    const feedback = getTile(feedbackId);
    out.push(
      row({
        lead: icon("feedback"),
        name: "Feedback",
        note: noteOf(feedback, result),
        control: stepper(feedback, tiles[feedbackId] ?? feedback.initial),
        hours: hrs(null, lineHours(result, feedbackId)),
      }),
    );
  }
  if (isAi) {
    const variants = getTile("ai-design");
    out.push(
      row({
        lead: icon("variants"),
        name: "Variants",
        note: `${variants.includedInBase} included, then ${hoursLabel(aiVariantCost(result))} each`,
        control: stepper(variants, tiles["ai-design"] ?? variants.initial),
        hours: hrs(null, lineHours(result, "ai-variants")),
      }),
    );
  }
  return out;
}

function basicRow(result: Quote, id: string, lead: IconName): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id] ?? tile.initial;
  return row({
    lead: icon(lead),
    name: tile.label,
    note: stack(modeNotes(tile, result), tile.modes ? qty - 1 : 0),
    hint: hint(id, result),
    control: tile.modes ? stacked(modes(id, tile.modes, qty)) : stepper(tile, qty),
    /* Languages never has design hours: one line */
    hours: hrs(lineHours(result, id), designFor(result, id), false, id === "languages"),
  });
}

/** Header, footer, setup and launch: always in, one line that opens to its three parts. */
function launch(result: Quote): HTMLElement {
  const fold = h("details", { class: "fold", open: store.open.has("fixed") });
  fold.addEventListener("toggle", () => {
    if (fold.open) store.open.add("fixed");
    else store.open.delete("fixed");
  });
  fold.append(
    h(
      "summary",
      { class: "r", data: { focus: "fold-fixed" } },
      h("span", { class: "lead" }, icon("rocket")),
      h(
        "div",
        { class: "tx" },
        h("b", null, "Header, footer, setup and launch"),
        h("small", null, "Always part of the build"),
      ),
      h("div", { class: "ctl" }, icon("chevron", "ic chev")),
      hrs(fixedHours(result), designFor(result, ...fixedIds)),
    ),
    h(
      "div",
      { class: "fold-body" },
      fixedIds.map((id) => {
        const tile = getTile(id);
        return row({
          className: "part",
          name: tile.label,
          note: noteOf(tile, result),
          hours: hrs(lineHours(result, id), designFor(result, id)),
        });
      }),
    ),
  );
  return fold;
}

function basicsPart(result: Quote): HTMLElement[] {
  return [
    h(
      "div",
      { class: "sh" },
      h("h2", null, "Site basics"),
      h("span"),
      sums(
        stepHours(result, "basics") + stepHours(result, "languages"),
        designFor(result, ...basicsIds),
      ),
    ),
    basicRow(result, "templates", "pages"),
    basicRow(result, "sections", "sections"),
    basicRow(result, "menu", "menu"),
    basicRow(result, "languages", "globe"),
    row({
      lead: icon("layers"),
      name: "Website pages",
      note: `Not build hours. ${starterPageCap}+ needs Professional`,
      control: stacked(pagesControl(result)),
    }),
    launch(result),
  ];
}

/* ---------- Features in the estimate ---------- */

/** The spine down the left of an item is its button: the tick sits at its top, and a press anywhere
    on it takes the item out (under the pointer the tick turns into a cross). */
function spine(id: string, name: string): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: "spine",
      "aria-label": `Take ${name} out of the estimate`,
      title: "Take out of the estimate",
      data: { action: "tile", id, focus: `tile-${id}` },
    },
    h("span", { class: "mk take" }, icon("tick", "ic t"), icon("cross", "ic x")),
  );
}

function feat(id: string, head: HTMLElement, parts: HTMLElement[] = []): HTMLElement {
  return h(
    "div",
    { class: "feat", data: { key: id, lane: "on" } },
    spine(id, laneName(id)),
    head,
    parts.length ? h("div", { class: "subs" }, parts) : null,
  );
}

function plainItem(result: Quote, id: string): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id] ?? tile.initial;
  let control: HTMLElement | null = null;
  if (tile.modes) control = stacked(modes(id, tile.modes, qty));
  else if (tile.stepped) control = stepper(tile, qty);
  return feat(
    id,
    row({
      lead: null,
      name: [laneName(id), tag(tile)],
      note: stack(modeNotes(tile, result), tile.modes ? qty - 1 : 0),
      hint: hint(id, result),
      control,
      hours: hrs(lineHours(result, id), designFor(result, id)),
    }),
  );
}

/** Content, Page migration and Blog import: hours you enter yourself, which count as Content
    hours. An hours field, and the hours in Content's colour. */
function enteredItem(result: Quote, id: string, missing: boolean): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id] ?? 0;
  const name = laneName(id);
  const input = hoursInput(tile.id, `${name} hours`, qty, tile.max);
  if (missing) input.setAttribute("aria-invalid", "true");
  /* When Copy hours found none, the warning takes the note's place; the place is as tall as the
     longer of the two, so nothing moves */
  const note = stack(
    [noteOf(tile, result), "Add hours, or take it out of the estimate"],
    missing ? 1 : 0,
  );
  note.lastElementChild?.classList.add("warn");
  return feat(
    id,
    row({
      className: missing ? "content missing" : "content",
      lead: null,
      name,
      note,
      control: unitField(input),
      hours: h(
        "span",
        { class: "hrs one" },
        h("span", { class: "hc" }, hoursLabel(qty)),
        h("span"),
      ),
    }),
  );
}

/** A part inside an item that can be added or taken out on its own. */
function subItem(result: Quote, id: string, blockedNote?: string): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id];
  const blocked =
    blockedNote !== undefined && isModuleBased(result.selection.tiles["product-catalogue"]);
  /* The same note place and control place in every state, so switching a part on or off moves
     nothing */
  const note = stack(
    blockedNote === undefined ? [noteOf(tile, result)] : [noteOf(tile, result), blockedNote],
    blocked ? 1 : 0,
  );
  const control = (on: boolean) =>
    tile.stepped ? reserved(stepper(tile, qty ?? tile.initial), !on) : null;
  const name = [tile.label, tag(tile)];
  if (blocked) {
    return row({
      className: "sub blocked",
      attrs: { "aria-disabled": "true", title: blockedNote ?? "" },
      lead: h("span", { class: "lock" }, icon("lock")),
      name,
      note,
      control: control(false),
      hours: reserved(hrs(0, 1, true), true),
    });
  }
  if (qty !== undefined) {
    return row({
      className: "sub is-on",
      attrs: { "data-press": ".take" },
      lead: take(id, tile.label),
      name,
      note,
      control: control(true),
      hours: hrs(lineHours(result, id), designFor(result, id)),
    });
  }
  const add = cue(result, id);
  return row({
    className: "sub off",
    attrs: { "data-press": ".add" },
    lead: addPill(id, tile.label),
    name,
    note,
    control: control(false),
    hours: hrs(add.build > 0 ? add.build : null, add.design, true),
  });
}

function blogItem(result: Quote): HTMLElement {
  const tiles = result.selection.tiles;
  const tile = getTile("blog-setups");
  const blogs = tiles["blog-setups"] ?? tile.initial;
  const ids = ["blog-setups", "blog-list", "blog-post", "blog-recent"];
  /* One list template and one post template, shared by every blog */
  const parts = (["blog-list", "blog-post"] as const).map((id) => {
    const part = getTile(id);
    const qty = tiles[id] ?? part.initial;
    return row({
      className: "sub",
      name: part.label,
      note: stack(modeNotes(part, result), qty - 1),
      hint: hint(id, result),
      control: stacked(modes(id, part.modes ?? [], qty)),
      hours: hrs(lineHours(result, id), designFor(result, id)),
    });
  });
  parts.push(subItem(result, "blog-recent"));
  return feat(
    "blog-setups",
    row({
      lead: null,
      name: "Blog",
      hint: hint("blog-setups", result),
      note: stack(
        [noteOf(tile, result), `${blogs} blogs, with list and post templates`],
        blogs > 1 ? 1 : 0,
      ),
      control: stepper(tile, blogs),
      hours: hrs(
        ids.reduce((sum, id) => sum + lineHours(result, id), 0),
        designFor(result, ...ids),
      ),
    }),
    parts,
  );
}

/** Complexity in three controls, apart: Module based; the Dynamic pages modes, labelled above; and
    Custom, your own estimate, with its hours field. */
function complexity(result: Quote, shown: number): HTMLElement {
  const tile = getTile("product-catalogue");
  const parts: {
    key: string;
    group?: string;
    custom: boolean;
    at: number;
    buttons: HTMLElement[];
  }[] = [];
  (tile.modes ?? []).forEach((mode, index) => {
    const key = mode.group ?? `mode-${index}`;
    let part = parts.find((item) => item.key === key);
    if (!part) {
      part = { key, group: mode.group, custom: !!mode.customHours, at: index + 1, buttons: [] };
      parts.push(part);
    }
    part.buttons.push(modeButton(tile.id, mode.label, index + 1, shown, mode.disabled));
  });
  const hoursTile = getTile("catalogue-custom");
  return h(
    "div",
    { class: "complexity" },
    parts.map((part) =>
      h(
        "div",
        { class: "cpart" },
        part.group ? h("span", { class: "kicker", "aria-hidden": "true" }, part.group) : null,
        h("div", { class: "modes" }, part.buttons),
        part.custom
          ? reserved(
              unitField(
                hoursInput(
                  hoursTile.id,
                  "Custom catalogue hours",
                  result.selection.tiles[hoursTile.id] ?? 0,
                  hoursTile.max,
                ),
              ),
              shown !== part.at,
            )
          : null,
      ),
    ),
  );
}

function catalogueItem(result: Quote): HTMLElement {
  const tile = getTile("product-catalogue");
  const shown = result.selection.tiles["product-catalogue"] ?? tile.initial;
  const ids = ["product-catalogue", "catalogue-custom", "favorite-products", "related-products"];
  /* The source with options is the one in use; the others are coming */
  const list = catalogueSources();
  const coming = list.filter((source) => source.id !== catalogueId).map((source) => source.source);
  const sources = h(
    "div",
    { class: "modes" },
    list.map((source) => {
      const live = source.id === catalogueId;
      return h(
        "button",
        {
          type: "button",
          class: live ? "mode is-on" : "mode",
          "aria-pressed": String(live),
          disabled: !live,
          title: live ? null : "In development",
        },
        source.source,
      );
    }),
  );
  return feat(
    "product-catalogue",
    row({
      lead: null,
      name: ["Product catalogue", tag(tile)],
      hint: hint("product-catalogue", result),
      note: `Catalogue with ${tile.source} as its source`,
      hours: hrs(
        ids.reduce((sum, id) => sum + lineHours(result, id), 0),
        designFor(result, ...ids),
      ),
    }),
    [
      row({
        className: "sub wide",
        name: "Source",
        note: coming.length
          ? `${coming.join(" and ").replace(/ and (?=.* and )/g, ", ")} ${coming.length === 1 ? "is" : "are"} in development`
          : null,
        control: sources,
      }),
      row({
        className: "sub wide",
        name: "Complexity",
        note: stack(modeNotes(tile, result), shown - 1),
        control: complexity(result, shown),
        hours: hrs(
          lineHours(result, "product-catalogue") + lineHours(result, "catalogue-custom"),
          designFor(result, "product-catalogue"),
        ),
      }),
      subItem(result, "favorite-products"),
      subItem(result, "related-products", "Needs dynamic pages. Choose it under Complexity."),
    ],
  );
}

function laneItem(result: Quote, id: string, state: PageState): HTMLElement {
  if (id === "blog-setups") return blogItem(result);
  if (id === "product-catalogue") return catalogueItem(result);
  if (getTile(id).hourInput) return enteredItem(result, id, state.missing.has(id));
  return plainItem(result, id);
}

/** Moves to the shelf and its first Add. */
function toShelf(): void {
  const shelf = document.querySelector(".shelf");
  if (!shelf) return;
  shelf.scrollIntoView({ block: "nearest", inline: "nearest" });
  shelf.querySelector<HTMLElement>(".s-row .add")?.focus({ preventScroll: true });
}

function estimate(result: Quote, state: PageState): Kid[] {
  const tiles = result.selection.tiles;
  const left = laneIds.filter((id) => tiles[id] === undefined).length;
  const content = stepHours(result, "content");
  return [
    h(
      "div",
      { class: "sh" },
      h(
        "h2",
        null,
        "Features in the estimate",
        h("span", { class: "count" }, `${store.order.length} of ${laneIds.length}`),
      ),
      /* Content: its figure only, in its own colour, before Build and Design */
      h(
        "span",
        {
          class: "hrs sum c",
          title: "Content hours",
          "aria-label": `Content ${hoursLabel(content)}`,
        },
        h("span", null, hoursLabel(content)),
      ),
      sums(stepHours(result, "addons"), designFor(result, ...laneIds, ...partIds)),
    ),
    /* Items sit in the order they were added, Content too */
    store.order.length
      ? store.order.map((id) => laneItem(result, id, state))
      : h(
          "p",
          { class: "empty" },
          "Nothing in the estimate yet. Add what the site needs from the shelf.",
        ),
    /* The reminder against an item left out: what is still on the shelf, one press from it. Keyed like
       a card, so it moves with the cards when one comes or goes. */
    left
      ? h(
          "button",
          {
            type: "button",
            class: "r more",
            data: { focus: "more", key: "more-on-shelf", lane: "on" },
            on: { click: toShelf },
          },
          h("span", { class: "lead" }, icon("arrow")),
          h(
            "span",
            { class: "tx" },
            h("b", null, `${left} more on the shelf`),
            h("small", null, "Check nothing the site needs is left out"),
          ),
        )
      : null,
  ];
}

/* ---------- The shelf ---------- */

function shelfRow(result: Quote, id: string): HTMLElement {
  const tile = getTile(id);
  const name = laneName(id);
  let right: HTMLElement;
  if (tile.hourInput) right = h("span", { class: "s-cue" }, "Enter hours");
  else {
    const add = cue(result, id);
    right = h(
      "span",
      { class: "s-hrs" },
      h("span", { class: "hb" }, add.build > 0 ? plus(add.build) : ""),
      h("span", { class: "hd" }, add.design > 0 ? plus(add.design) : ""),
    );
  }
  return h(
    "div",
    { class: "s-row", "data-press": ".add", data: { key: id, lane: "off" } },
    addPill(id, name),
    h("span", { class: "s-name" }, name, tag(tile)),
    right,
  );
}

function blockedRow(id: string): HTMLElement {
  const tile = getTile(id);
  return h(
    "div",
    {
      class: "s-row is-blocked",
      "aria-disabled": "true",
      data: { key: id, lane: "blocked" },
    },
    h("span", { class: "lock" }, icon("lock")),
    h("span", { class: "s-name" }, tile.label, tag(tile)),
    /* Shown over the row while the pointer is on it */
    h("span", { class: "tip", role: "tooltip" }, "In development. Not part of the estimate yet."),
  );
}

function shelf(result: Quote): HTMLElement {
  const off = laneIds.filter((id) => result.selection.tiles[id] === undefined);
  const groups: HTMLElement[] = [];
  /* These groups never change, so a package change cannot reshuffle the shelf */
  for (const [rule, name] of shelfGroups) {
    const members = off.filter((id) => shelfGroupOf(id) === rule);
    const blocked = rule === "Any package" ? blockedShelfIds : [];
    if (!members.length && !blocked.length) continue;
    groups.push(
      h(
        "div",
        { class: "s-group" },
        h(
          "h3",
          null,
          h("span", null, name),
          groups.length === 0
            ? h(
                "span",
                { class: "s-key", "aria-hidden": "true" },
                h("span", { class: "hb" }, "Build"),
                h("span", { class: "hd" }, "Design"),
              )
            : null,
        ),
        members.map((id) => shelfRow(result, id)),
        blocked.map(blockedRow),
      ),
    );
  }
  return h(
    "aside",
    { class: "shelf", "aria-label": "Not in the estimate" },
    h(
      "div",
      { class: "s-scroll", data: { keepScroll: "shelf" } },
      h(
        "div",
        { class: "s-head" },
        h(
          "h2",
          null,
          "Not in the estimate",
          h("span", { class: "count" }, `${off.length} of ${laneIds.length}`),
        ),
      ),
      off.length ? null : h("p", { class: "s-empty" }, "Everything is in the estimate."),
      groups,
    ),
  );
}

/* ---------- Sidebar: package and tier, the total, the actions ---------- */

function steps(count: number, at: number, className = ""): HTMLElement {
  const marks: HTMLElement[] = [];
  for (let index = 0; index < count; index += 1) {
    marks.push(h("i", { class: index < at ? "past" : index === at ? "on" : null }));
  }
  return h("span", { class: `steps ${className}`.trim(), "aria-hidden": "true" }, marks);
}

/** Popovers from the sidebar open beside it, level with their button, instead of over the sidebar.
    The app's popover places itself first; this runs after it. In one column they stay where it puts
    them. */
function besideSidebar(wrap: HTMLElement): HTMLElement {
  const trigger = wrap.querySelector("button");
  const panel = wrap.querySelector<HTMLElement>(".pop-panel");
  if (!trigger || !panel) return wrap;
  trigger.addEventListener("click", () => {
    const sidebar = document.querySelector(".side");
    if (!panel.matches(":popover-open") || !sidebar) return;
    if (getComputedStyle(sidebar).flexDirection === "row") return;
    const edge = sidebar.getBoundingClientRect().right;
    const box = trigger.getBoundingClientRect();
    panel.style.maxHeight = `${Math.min(560, window.innerHeight - 16)}px`;
    panel.style.left = `${edge + 8}px`;
    panel.style.bottom = "auto";
    panel.style.top = `${Math.max(8, Math.min(box.top, window.innerHeight - panel.offsetHeight - 8))}px`;
  });
  return wrap;
}

function badge(result: Quote): HTMLElement {
  const edition = editionLabel[result.edition];
  const tier = tierPop(result);
  tier[0] = h(
    "div",
    { class: "pop-head" },
    h("strong", { class: "pop-title" }, `Content Hub ${edition}`),
    h("span", { class: "pop-status" }, "Your tier"),
  );
  const wrap = besideSidebar(
    popover(
      "Package and HubSpot tier",
      [...packagePop(result, result.shape), h("hr", { class: "pop-rule" }), ...tier],
      "badge",
    ),
  );
  wrap.classList.add("badge-pop");
  const trigger = wrap.querySelector("button");
  trigger?.setAttribute(
    "aria-label",
    `${result.label} package on Content Hub ${edition}. Show why`,
  );
  trigger?.replaceChildren(
    h(
      "span",
      { class: "half pkg" },
      logo(),
      h(
        "span",
        { class: "hl" },
        h("span", { class: "own" }, "Resultify package"),
        h("b", null, result.label),
        steps(shapeChoices.length, rankOf(result.shape)),
      ),
    ),
    h("span", { class: "join", "aria-hidden": "true" }, icon("plus")),
    h(
      "span",
      { class: "half hub" },
      sprocket(),
      h(
        "span",
        { class: "hl" },
        h("span", { class: "own" }, "HubSpot Content Hub"),
        h("b", null, edition),
        steps(tiers.length, tiers.indexOf(result.edition as (typeof tiers)[number]), "hub"),
      ),
    ),
  );
  return wrap;
}

/** One dot per hour, in four blocks of 50 that fill the width; past 200 hours a dot stands for more,
    and the grid says so. Design first, then build, then content; the rest stay empty. */
const blockCount = 4;
const perBlock = 50;
function dots(result: Quote): { unit: number; blocks: HTMLElement[] } {
  const room = blockCount * perBlock;
  const unit =
    [1, 2, 5, 10, 20, 50, 100, 200, 500].find((size) => result.hours / size <= room) ?? 1000;
  const cells: string[] = [];
  for (const [kind, hours] of [
    ["d", result.designHours],
    ["b", result.implementationHours],
    ["c", result.contentHours],
  ] as const) {
    for (let index = 0; index < Math.round(hours / unit) && cells.length < room; index += 1) {
      cells.push(kind);
    }
  }
  while (cells.length < room) cells.push("e");
  const blocks: HTMLElement[] = [];
  for (let index = 0; index < room; index += perBlock) {
    const part = cells.slice(index, index + perBlock);
    blocks.push(
      h(
        "span",
        { class: part.every((kind) => kind === "e") ? "blk is-empty" : "blk" },
        part.map((kind) => h("i", { class: kind })),
      ),
    );
  }
  return { unit, blocks };
}

function total(result: Quote): HTMLElement {
  const grid = dots(result);
  return h(
    "div",
    { class: "total" },
    h(
      "div",
      { class: "tnum" },
      h("span", { class: "tlabel" }, "Total"),
      h(
        "p",
        { class: result.hours >= 1000 ? "big is-long" : "big", "aria-live": "polite" },
        formatHours(result.hours),
        h("small", null, "h"),
      ),
      h(
        "ul",
        { class: "lg" },
        h("li", { class: "d" }, "Design", h("b", null, hoursLabel(result.designHours))),
        h("li", { class: "b" }, "Build", h("b", null, hoursLabel(result.implementationHours))),
        h("li", { class: "c" }, "Content", h("b", null, hoursLabel(result.contentHours))),
      ),
    ),
    h(
      "div",
      {
        class: "hgrid",
        "aria-hidden": "true",
        title: grid.unit === 1 ? "One dot per hour" : `One dot per ${grid.unit} hours`,
      },
      grid.blocks,
      reserved(h("span", { class: "dot-unit" }, `1 dot = ${grid.unit}h`), grid.unit === 1),
    ),
  );
}

function actButton(
  state: PageState,
  key: string,
  lead: IconName,
  long: string,
  short: string,
  className: string,
  onClick: () => void,
  disabled = false,
): HTMLElement {
  const said = state.said.get(key);
  return h(
    "button",
    {
      type: "button",
      class: `ab ${className}`.trim(),
      disabled,
      "aria-label": long,
      data: { focus: `act-${key}` },
      on: { click: onClick },
    },
    icon(lead),
    h("span", { class: "al" }, said ?? long),
    h("small", null, said ? said.split(" ")[0] : short),
  );
}

function popAction(
  lead: IconName,
  long: string,
  short: string,
  content: Node[],
  count?: number,
  ready?: () => boolean,
): HTMLElement {
  const wrap = besideSidebar(popover(long, content, "ab"));
  const trigger = wrap.querySelector("button");
  const panel = wrap.querySelector(".pop-panel");
  /* Asked before the popover opens: a press it turns down never reaches the button. Closing is
     always fine. */
  if (ready) {
    wrap.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Node) || !trigger?.contains(event.target)) return;
        if (panel?.matches(":popover-open") || ready()) return;
        event.stopPropagation();
      },
      true,
    );
  }
  trigger?.replaceChildren(
    icon(lead),
    h("span", { class: "al" }, long),
    h("small", null, short),
    count === undefined ? "" : h("span", { class: "n" }, String(count)),
  );
  trigger?.setAttribute("aria-label", count === undefined ? long : `${long} (${count})`);
  return wrap;
}

function side(result: Quote, state: PageState): HTMLElement {
  return h(
    "aside",
    { class: "side", "aria-label": "Summary and actions", data: { keepScroll: "side" } },
    h("div", { class: "side-sum" }, badge(result), total(result)),
    h(
      "nav",
      { class: "side-act", "aria-label": "Actions" },
      /* What you do with the hours, together: copy them, or see where they come from */
      h(
        "div",
        { class: "hours-act", role: "group", "aria-label": "Hours" },
        actButton(state, "copy", "copy", "Copy hours", "Copy", "primary", state.copyHours),
        popAction("list", "Hours breakdown", "Hours", [breakdownList(result)], undefined, () =>
          state.hoursReady("open the breakdown"),
        ),
      ),
      actButton(state, "share", "share", "Share link", "Share", "", state.shareLink),
      popAction(
        "included",
        "Always included",
        "Included",
        [includedList(result)],
        includedCount(result),
      ),
      h("span", { class: "gap" }),
      /* Nothing to reset on the starting estimate */
      actButton(state, "reset", "reset", "Reset", "Reset", "warn", state.reset, !state.canReset),
    ),
  );
}

function toast(state: PageState): HTMLElement | null {
  if (!state.canUndo) {
    return state.warning
      ? h("div", { class: "toast is-warn", role: "alert" }, h("span", null, state.warning))
      : null;
  }
  return h(
    "div",
    { class: "toast", role: "status" },
    h("span", null, "Estimate reset to Essential."),
    h(
      "button",
      { type: "button", data: { focus: "undo" }, on: { click: state.undoReset } },
      "Undo",
    ),
  );
}

/* ---------- Page ---------- */

export function render(result: Quote, state: PageState): HTMLElement {
  return h(
    "main",
    { class: "page" },
    side(result, state),
    h(
      "section",
      { class: "panel basics", "aria-label": "Design and site basics" },
      h(
        "div",
        { class: "pb", data: { keepScroll: "setup" } },
        designPart(result),
        basicsPart(result),
      ),
    ),
    h(
      "section",
      { class: "panel est", "aria-label": "Features in the estimate" },
      h(
        "div",
        { class: "pb", data: { keepScroll: "on", lane: "on-column" } },
        estimate(result, state),
      ),
    ),
    shelf(result),
    toast(state),
  );
}
