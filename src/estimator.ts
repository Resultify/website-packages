/* The page: summary sidebar | Design and Site basics | Features in the estimate | the shelf.
   Every row has one anatomy: lead mark | name and note | control | hours (Design over Build).

   Hours, package and tier, and every row action are the app's own (controls.ts, quote.ts): the buttons
   and fields drawn here carry data-action, data-id and data-focus, so bindActions handles them. Copy
   hours, Share link and Reset with Undo are the client's (PageState). */
import {
  aiDiscountShares,
  catalogueId,
  catalogueSources,
  clientDesignPercent,
  currentCatalog,
  type DesignChoice,
  designChoices,
  managementPercent,
  editionLabel,
  getTile,
  optionNotes,
  packageName,
  packageRules,
  partsOf,
  ownerOf,
  placeName,
  projectName,
  shapeChoices,
  starterPageCap,
  type Tile,
  tierMark,
  tileMode,
  tileNote,
} from "./catalog.ts";
import {
  stepper as appStepper,
  blockedShelfIds,
  breakdownList,
  designChoice,
  designFor,
  fixedHours,
  fixedIds,
  projectIds,
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
import { appName, currentRelease, releaseDay, releases } from "./changelog.ts";
import { h, type Kid } from "./dom.ts";
import { type IconName, icon, logo, sprocket } from "./icons.ts";
import {
  aiDesignHours,
  aiVariantCost,
  choiceOf,
  designOf,
  managementLineId,
  isIn,
  isBlocked,
  formatHours,
  type Quote,
  quote,
  setTile,
  sourceIn,
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

/** The Blog and the Product catalogue are named after their place; every other item by its row. */
const laneNames: Record<string, string> = {
  "blog-setups": placeName.blog,
  [catalogueId]: placeName.catalogue,
};
const basicsIds = [
  "templates",
  "sections",
  "menu",
  "header",
  "footer",
  "setup",
  "kickoff",
  "training",
];
const shelfGroups = [
  ["Any package", "Any package"],
  ["Needs Growth", "Growth"],
  ["Needs Platform", "Platform"],
] as const;
const tiers = ["starter", "professional", "enterprise"] as const;

const plus = (hours: number) => `+${hoursLabel(hours)}`;
const laneName = (id: string) => laneNames[id] ?? getTile(id).label;
/** A note, with its build hours for the estimate's design choice where it says {build}. */
const noteOf = (tile: Tile, result: Quote) => tileNote(tile, choiceOf(result.selection));
const modeNotes = (tile: Tile, result: Quote) => optionNotes(tile, choiceOf(result.selection));
const rankOf = (shape: string) => shapeChoices.findIndex((item) => item.id === shape);

/* ---------- Small parts ---------- */

/** The tier badge: for the option or quantity the item has in the estimate, or starts with on the
    shelf. */
function tag(tile: Tile, qty: number = tile.initial): HTMLElement | null {
  const mark = tierMark(tile, qty);
  return mark ? h("span", { class: "tag" }, mark) : null;
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

/** Design over Build, the same column everywhere. A row that never has design hours keeps one line:
    Languages, and Project's rows (project: its hours are Project, not Build, in Project's colour). */
function hrs(
  build: number | null,
  design: number,
  signed = false,
  one = false,
  project = false,
): HTMLElement {
  const format = signed ? plus : hoursLabel;
  return h(
    "span",
    { class: one || project ? "hrs one" : "hrs" },
    h("span", { class: "hd" }, design > 0 ? format(design) : ""),
    h("span", { class: project ? "hb hp" : "hb" }, build === null ? "" : format(build)),
  );
}

/** An item's total, over the rows of its parts: each figure after its label, as the column's head
    writes its sums, so it reads apart from the parts' bare figures. Design over Build, as the
    parts' figures; project: Project hours, on one line. */
function itemTotal(build: number, design: number, project = false): HTMLElement {
  return h(
    "span",
    { class: project ? "hrs tot one" : "hrs tot" },
    h("span", { class: "hd" }, design > 0 ? [h("small", null, "Design"), hoursLabel(design)] : ""),
    h(
      "span",
      { class: project ? "hb hp" : "hb" },
      h("small", null, project ? projectName : "Build"),
      hoursLabel(build),
    ),
  );
}

/** A head's leading figure keeps its label while the title still fits on its line. Where it does
    not, the label goes, and the figure's colour says what it is. Below 1340px it never shows. */
export function fitHeads(root: ParentNode): void {
  for (const head of root.querySelectorAll<HTMLElement>(".sh")) {
    if (!head.querySelector(":scope > .hrs.sum.c, :scope > .hrs.sum.p")) continue;
    head.classList.remove("is-tight");
    const title = head.querySelector("h2");
    if (!title) continue;
    const line = Number.parseFloat(getComputedStyle(title).lineHeight) || 22;
    if (title.getBoundingClientRect().height > line + 1) head.classList.add("is-tight");
  }
}

/** The figure that leads a column title's line, before Design and Build, in its own colour: Content
    in the estimate, Project in the site basics. Its label shows where there is room. */
function lead(kind: "c" | "p", name: string, hours: number): HTMLElement {
  return h(
    "span",
    {
      class: `hrs sum ${kind}`,
      title: `${name} hours`,
      "aria-label": `${name} ${hoursLabel(hours)}`,
    },
    h("span", null, h("small", null, name), hoursLabel(hours)),
  );
}

/** The figures on a column title's line, each after its label: Project when there is some, then
    Design and Build. */
function sums(
  build: number | null,
  design: number | null,
  designCaption = "Design",
  project: number | null = null,
): HTMLElement {
  return h(
    "span",
    { class: "hrs sum" },
    project === null
      ? null
      : h("span", { class: "hp" }, h("small", null, projectName), hoursLabel(project)),
    h(
      "span",
      { class: "hd" },
      design === null ? "" : [h("small", null, designCaption), hoursLabel(design)],
    ),
    h(
      "span",
      { class: "hb" },
      build === null ? "" : [h("small", null, "Build"), hoursLabel(build)],
    ),
  );
}

type RowOptions = {
  /** The lead mark. Left out, the row has no lead column: its name starts where the hairline does. */
  lead?: Kid;
  name: Kid;
  /** More about the row, over it while the pointer or the focus is on its name. */
  info?: { id: string; content: Kid };
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
      h(
        "b",
        null,
        options.info
          ? h(
              "span",
              { class: "has-info", tabindex: "0", "aria-describedby": `info-${options.info.id}` },
              options.name,
              h(
                "span",
                { class: "info-pop", role: "tooltip", id: `info-${options.info.id}` },
                options.info.content,
              ),
            )
          : options.name,
      ),
      options.note || options.hint
        ? h("small", null, options.note ? h("span", null, options.note) : null, options.hint)
        : null,
    ),
    h("div", { class: "ctl" }, options.control),
    options.hours ?? h("span", { class: "hrs" }),
  );
}

/** The app's stepper (number field and buttons, data-action dec/qty/inc) with drawn signs. */
function stepper(tile: Tile, qty: number, locked = false, extra = false): HTMLElement {
  const node = appStepper(tile, qty, locked, extra);
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

/** What adding an item would add, from the app's own quote: its own hours, as its row shows them
    once it is in. Project management grows with it, in the site basics. */
function cue(result: Quote, id: string): { build: number; design: number } {
  const next = quote(setTile(result.selection, id, true));
  const design = next.designHours - result.designHours;
  const management = lineHours(next, managementLineId) - lineHours(result, managementLineId);
  return { build: next.hours - result.hours - design - management, design };
}

/* ---------- Design and Site basics ---------- */

/** What feedback rounds are, and what each design includes and charges for them. */
function feedbackInfo(chosen: DesignChoice): Kid {
  const max = getTile(chosen.feedbackId ?? "").max;
  return [
    h("span", { class: "info-title" }, "Feedback rounds"),
    h(
      "span",
      { class: "info-p" },
      "One round: the client reviews the design, and the designer makes the changes.",
    ),
    h(
      "span",
      { class: "info-list" },
      designChoices.map((choice) => {
        if (!choice.feedbackId) return null;
        const rounds = getTile(choice.feedbackId);
        return h(
          "span",
          { class: choice === chosen ? "is-on" : null },
          h("span", null, choice.label),
          h("span", null, `${rounds.includedInBase} included, then ${rounds.build.custom}h each`),
        );
      }),
    ),
    h("span", { class: "info-p" }, `Up to ${max} rounds.`),
  ];
}

/** Project management, in the Project fold of the site basics: one share, whatever the design, and
    with no design, of a share of the design hours Custom would have too. */
function managementRow(result: Quote): HTMLElement {
  const line = result.lines.find((item) => item.id === managementLineId);
  return row({
    className: "part",
    name: "Project management",
    info: {
      id: "management",
      content: [
        h("span", { class: "info-title" }, "Project management"),
        h(
          "span",
          { class: "info-p" },
          `Planning, meetings and coordination for the whole project: ${formatHours(managementPercent())}% of its design, build and content hours, rounded up.${clientDesignPercent() > 0 ? ` With no design, it also counts ${formatHours(clientDesignPercent())}% of the design hours Custom would have: the client's design is still checked, handed over and built from.` : ""} The kick-off and training are not counted.`,
        ),
      ],
    },
    note: line?.mode ?? "",
    hours: hrs(line?.openHours ?? 0, 0, false, false, true),
  });
}

/** What AI variants are, and what one more costs for this estimate. */
function variantsInfo(result: Quote): Kid {
  const variants = getTile("ai-design");
  const percent = currentCatalog().variantPercent;
  return [
    h("span", { class: "info-title" }, "Variants"),
    h(
      "span",
      { class: "info-p" },
      "Whole designs the AI generates from the brief and the agreed prototype, for the client to choose one.",
    ),
    h(
      "span",
      { class: "info-p" },
      `${variants.includedInBase} included. Each one more is ${percent}% of the AI design hours of this estimate, rounded up: ${percent}% of ${hoursLabel(aiDesignHours(result))} is ${hoursLabel(aiVariantCost(result))}. Up to ${variants.max}.`,
    ),
  ];
}

function designPart(result: Quote): HTMLElement[] {
  const tiles = result.selection.tiles;
  const chosen = designOf(result.selection);
  const feedbackId = chosen.feedbackId;
  /* Only extra feedback rounds and extra variants add hours here; every other design hour sits with
     its item */
  const extra = (feedbackId ? lineHours(result, feedbackId) : 0) + lineHours(result, "ai-variants");
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
        designChoices.map((choice) => designChoice(result, choice.id, choice.label)),
      ),
      h(
        "small",
        null,
        getTile(chosen.id).summary,
        designDetails[chosen.kind] ? [" ", readMore(chosen)] : null,
      ),
    ),
  ];
  /* Extra feedback and Extra variants count from 0: the included ones are in the note */
  if (feedbackId) {
    const feedback = getTile(feedbackId);
    out.push(
      row({
        lead: icon("feedback"),
        name: "Extra feedback",
        info: { id: "feedback", content: feedbackInfo(chosen) },
        note: noteOf(feedback, result),
        control: stepper(feedback, tiles[feedbackId] ?? feedback.initial, false, true),
        hours: hrs(null, lineHours(result, feedbackId)),
      }),
    );
  }
  if (chosen.kind === "ai") {
    const variants = getTile("ai-design");
    out.push(
      row({
        lead: icon("variants"),
        name: "Extra variants",
        info: { id: "variants", content: variantsInfo(result) },
        note: `${variants.includedInBase} included, then ${hoursLabel(aiVariantCost(result))} each`,
        control: stepper(variants, tiles["ai-design"] ?? variants.initial, false, true),
        hours: hrs(null, lineHours(result, "ai-variants")),
      }),
    );
  }
  return out;
}

/* ---------- Design: Read more ---------- */

/** What a design includes, step by step, for its Read more. The counts the rules set come in, so
    the words follow config.ts; the prototype's rounds are part of the AI design hours, not a rule. */
type DesignDetails = {
  intro: string;
  steps: (included: { rounds: number; variants: number }) => [title: string, text: string][];
};

const roundsOf = (choice: DesignChoice) =>
  choice.feedbackId ? getTile(choice.feedbackId) : undefined;
const roundsText = (count: number) => `${count} feedback ${count === 1 ? "round" : "rounds"}`;

const designDetails: Partial<Record<DesignChoice["kind"], DesignDetails>> = {
  ai: {
    intro:
      "A design generated in full by AI from what we learn about the client, made for the site alone. The client chooses from several whole designs, and every step has room for feedback.",
    steps: ({ rounds, variants }) => [
      [
        "Brief",
        "We collect what the design starts from: the brand (logo, colours and fonts), examples of sites the client likes, inspiration and the site's goals.",
      ],
      [
        "Prototype",
        "We present a prototype to agree on the content structure and the wireframe of each page template: what goes where, with no design yet. Refined with the client over up to 3 feedback rounds.",
      ],
      [
        `${variants} design variants`,
        `AI generates ${variants} whole designs on the agreed prototype, and the client picks the one to go on with.`,
      ],
      [
        "Final design",
        `The chosen variant is finished into the final design, with ${roundsText(rounds)}.`,
      ],
    ],
  },
  nimbly: {
    intro:
      "A designer adapts Nimbly's default templates to the client's brand. The layouts are proven and already built, so the site looks like the client's at a lower cost than a design of its own.",
    steps: ({ rounds }) => [
      [
        "Brief",
        "We collect the brand (logo, colours and fonts) and examples of sites the client likes.",
      ],
      [
        "Styling in Figma",
        "In Figma, the designer sets the templates in the brand: colours, fonts, buttons, spacing and images, for every page template and section in the estimate.",
      ],
      [
        "Final design",
        `The client reviews it in Figma, and it is refined over ${roundsText(rounds)}. The Figma file is what the site is built from.`,
      ],
    ],
  },
  custom: {
    intro:
      "A designer creates a design of the client's own, from a blank page rather than Nimbly's templates: for a brand that needs to stand apart.",
    steps: ({ rounds }) => [
      [
        "Discovery",
        "The brand, the site's goals and audience, competitors, and examples and inspiration the client likes.",
      ],
      [
        "Concept in Figma",
        "A design direction on the key pages, drawn in Figma and agreed with the client before the rest is designed.",
      ],
      [
        "Every template and section",
        "Each page template and section in the estimate, designed in full in Figma to the concept, with its styles and components.",
      ],
      [
        "Final design",
        `The client reviews it in Figma, and it is refined over ${roundsText(rounds)}. The Figma file is what the site is built from.`,
      ],
    ],
  },
};

/** The design's Read more: a link-like button after its note that opens its details. */
function readMore(choice: DesignChoice): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: "more-link",
      "aria-haspopup": "dialog",
      "aria-label": `Read more about ${choice.name}`,
      data: { focus: `more-${choice.id}` },
      on: { click: () => designDialog(choice).showModal() },
    },
    "Read more",
  );
}

/** What is included with each design, and what more costs, in a dialog outside the page as the
    Changelog's is, so a redraw leaves it open. Made again on each opening: it follows the rules. */
function designDialog(choice: DesignChoice): HTMLDialogElement {
  document.querySelector("dialog.design-more")?.remove();
  const details = designDetails[choice.kind];
  const rounds = roundsOf(choice);
  const needs = packageRules.find((rule) => rule.tileId === choice.id)?.package;
  const result = quote(store.selection);
  const extras: string[] = [
    ...(rounds ? [`Extra feedback rounds: ${hoursLabel(rounds.build.custom)} each`] : []),
    ...(choice.kind === "ai"
      ? [
          `Extra variants: ${formatHours(currentCatalog().variantPercent)}% of the AI design hours each, ${hoursLabel(aiVariantCost(result))} in this estimate`,
        ]
      : []),
  ];
  const included = {
    rounds: rounds?.includedInBase ?? 0,
    variants: getTile("ai-design").includedInBase,
  };
  const dialog = h(
    "dialog",
    { class: "design-more", "aria-labelledby": "design-more-title" },
    h(
      "div",
      { class: "cl-head" },
      h("h2", { id: "design-more-title" }, choice.name),
      h(
        "button",
        { type: "button", class: "cl-close", "aria-label": "Close", data: { close: "" } },
        icon("cross"),
      ),
    ),
    h(
      "div",
      { class: "cl-body", tabindex: "-1", autofocus: true },
      details ? h("p", { class: "dm-intro" }, details.intro) : null,
      h(
        "ol",
        { class: "dm-steps" },
        (details?.steps(included) ?? []).map(([title, text]) =>
          h("li", null, h("b", null, title), h("span", null, text)),
        ),
      ),
      h(
        "p",
        { class: "dm-included" },
        icon("tick"),
        needs ? `All included. Needs ${packageName[needs]}.` : "All included.",
      ),
      extras.length
        ? [
            h("h4", null, "More, if the client wants it"),
            h(
              "ul",
              { class: "dm-extras" },
              extras.map((text) => h("li", null, text)),
            ),
          ]
        : null,
    ),
  );
  dialog.addEventListener("click", (event) => {
    const target = event.target;
    /* The backdrop is the dialog itself: its content fills it */
    if (target === dialog || (target instanceof Element && target.closest("[data-close]"))) {
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  return dialog;
}

function basicRow(result: Quote, id: string, lead: IconName): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id] ?? tile.initial;
  return row({
    lead: icon(lead),
    name: [tile.label, tag(tile, qty)],
    note: stack(modeNotes(tile, result), tile.modes ? qty - 1 : 0),
    hint: hint(id, result),
    control: tile.modes ? stacked(modes(id, tile.modes, qty)) : stepper(tile, qty),
    /* Languages never has design hours: one line */
    hours: hrs(lineHours(result, id), designFor(result, id), false, id === "languages"),
  });
}

/** A row of the site basics that is always in, one line that opens to its parts. Open unless it was
    closed. */
function fold(
  key: string,
  head: { lead: IconName; name: string; note: string; hours: HTMLElement },
  parts: HTMLElement[],
): HTMLElement {
  const closed = `${key}-closed`;
  const node = h("details", { class: "fold", open: !store.open.has(closed), data: { fold: key } });
  node.addEventListener("toggle", () => {
    if (node.open) store.open.delete(closed);
    else store.open.add(closed);
  });
  node.append(
    h(
      "summary",
      { class: "r", data: { focus: `fold-${key}` } },
      h("span", { class: "lead" }, icon(head.lead)),
      h("div", { class: "tx" }, h("b", null, head.name), h("small", null, head.note)),
      h("div", { class: "ctl" }, icon("chevron", "ic chev")),
      head.hours,
    ),
    h("div", { class: "fold-body" }, parts),
  );
  return node;
}

/** One part of a fold: its hours in Project's colour when they are Project. */
function foldPart(result: Quote, id: string): HTMLElement {
  const tile = getTile(id);
  return row({
    className: "part",
    name: tile.label,
    note: noteOf(tile, result),
    ...(tile.stepped ? { control: stepper(tile, result.selection.tiles[id] ?? tile.initial) } : {}),
    hours: hrs(
      lineHours(result, id),
      designFor(result, id),
      false,
      false,
      tile.bucket === "project",
    ),
  });
}

/** Header, footer, setup and launch: always in. */
function launch(result: Quote): HTMLElement {
  return fold(
    "fixed",
    {
      lead: "rocket",
      name: "Header, footer and launch",
      note: "Always in: on every page, and the go-live",
      hours: itemTotal(fixedHours(result), designFor(result, ...fixedIds)),
    },
    fixedIds.map((id) => foldPart(result, id)),
  );
}

/** Project: the kick-off, training and project management, always in. Their hours are Project. */
function project(result: Quote): HTMLElement {
  const ids = projectIds();
  return fold(
    "project",
    {
      lead: "calendar",
      name: projectName,
      note: "Always in: kick-off, training, project management",
      hours: itemTotal(
        ids.reduce((sum, id) => sum + lineHours(result, id), 0),
        designFor(result, ...ids),
        true,
      ),
    },
    [
      ...ids.filter((id) => id !== managementLineId).map((id) => foldPart(result, id)),
      managementRow(result),
    ],
  );
}

function basicsPart(result: Quote): HTMLElement[] {
  return [
    h(
      "div",
      { class: "sh" },
      h("h2", null, "Site basics"),
      /* Project first, as Content heads the estimate: the kick-off, training and project
         management. Then Design and Build */
      lead("p", projectName, stepHours(result, "basics", "project")),
      sums(
        stepHours(result, "basics", "implementation") + stepHours(result, "languages"),
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
      note: `Adds no hours. ${starterPageCap}+ needs Professional`,
      control: stacked(pagesControl(result)),
    }),
    launch(result),
    project(result),
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
      name: [laneName(id), tag(tile, qty)],
      note: stack(modeNotes(tile, result), tile.modes ? qty - 1 : 0),
      hint: hint(id, result),
      control,
      hours: hrs(
        lineHours(result, id),
        designFor(result, id),
        false,
        false,
        tile.bucket === "project",
      ),
    }),
  );
}

/** Content, Page migration and Blog import: hours you enter yourself, which count as Content
    hours. An hours field, and the hours in Content's colour. */
function enteredItem(result: Quote, id: string, missing: boolean): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id] ?? 0;
  const name = laneName(id);
  if (tile.designInput) return enteredBuildAndDesign(result, tile, missing);
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

/** An item whose build hours and design hours are both entered, such as Custom integration: a field
    for each, and its hours as Design over Build, as any item of the shelf has them. */
function enteredBuildAndDesign(result: Quote, tile: Tile, missing: boolean): HTMLElement {
  const name = laneName(tile.id);
  const note = stack(
    [noteOf(tile, result), "Add build or design hours, or take it out of the estimate"],
    missing ? 1 : 0,
  );
  note.lastElementChild?.classList.add("warn");
  return feat(
    tile.id,
    row({
      className: missing ? "missing" : undefined,
      lead: null,
      name,
      note,
      control: buildAndDesignFields(result, tile, missing),
      hours: hrs(lineHours(result, tile.id), designFor(result, tile.id)),
    }),
  );
}

/** A field for the build hours and one for the design hours of an item whose hours are entered. */
function buildAndDesignFields(result: Quote, tile: Tile, missing: boolean): HTMLElement {
  const name = laneName(tile.id);
  const field = (id: string, label: string) => {
    const input = hoursInput(
      id,
      `${name} ${label.toLowerCase()} hours`,
      result.selection.tiles[id] ?? 0,
      tile.max,
    );
    if (missing) input.setAttribute("aria-invalid", "true");
    return h("label", { class: "duo" }, h("span", null, label), unitField(input));
  };
  return h(
    "div",
    { class: "duos" },
    tile.designInput ? field(tile.designInput, "Design") : null,
    field(tile.id, "Build"),
  );
}

/** What a counted part of the Blog says while it can be counted. */
const countNote = "Several blogs, each with its own design? One version for each";

/** The most an item can be counted: the blogs, for the Blog's parts. */
function countMost(result: Quote, tile: Tile): number {
  if (!tile.countedBy) return 0;
  const owner = ownerOf(tile.id);
  return owner ? (result.selection.tiles[owner] ?? 0) : 0;
}

/** The counter of an item the blogs may need more than one of: up to one for each blog. With one
    blog, or while the item is out, it keeps its place, unseen, so nothing moves. */
function countField(result: Quote, tile: Tile, shown: boolean): HTMLElement | null {
  if (!tile.countedBy) return null;
  const count = getTile(tile.countedBy);
  const most = countMost(result, tile);
  const live = shown && most > 1;
  const unit = count.unit ?? "";
  return reserved(
    h(
      "div",
      { class: "count-field", title: live ? `Up to one for each of the ${most} blogs` : null },
      h("span", { class: "kick" }, unit.charAt(0).toUpperCase() + unit.slice(1)),
      stepper({ ...count, max: Math.max(1, most) }, result.selection.tiles[count.id] ?? 1, !live),
    ),
    !live,
  );
}

/** What a locked row says while the pointer is on it. */
const inDevelopment = "In development. Not part of the estimate yet.";

/** A part inside an item that can be added or taken out on its own. Its status is its own: hidden,
    it is not shown; coming soon, it is shown locked. blockedNote: why it does not go with an option
    of its item, shown while that is the option. missing: its hours are entered, and none are. */
function subItem(
  result: Quote,
  id: string,
  blockedNote?: string,
  missing = false,
): HTMLElement | null {
  const tile = getTile(id);
  if (tile.hidden) return null;
  const qty = result.selection.tiles[id];
  if (tile.disabled) {
    return row({
      className: "sub blocked",
      attrs: { "aria-disabled": "true", title: inDevelopment },
      lead: h("span", { class: "lock" }, icon("lock")),
      name: [tile.label, tag(tile)],
      note: stack([noteOf(tile, result), "In development"], 1),
      control: tile.stepped ? reserved(stepper(tile, tile.initial), true) : null,
      hours: reserved(hrs(0, 1, true), true),
    });
  }
  const blocked = blockedNote !== undefined && isBlocked(result.selection.tiles, id);
  /* With more than one blog, Recent blog posts can be counted: say what a version is */
  const counting = qty !== undefined && countMost(result, tile) > 1;
  /* The same note place and control place in every state, so switching a part on or off moves
     nothing */
  const notes = [noteOf(tile, result)];
  if (blockedNote !== undefined) notes.push(blockedNote);
  /* Its own note first, then what a version is */
  const counted = `${noteOf(tile, result)}. ${countNote}`;
  if (tile.countedBy) notes.push(counted);
  if (tile.hourInput) {
    notes.push(
      `Add ${tile.designInput ? "build or design hours" : "hours"}, or take it out of the estimate`,
    );
  }
  const shownNote = blocked
    ? 1
    : missing
      ? notes.length - 1
      : counting
        ? notes.indexOf(counted)
        : 0;
  const note = stack(notes, shownNote);
  if (tile.hourInput) note.lastElementChild?.classList.add("warn");
  /* Hours entered: their fields while it is in. A count: its counter, with more than one blog */
  const control = (on: boolean) =>
    tile.countedBy
      ? countField(result, tile, on)
      : tile.hourInput
        ? on
          ? buildAndDesignFields(result, tile, missing)
          : null
        : tile.stepped
          ? reserved(stepper(tile, qty ?? tile.initial), !on)
          : null;
  const name = [tile.label, tag(tile, qty ?? tile.initial)];
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
      className: missing ? "sub is-on missing" : "sub is-on",
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
  /* A list template and a post template, shared by every blog; with more than one blog, how many
     of each, up to one for each blog. The counter keeps its place with one blog, unseen, so a
     blog more or less moves nothing */
  const counted = (id: string) => {
    const count = getTile(id).countedBy;
    return count ? (tiles[count] ?? 1) : 1;
  };
  const parts: (HTMLElement | null)[] = (["blog-list", "blog-post"] as const).map((id) => {
    const part = getTile(id);
    const qty = tiles[id] ?? part.initial;
    const counter = countField(result, part, true);
    return row({
      className: "sub",
      name: part.label,
      note: stack(modeNotes(part, result), qty - 1),
      hint: hint(id, result),
      control: h("div", { class: "combo" }, counter, stacked(modes(id, part.modes ?? [], qty))),
      hours: hrs(lineHours(result, id), designFor(result, id)),
    });
  });
  const lists = counted("blog-list");
  const posts = counted("blog-post");
  parts.push(subItem(result, "blog-recent"));
  return feat(
    "blog-setups",
    row({
      lead: null,
      name: ["Blog", tag(tile, blogs)],
      hint: hint("blog-setups", result),
      note: stack(
        [
          noteOf(tile, result),
          lists + posts > 2
            ? `${blogs} blogs, ${lists} list and ${posts} post templates`
            : `${blogs} blogs, sharing a list and a post template`,
        ],
        blogs > 1 ? 1 : 0,
      ),
      control: stepper(tile, blogs),
      hours: itemTotal(
        ids.reduce((sum, id) => sum + lineHours(result, id), 0),
        designFor(result, ...ids),
      ),
    }),
    parts.filter((part) => part !== null),
  );
}

/** Complexity in three controls, apart: Module based; the Dynamic pages modes, labelled above; and
    Custom, your own estimate, with its hours field. */
function complexity(result: Quote, tile: Tile, shown: number, missing = false): HTMLElement {
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
  const field = hoursInput(
    hoursTile.id,
    "Custom catalogue hours",
    result.selection.tiles[hoursTile.id] ?? 0,
    hoursTile.max,
  );
  if (missing) field.setAttribute("aria-invalid", "true");
  return h(
    "div",
    { class: "complexity" },
    parts.map((part) =>
      h(
        "div",
        { class: "cpart" },
        part.group ? h("span", { class: "kicker", "aria-hidden": "true" }, part.group) : null,
        h("div", { class: "modes" }, part.buttons),
        part.custom ? reserved(unitField(field), shown !== part.at) : null,
      ),
    ),
  );
}

/** The option's note; when Copy hours found the Custom option with no hours, what to do, in its
    place, as tall as the longest so nothing moves. */
function complexityNote(tile: Tile, result: Quote, shown: number, missing: boolean): HTMLElement {
  const notes = [...modeNotes(tile, result), "Add hours, or choose another option"];
  const note = stack(notes, missing ? notes.length - 1 : shown - 1);
  note.lastElementChild?.classList.add("warn");
  return note;
}

/** missing: its Custom option is chosen with no hours, after Copy hours found it so. */
function catalogueItem(result: Quote, missing = false): HTMLElement {
  const chosen = result.selection.tiles;
  const tile = getTile(sourceIn(chosen) ?? catalogueId);
  const shown = chosen[tile.id] ?? tile.initial;
  /* Every source the Source buttons show; one with no live option is coming, and locked */
  const list = catalogueSources();
  const ids = [
    ...list.map((source) => source.id),
    "catalogue-custom",
    "favorite-products",
    "related-products",
  ];
  const coming = list.filter((source) => source.disabled).map((source) => source.source);
  const sources = h(
    "div",
    { class: "modes" },
    list.map((source) => {
      const on = source.id === tile.id;
      return h(
        "button",
        {
          type: "button",
          class: on ? "mode is-on" : "mode",
          "aria-pressed": String(on),
          disabled: !!source.disabled,
          title: source.disabled ? "In development" : null,
          data: { action: "source", id: source.id, focus: `source-${source.id}` },
        },
        source.source,
      );
    }),
  );
  return feat(
    catalogueId,
    row({
      lead: null,
      name: [placeName.catalogue, tag(tile, shown)],
      hint: hint(tile.id, result),
      note: `Catalogue with ${tile.source} as its source`,
      hours: itemTotal(
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
        className: missing ? "sub wide missing" : "sub wide",
        name: "Complexity",
        note: complexityNote(tile, result, shown, missing),
        control: complexity(result, tile, shown, missing),
        hours: hrs(
          lineHours(result, tile.id) + lineHours(result, "catalogue-custom"),
          designFor(result, tile.id),
        ),
      }),
      subItem(result, "favorite-products"),
      subItem(result, "related-products", "Needs dynamic pages. Choose it under Complexity."),
    ].filter((part) => part !== null),
  );
}

/** Memberships: how members sign in, the access groups (always in, Enterprise from 3), and the
    parts added on their own: Social sign-in, and a Member area with its hours entered. */
function membershipItem(result: Quote, missing: ReadonlySet<string>): HTMLElement {
  const tile = getTile("membership");
  const chosen = result.selection.tiles;
  const shown = chosen.membership ?? tile.initial;
  const ids = ["membership", ...(partsOf.membership ?? [])];
  const groups = getTile("membership-groups");
  const count = chosen["membership-groups"] ?? groups.initial;
  return feat(
    "membership",
    row({
      lead: null,
      name: [laneName("membership"), tag(tile, shown)],
      hint: hint("membership", result),
      note: `${tileMode(tile, shown)?.label ?? ""}, ${count} ${count === 1 ? "access group" : "access groups"}`,
      hours: itemTotal(
        ids.reduce((sum, id) => sum + lineHours(result, id), 0),
        designFor(result, ...ids),
      ),
    }),
    [
      row({
        className: "sub wide",
        name: "Sign-in",
        note: stack(modeNotes(tile, result), shown - 1),
        hint: hint("membership", result),
        control: modes("membership", tile.modes ?? [], shown),
        hours: hrs(lineHours(result, "membership"), designFor(result, "membership")),
      }),
      row({
        className: "sub",
        name: [groups.label, tag(groups, count)],
        note: noteOf(groups, result),
        hint: hint(groups.id, result),
        control: stepper(groups, count),
        hours: hrs(lineHours(result, groups.id), designFor(result, groups.id)),
      }),
      subItem(
        result,
        "membership-social",
        "Not with SSO: the client's identity provider signs members in.",
      ),
      subItem(result, "membership-area", undefined, missing.has("membership-area")),
    ].filter((part) => part !== null),
  );
}

function laneItem(result: Quote, id: string, state: PageState): HTMLElement {
  if (id === "blog-setups") return blogItem(result);
  if (id === catalogueId) return catalogueItem(result, state.missing.has("catalogue-custom"));
  if (id === "membership") return membershipItem(result, state.missing);
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
  const left = laneIds.filter((id) => !isIn(tiles, id)).length;
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
      /* Content, in its own colour, before Design and Build */
      lead("c", "Content", content),
      sums(
        stepHours(result, "addons", "implementation"),
        designFor(result, ...laneIds, ...partIds),
        "Design",
        stepHours(result, "addons", "project") || null,
      ),
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
      h("span", { class: "hd" }, add.design > 0 ? plus(add.design) : ""),
      h("span", { class: "hb" }, add.build > 0 ? plus(add.build) : ""),
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
    h("span", { class: "s-name" }, laneName(id), tag(tile)),
    /* Shown over the row while the pointer is on it */
    h("span", { class: "tip", role: "tooltip" }, inDevelopment),
  );
}

function shelf(result: Quote): HTMLElement {
  const off = laneIds.filter((id) => !isIn(result.selection.tiles, id));
  const groups: HTMLElement[] = [];
  /* These groups never change, so a package change cannot reshuffle the shelf */
  for (const [rule, name] of shelfGroups) {
    /* In the table's order; what is coming soon sits locked at the end of the group of the
       package it needs, in the table's order too */
    const rows = [
      ...off.filter((id) => shelfGroupOf(id) === rule),
      ...blockedShelfIds.filter((id) => shelfGroupOf(id) === rule),
    ];
    if (!rows.length) continue;
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
                h("span", { class: "hd" }, "Design"),
                h("span", { class: "hb" }, "Build"),
              )
            : null,
        ),
        rows.map((id) => (blockedShelfIds.includes(id) ? blockedRow(id) : shelfRow(result, id))),
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
    h("span", { class: "pop-status" }, "This estimate"),
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
    and the grid says so. Design first, then build, content and project; the rest stay empty. */
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
    ["p", result.projectHours],
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

/** With AI design's discount, a price tag: the total before it, struck through, and the button's
    sticker, beside the total after it. */
function wasTotal(result: Quote): HTMLElement | null {
  const discount = result.discount;
  if (!discount) return null;
  const percent = formatHours(discount.percent);
  return h(
    "span",
    { class: "was" },
    h("span", { class: "vh" }, `, after the ${percent}% AI discount of`),
    h("s", null, hoursLabel(result.hours)),
    h("span", { class: "deal", "aria-hidden": "true" }, `−${percent}%`),
  );
}

/** With AI design's discount, each package's share under the total, drawn as the package card's
    three dashes, this estimate's in yellow: a bigger site gets a bigger share. */
function discountShares(result: Quote): HTMLElement | null {
  const discount = result.discount;
  if (!discount) return null;
  return h(
    "ul",
    { class: "shares", "aria-label": "AI discount by package" },
    aiDiscountShares().map(([id, percent]) => {
      const now = id === discount.packageId;
      return h(
        "li",
        { class: now ? "is-now" : null, "aria-current": now ? "true" : null },
        h("i", { "aria-hidden": "true" }),
        h("b", null, percent > 0 ? `−${formatHours(percent)}%` : "0%"),
        " ",
        h("small", null, packageName[id]),
      );
    }),
  );
}

function total(result: Quote): HTMLElement {
  const grid = dots(result);
  const was = wasTotal(result);
  return h(
    "div",
    { class: "total" },
    h(
      "div",
      { class: "tnum" },
      h("span", { class: "tlabel" }, "Total"),
      h(
        "p",
        {
          class: ["big", result.totalHours >= 1000 ? "is-long" : null, was ? "has-was" : null]
            .filter(Boolean)
            .join(" "),
          "aria-live": "polite",
        },
        /* What the estimate costs; its parts below are its hours, before any discount */
        h("span", { class: "now" }, formatHours(result.totalHours), h("small", null, "h")),
        was,
      ),
      discountShares(result),
      h(
        "ul",
        { class: "lg" },
        h("li", { class: "d" }, "Design", h("b", null, hoursLabel(result.designHours))),
        h("li", { class: "b" }, "Build", h("b", null, hoursLabel(result.implementationHours))),
        h("li", { class: "c" }, "Content", h("b", null, hoursLabel(result.contentHours))),
        h("li", { class: "p" }, projectName, h("b", null, hoursLabel(result.projectHours))),
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
      /* Reset (off on the starting estimate, with nothing to reset) and Changelog: one under the
         other, side by side in the narrow rail */
      h(
        "div",
        { class: "side-end" },
        actButton(state, "reset", "reset", "Reset", "Reset", "warn", state.reset, !state.canReset),
        changelogButton(),
      ),
      h(
        "p",
        { class: "ver" },
        h("span", { class: "ver-name" }, appName),
        h("span", { class: "ver-num" }, `v${currentRelease.label}`),
        currentRelease.stage ? h("span", { class: "beta" }, currentRelease.stage) : null,
      ),
    ),
  );
}

/** Changelog: opens the list of releases in a dialog over the page. */
function changelogButton(): HTMLElement {
  return h(
    "button",
    {
      type: "button",
      class: "ab quiet",
      "aria-label": "Changelog",
      "aria-haspopup": "dialog",
      data: { focus: "act-changelog" },
      on: { click: () => changelogDialog().showModal() },
    },
    icon("log"),
    h("span", { class: "al" }, "Changelog"),
    h("small", null, "Log"),
  );
}

/** The releases, newest first, each with its sections (New, Fixed), in a dialog of its own outside
    the page, so a redraw of the page leaves it open. Escape, Close or a press outside it closes it. */
function changelogDialog(): HTMLDialogElement {
  const found = document.querySelector<HTMLDialogElement>("dialog.changelog");
  if (found) return found;
  const dialog = h(
    "dialog",
    { class: "changelog", "aria-labelledby": "changelog-title" },
    h(
      "div",
      { class: "cl-head" },
      h("h2", { id: "changelog-title" }, "Changelog"),
      h(
        "button",
        { type: "button", class: "cl-close", "aria-label": "Close", data: { close: "" } },
        icon("cross"),
      ),
    ),
    h(
      "div",
      { class: "cl-body", tabindex: "-1", autofocus: true },
      releases.map((release) =>
        h(
          "section",
          { class: "cl-release", "aria-label": `Version ${release.label}` },
          h(
            "h3",
            null,
            `v${release.label}`,
            release.stage ? h("span", { class: "beta" }, release.stage) : null,
            h("time", { datetime: release.date }, releaseDay(release.date)),
          ),
          release.sections.map((section) => [
            h("h4", null, section.title),
            h(
              "ul",
              null,
              section.items.map((item) => h("li", null, item)),
            ),
          ]),
        ),
      ),
    ),
  );
  dialog.addEventListener("click", (event) => {
    const target = event.target;
    /* The backdrop is the dialog itself: its content fills it */
    if (target === dialog || (target instanceof Element && target.closest("[data-close]"))) {
      dialog.close();
    }
  });
  document.body.append(dialog);
  return dialog;
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
