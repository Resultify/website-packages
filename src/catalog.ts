/**
 * The catalog: what the estimator offers, read from the files in src/ (see table.ts):
 * estimator.csv for the items, rules.csv for design rounds, languages and pages, and
 * link-codes.csv for each item's number in a link.
 *
 * Change the files, or use the calculations page (/calc/) on the dev server. What is here is how
 * they are read, and the words and lists that are not calculations.
 *
 * Essential, Growth, and Platform are project packages. The active package is
 * the lowest tier that covers every selected option. It is not a choice.
 *
 * Website pages are not build hours.
 *
 * Design hours are charged only while a design is on, and they stay
 * separate from build hours. Build hours depend on the design choice.
 */

import {
  buildKind,
  type Choice,
  type CodeEntry,
  type Column,
  type DesignKind,
  liveCodesText,
  liveRulesText,
  liveText,
  parseCodes,
  parseRules,
  parseTable,
  type Row,
  type RuleName,
  type Rules,
  withCodes,
} from "./table.ts";

export type { Choice, DesignKind };

/** Display names. Rename the package labels here. */
export const packageName = {
  essential: "Essential",
  growth: "Growth",
  platform: "Platform",
} as const;

export const editions = ["free", "starter", "professional", "enterprise"] as const;
export type Edition = (typeof editions)[number];

export const editionLabel: Record<Edition, string> = {
  free: "Free tools",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export const editionRank: Record<Edition, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

/** Shown before content work. Always on, and not a package choice. */
export const closingTileIds = ["setup"] as const;

/** These stay on. Their quantities and modes choose the package. */
export const alwaysOnTileIds = [
  "templates",
  "sections",
  "menu",
  "languages",
  "header",
  "footer",
  "setup",
] as const;

export function isAlwaysOn(id: string): boolean {
  return alwaysOnTileIds.some((item) => item === id);
}

export type IncludedModule = { name: string; demo?: boolean };

const coreModules: readonly IncludedModule[] = [
  { name: "Heading" },
  { name: "Button" },
  { name: "Form" },
  { name: "Accordion" },
  { name: "Icon" },
  { name: "Video" },
  { name: "Lottie animation" },
  { name: "Carousel" },
  { name: "Hero" },
  { name: "Hero video" },
  { name: "Card group" },
  { name: "Card group with filter" },
  { name: "FAQ" },
  { name: "Divider" },
  { name: "SVG divider" },
  { name: "Social links" },
  { name: "Social sharing" },
  { name: "Audio" },
];

const growthModules: readonly IncludedModule[] = [
  { name: "Blog list" },
  { name: "Recent posts" },
  { name: "Blog pagination" },
  { name: "Blog tag filter" },
  { name: "Case study list" },
  { name: "Search results" },
  { name: "Mega menu" },
];

const platformModules: readonly IncludedModule[] = [{ name: "Product list" }, { name: "Events" }];

const closingModules: readonly IncludedModule[] = [
  { name: "Unicard", demo: true },
  { name: "Unicard Duo", demo: true },
];

export function modulesFor(shape: ShapeId): readonly IncludedModule[] {
  const modules = [...coreModules];
  if (shape === "growth" || shape === "platform") modules.push(...growthModules);
  if (shape === "platform") modules.push(...platformModules);
  modules.push(...closingModules);
  return modules;
}

/** Theme and CMS setup included with the website. Not billed as extra hours. */
const cmsInclusions: readonly string[] = [
  "Unicard",
  "Unicard Duo",
  "Content modules",
  "System pages",
  "HubSpot CTAs",
  "HubSpot Forms connected to CRM",
  "Drag-and-drop editing",
  "Cookie banner and form consent",
  "Built-in SEO optimizations",
  "Responsive on all devices",
  "Fast on mobile",
  "Optimized for Google PageSpeed",
  "HTTPS and security updates",
  "WCAG 2.2 AA accessibility",
  "European Accessibility Act aligned",
  "EU Web Accessibility Directive aligned",
  "Domain with SSL",
  "Automatic URL redirects",
  "Auto-generated sitemap",
  "HubSpot analytics included",
  "Google Tag Manager ready",
];

/** Placeholder copy. Replace when the real descriptions are ready. */
export type InclusionPopover = {
  text?: string;
  items?: readonly string[];
  demo?: string | true;
};

export const inclusionPopovers: Record<string, InclusionPopover> = {
  Unicard: {
    text:
      "The most flexible and editor-friendly module in the HubSpot CMS ecosystem. " +
      "One module gives editors up to 30 content variants.",
    demo: "https://www.nimbly.tech/unicard-variations1",
  },
  "Unicard Duo": {
    text:
      "Unicard as a pair, side by side. The most flexible and editor-friendly module in the " +
      "HubSpot CMS ecosystem, with up to 30 content variants from a single module.",
    demo: true,
  },
  "Content modules": {
    items: [
      "Audio Player",
      "Button",
      "Call-to-Action (CTA)",
      "Form",
      "Heading",
      "Image",
      "Main CTA",
      "Meetings",
      "One Line of Text",
      "Payment",
      "Rich Text",
      "RSS Listing",
      "Simple Menu",
      "Video",
      "WhatsApp Link",
    ],
  },
  "System pages": {
    text: "404 and 500 error pages, subscription page, backup unsubscribe page, and subscriptions update page.",
  },
  "HubSpot CTAs": {
    text: "HubSpot calls-to-action for the site, and for emails.",
    items: [
      "Banner: fixed to the top or bottom, and it stays while the visitor scrolls.",
      "Pop-up box: appears on a schedule you set.",
      "Slide-in: slides in from a corner and stays while the visitor scrolls.",
      "Embedded: a button, banner, or call-to-action on a page or in a HubSpot email.",
      "Embedded image: an image on a page or in an email.",
    ],
  },
};

const growthPackage: readonly string[] = ["Blog, case studies, and search"];

const platformPackage: readonly string[] = [
  "Blog, case studies, and search",
  "Product list and events",
];

const inclusionNoteByEdition: Record<Edition, string> = {
  free: "",
  starter: "",
  professional: "",
  enterprise: "",
};

export function inclusionNote(edition: Edition): string {
  return inclusionNoteByEdition[edition];
}

export function inclusionsFor(shape: ShapeId): readonly string[] {
  const items = [...cmsInclusions];
  if (shape === "growth") items.push(...growthPackage);
  if (shape === "platform") items.push(...platformPackage);
  return items;
}

export type StartingPointId = "cms-react";

export type StartingPoint = {
  id: StartingPointId;
  label: string;
  hours: number;
  detail: string;
};

export const startingPoints: readonly StartingPoint[] = [
  {
    id: "cms-react",
    label: "CMS React project",
    hours: 0,
    detail: "A HubSpot Projects theme. Hours come only from the items below.",
  },
];

export type GroupId =
  "design" | "site" | "blog" | "features" | "languages" | "catalogue" | "content";

export type GroupLayout = "pair" | "tiles" | "wide" | "three";

export type HourBucket = "design" | "implementation" | "content";

export const groups: readonly {
  id: GroupId;
  label: string;
  layout: GroupLayout;
  note?: string;
}[] = [
  { id: "design", label: "Design", layout: "pair" },
  { id: "site", label: "", layout: "tiles" },
  { id: "languages", label: "Languages", layout: "wide" },
  { id: "features", label: "Extra features", layout: "tiles" },
  { id: "blog", label: "Blog", layout: "tiles" },
  { id: "catalogue", label: "", layout: "tiles" },
  { id: "content", label: "Content", layout: "tiles" },
];

export type StepId = "design" | "basics" | "addons" | "languages" | "content";

export const steps: readonly { id: StepId; title: string; prompt: string }[] = [
  { id: "design", title: "Design", prompt: "Choose how the design gets made." },
  { id: "basics", title: "Site basics", prompt: "Set the size of the website." },
  { id: "languages", title: "Languages", prompt: "One is included." },
  { id: "addons", title: "Add-ons", prompt: "Switch on anything extra the site needs." },
  { id: "content", title: "Content", prompt: "Add hours if we also write or move content." },
];

export const basicsTileIds = [
  "templates",
  "sections",
  "menu",
  "header",
  "footer",
  "setup",
] as const;

export const addOnTileIds = [
  "landing-templates",
  "search",
  "custom-forms",
  "system",
  "hubdb",
  "blog-setups",
  "product-catalogue",
] as const;

export type HubId = "marketing" | "service" | "operations" | "sales" | "commerce" | "crm";

export const hubName: Record<HubId, string> = {
  marketing: "Marketing Hub",
  service: "Service Hub",
  operations: "Operations Hub",
  sales: "Sales Hub",
  commerce: "Commerce Hub",
  crm: "Smart CRM",
};

export type EditionHit = { edition: Edition; reason: string };

export type EditionRule = {
  at: (qty: number) => EditionHit;
};

export type TileBadge = "new" | "planned";

export const badgeLabel: Record<TileBadge, string> = {
  new: "NEW",
  planned: "in development",
};

/** Design hours: for each unit when the task has a quantity, for the task otherwise. */
export type DesignRate = Record<DesignKind, number>;

/** Build hours for each design choice (no design takes Custom's): for each unit when the task has a
    quantity, for the task otherwise. */
export type BuildRate = Record<DesignKind, number>;

export type TileMode = {
  label: string;
  build: BuildRate;
  detail?: string;
  group?: string;
  /** Hours come from a separate number input, not from this mode. */
  customHours?: boolean;
  /** Coming soon: shown, but cannot be chosen. */
  disabled?: boolean;
  /** What a link stores for this mode: its place in the item's list of options, from 1. */
  value: number;
  design: DesignRate;
};

export type Tile = {
  id: string;
  /** Where the estimator shows it. The items the rules make are in the basics, or in Design. */
  place: Place;
  /** A source of the Product catalogue: its name on the Source buttons. */
  source?: string;
  /** The task's number in a link. It is never changed, and never given to another task. */
  code: number;
  label: string;
  group: GroupId;
  /** May hold {build}: the build hours, filled in for the estimate's design choice. */
  summary: string;
  build: BuildRate;
  includedInBase: number;
  /** The first unit past the included ones, when it costs something other than the rest. */
  firstUnitHours?: number;
  unit?: string;
  min: number;
  max: number;
  initial: number;
  step: number;
  stepped: boolean;
  /** The number entered is the hour estimate, not a quantity of items. */
  hourInput?: boolean;
  /** Shown, but not selectable. No build hours. */
  disabled?: boolean;
  /** Not shown anywhere, and left out of every estimate. Its link code stays taken. */
  hidden?: boolean;
  modes?: readonly TileMode[];
  rule: EditionRule;
  mark?: string;
  badge?: TileBadge;
  hub?: { id: HubId; edition: Edition; detail: string };
  requires: readonly string[];
  note?: string;
  /** Design and content sit outside the package rate and the extra cap. */
  bucket: HourBucket;
  /** A task with modes keeps its design hours on each mode. */
  design: DesignRate;
  /** What its design line is called, before "design" lines get their "AI " in front. */
  designLabel: string;
};

export type ShapeId = "essential" | "growth" | "platform" | "custom";

export type ParcelItem = {
  tileId: string;
  /** Quantity applied when this shape is chosen. */
  qty: number;
  /** Inclusive band. Outside it, this shape no longer matches. */
  min: number;
  max: number;
};

export type Parcel = {
  id: Exclude<ShapeId, "custom">;
  label: string;
  customer: string;
  usualEdition: Edition;
  maxExtras: number;
  items: readonly ParcelItem[];
};

export const parcels: readonly Parcel[] = [
  {
    id: "essential",
    label: packageName.essential,
    customer:
      "A smaller website: up to 4 page templates, 10 sections, one language and simple menu",
    usualEdition: "starter",
    maxExtras: 0,
    items: [],
  },
  {
    id: "growth",
    label: packageName.growth,
    customer:
      "A larger website: 5 or more page templates, more sections or languages, or an advanced menu, search, or blog.",
    usualEdition: "professional",
    maxExtras: 0,
    items: [],
  },
  {
    id: "platform",
    label: packageName.platform,
    customer: "The website plus a product catalogue, and other extra features.",
    usualEdition: "professional",
    maxExtras: 0,
    items: [],
  },
];

export type ShapeChoice = {
  id: Exclude<ShapeId, "custom">;
  label: string;
  customer: string;
  usualEdition: Edition;
};

export const shapeChoices: readonly ShapeChoice[] = parcels.map((parcel) => ({
  id: parcel.id,
  label: parcel.label,
  customer: parcel.customer,
  usualEdition: parcel.usualEdition,
}));

export function getStartingPoint(id: StartingPointId): StartingPoint {
  const found = startingPoints.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown starting point: ${id}`);
  return found;
}

export function getParcel(id: Exclude<ShapeId, "custom">): Parcel {
  const found = parcels.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown parcel: ${id}`);
  return found;
}

/* ---------- The files become the catalog ---------- */

export type PackageId = Exclude<ShapeId, "custom">;

/** A rule raises the package once the task reaches `at`. For a mode (`exact`), only while that
    mode is the one chosen. */
export type PackageRule = {
  tileId: string;
  at: number;
  exact: boolean;
  package: PackageId;
  reason: (qty: number) => string;
};

type PageRule = {
  min: number;
  max: number;
  initial: number;
  /** From this many website pages on, the tier. Lowest first. */
  steps: readonly { edition: Edition; at: number }[];
};

export type Catalog = {
  tiles: readonly Tile[];
  byId: ReadonlyMap<string, Tile>;
  byCode: ReadonlyMap<number, Tile>;
  packageRules: readonly PackageRule[];
  pages: PageRule;
  /** Extra AI variants: this share of the AI design hours each, in percent. */
  variantPercent: number;
  /** The link codes with every item of the table in them: what Save and the build write. */
  codes: readonly CodeEntry[];
};

const rulePackages = ["growth", "platform"] as const;
const ruleEditions = ["professional", "enterprise"] as const;

/** Where an item of the table is in the estimator:
    basics     in every estimate (the page is built around them, so the list is fixed)
    shelf      added when the site needs it, on its own
    blog       the Blog: the number of blogs, and its templates
    catalogue  the Product catalogue: its sources, and what goes with them */
export const places = ["basics", "shelf", "blog", "catalogue"] as const;
export type Place = (typeof places)[number] | "design";

/** What the Blog and the Product catalogue are called. They are places, not rows of the table. */
export const placeName = { blog: "Blog", catalogue: "Product catalogue" } as const;

/** The catalogue's source with options, the only one an estimate can use for now. Any other
    item of the catalogue that is not a part of it is a source to come: Coming soon, or Hidden. */
export const catalogueId = "product-catalogue";

/** Items the rules make, with what they are called. */
const ruleTileIds = ["ai-design", "ai-feedback", "custom-design", "design-feedback", "languages"];

/** Items the page is built around: the basics. A table without one of them cannot be used. */
const neededIds = basicsTileIds;

/** Parts that live inside another item's card: with the item in the table, they must be too. */
export const partsOf: Record<string, readonly string[]> = {
  "blog-setups": ["blog-list", "blog-post", "blog-recent"],
  "product-catalogue": ["catalogue-custom", "favorite-products", "related-products"],
};

/** Items whose status can be Coming soon or Hidden: what sits on the shelf, not the basics that
    every estimate has, nor the parts of another item. The catalogue's CRM sources show inside it,
    as coming. */
export function hasStatus(id: string): boolean {
  return !isAlwaysOn(id) && !isPart(id) && !ruleTileIds.includes(id);
}

/** A part of the Blog or of the Product catalogue: in the estimate with it, never on its own. */
export function isPart(id: string): boolean {
  return Object.values(partsOf).some((parts) => parts.includes(id));
}

/** A source of products to come: an item of the catalogue that is neither its source with options
    nor one of its parts. */
export function isComingSource(id: string, place: string): boolean {
  return place === "catalogue" && id !== catalogueId && !isPart(id);
}

function fail(row: Row, message: string): never {
  throw new Error(`${row.item || row.id}${row.option ? `, ${row.option}` : ""}: ${message}`);
}

function number(row: Row, column: Column, fallback: number, whole = false): number {
  const text = row[column];
  if (text === "") return fallback;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || (whole && !Number.isInteger(value))) {
    fail(
      row,
      `${column} must be a ${whole ? "whole number" : "number"}, 0 or more. It is "${text}"`,
    );
  }
  return value;
}

function blank(row: Row, columns: readonly Column[], why: string): void {
  for (const column of columns) {
    if (row[column] !== "") fail(row, `${column} must be empty: ${why}`);
  }
}

type Step<Name> = { name: Name; at: number | null };

/** "growth", "growth from 5": what is needed, and from which quantity on. */
function needs<Name extends string>(
  row: Row,
  column: "package" | "tier",
  names: readonly Name[],
): Step<Name> | null {
  const text = row[column];
  if (text === "") return null;
  const match = /^(\w+)(?:\s+from\s+(\d+))?$/.exec(text);
  const known = names.find((item) => item === match?.[1]);
  if (!match || !known) {
    fail(
      row,
      `${column} must be ${names.join(" or ")}, and to start at a quantity, "from" and that number, as in ${names[0]} from 5. It is "${text}"`,
    );
  }
  return { name: known, at: match[2] === undefined ? null : Number(match[2]) };
}

/** "Page templates" reads "page templates" inside a sentence; "HubDB section" stays as it is. */
function inSentence(label: string): string {
  const word = label.split(" ")[0] ?? "";
  return /[A-Z]/.test(word.slice(1)) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

const withQty = (text: string, qty: number) => text.replaceAll("{qty}", String(qty));

function packageReason(step: Step<PackageId>, label: string, mode: string) {
  const text = mode
    ? `${mode} ${inSentence(label)}`
    : step.at === null
      ? label
      : `{qty} ${inSentence(label)}`;
  return (qty: number) => withQty(text, qty);
}

function editionReason(step: Step<Edition>, label: string, mode: string): string {
  const tier = `Content Hub ${editionLabel[step.name]}`;
  if (mode) return `${mode} ${inSentence(label)} needs ${tier}`;
  return step.at === null ? `${label} needs ${tier}` : `{qty} ${inSentence(label)} need ${tier}`;
}

/** A note may say {build}: the build hours, for the design choice of the estimate. */
function checkNote(row: Row): string {
  for (const [, name] of row.note.matchAll(/\{(\w*)\}/g)) {
    if (name !== "build")
      fail(row, `note can hold {build}, the build hours, and nothing else in { }`);
  }
  return row.note;
}

/** The note with its build hours in it. */
export function fillNote(text: string, build: BuildRate, choice: Choice): string {
  return text.replaceAll("{build}", String(build[buildKind(choice)]));
}

const noBuild: BuildRate = { ai: 0, design: 0, custom: 0 };
const noDesign: DesignRate = { ai: 0, design: 0, custom: 0 };
const same = (hours: number): BuildRate => ({ ai: hours, design: hours, custom: hours });

function buildRate(row: Row): BuildRate {
  return {
    ai: number(row, "build-ai", 0),
    design: number(row, "build-design", 0),
    custom: number(row, "build-custom", 0),
  };
}

function designRate(row: Row): DesignRate {
  return {
    ai: number(row, "design-ai", 0),
    design: number(row, "design-design", 0),
    custom: number(row, "design-custom", 0),
  };
}

const hourColumns = [
  "build-ai",
  "build-design",
  "build-custom",
  "design-ai",
  "design-design",
  "design-custom",
] as const;

/** Where the row belongs, checked against what the page is built around. */
function placeOf(row: Row): (typeof places)[number] {
  const place = places.find((item) => item === row.place);
  if (!place) fail(row, `place must be one of ${places.join(", ")}. It is "${row.place}"`);
  const basic = basicsTileIds.some((id) => id === row.id);
  const blogIds = ["blog-setups", ...(partsOf["blog-setups"] ?? [])];
  const catalogueIds = [catalogueId, ...(partsOf[catalogueId] ?? [])];
  const expected = basic
    ? "basics"
    : blogIds.includes(row.id)
      ? "blog"
      : catalogueIds.includes(row.id)
        ? "catalogue"
        : null;
  if (expected && place !== expected) fail(row, `place must be ${expected}. It is ${place}`);
  if (!expected && (place === "basics" || place === "blog")) {
    fail(
      row,
      place === "basics"
        ? `place cannot be basics: the basics are ${basicsTileIds.join(", ")}`
        : `place cannot be blog: the Blog is ${blogIds.join(", ")}`,
    );
  }
  if (row.type !== "" && row.type !== "content") {
    fail(row, `type must be empty (build) or content. It is "${row.type}"`);
  }
  if (row.type === "content" && place !== "shelf") {
    fail(row, "type can be content on items of the shelf only");
  }
  return place;
}

function groupOf(row: Row, place: (typeof places)[number]): GroupId {
  if (place === "basics") return "site";
  if (place === "shelf") return row.type === "content" ? "content" : "features";
  return place;
}

function bucketOf(group: GroupId): HourBucket {
  if (group === "design") return "design";
  return group === "content" ? "content" : "implementation";
}

function statusOf(row: Row): { disabled?: true; badge?: TileBadge; hidden?: true } {
  if (isComingSource(row.id, row.place) && row.status === "") {
    fail(
      row,
      "status must be soon or hidden: the estimator has no options for this source of products yet",
    );
  }
  if (row.status === "") return {};
  if (!hasStatus(row.id)) {
    fail(row, "status can be set on items of the shelf only. This one is always shown");
  }
  if (row.status === "soon") return { disabled: true, badge: "planned" };
  if (row.status === "hidden") return { hidden: true };
  fail(row, `status must be empty (live), soon or hidden. It is "${row.status}"`);
}

function markOf(rule: EditionRule, min: number): { mark?: string } {
  const edition = rule.at(min).edition;
  if (edition === "professional") return { mark: "Pro" };
  return edition === "enterprise" ? { mark: "Ent" } : {};
}

function steppedRule(steps: readonly { name: Edition; at: number; reason: string }[]): EditionRule {
  const sorted = [...steps].sort((a, b) => a.at - b.at);
  return {
    at(qty) {
      let found: EditionHit = { edition: "starter", reason: "" };
      for (const step of sorted) {
        if (qty >= step.at) found = { edition: step.name, reason: withQty(step.reason, qty) };
      }
      return found;
    },
  };
}

/** A task with one row: a switch, a quantity, or hours you enter. */
function plainTile(row: Row, code: number, rules: PackageRule[]): Tile {
  if (!row.item) fail(row, "item is empty");
  const place = placeOf(row);
  const group = groupOf(row, place);
  const unit = row.unit || undefined;
  const hourInput = unit === "hours";
  const min = hourInput ? 0 : 1;
  const max = number(row, "max", unit ? Number.NaN : 1, true);
  const initial = number(row, "start", min, true);
  if (Number.isNaN(max)) fail(row, "max is empty. An item with a unit needs its highest quantity");
  if (!unit && (max !== 1 || initial !== 1)) {
    fail(row, "start and max need a unit, such as templates or hours");
  }
  if (min > max) fail(row, `max ${max} is less than ${min}`);
  if (initial < min || initial > max) fail(row, `start ${initial} is outside ${min} to ${max}`);
  if (hourInput) blank(row, hourColumns, "its hours are entered in the estimate");
  const label = row.item;

  const pack = needs<PackageId>(row, "package", rulePackages);
  if (pack) {
    rules.push({
      tileId: row.id,
      at: pack.at ?? min,
      exact: false,
      package: pack.name,
      reason: packageReason(pack, label, ""),
    });
  }
  const tier = needs<Edition>(row, "tier", ruleEditions);
  const rule = steppedRule(
    tier ? [{ name: tier.name, at: tier.at ?? min, reason: editionReason(tier, label, "") }] : [],
  );

  return {
    id: row.id,
    place,
    ...(isComingSource(row.id, place) ? { source: label } : {}),
    code,
    label,
    group,
    summary: checkNote(row),
    build: hourInput ? same(1) : buildRate(row),
    includedInBase: 0,
    ...(unit ? { unit } : {}),
    min,
    max,
    initial,
    step: 1,
    stepped: !!unit && !hourInput,
    ...(hourInput ? { hourInput: true } : {}),
    ...statusOf(row),
    rule,
    ...markOf(rule, min),
    requires: [],
    bucket: bucketOf(group),
    design: designRate(row),
    designLabel: `${label} design`,
  };
}

/** A task with a row for each option. What belongs to the whole task (its name, place, type)
    is written once, on any of its rows, or the same on each. The order of the rows is the order of
    the options. */
function modeTile(rows: readonly Row[], entry: CodeEntry, rules: PackageRule[]): Tile {
  const first = rows[0] as Row;
  const written = (column: Column) => rows.find((row) => row[column] !== "")?.[column] ?? "";
  const shared = (column: Column): string => {
    const value = written(column);
    const other = rows.find((row) => row[column] !== "" && row[column] !== value);
    if (other) fail(other, `${column} must be the same on every option of the item, or empty`);
    return value;
  };
  const task: Row = {
    ...first,
    item: shared("item"),
    place: shared("place"),
    type: shared("type"),
    note: first.note,
  };
  if (!task.item) fail(first, "item is empty");
  const place = placeOf(task);
  const group = groupOf(task, place);
  /* The catalogue's rows are its source: the item is the Product catalogue, from that source */
  const isCatalogue = first.id === catalogueId;
  const itemLabel = isCatalogue ? placeName.catalogue : task.item;
  const names = new Set<string>();
  let starts = "";
  for (const row of rows) {
    if (!row.option) fail(row, "every row of an item with options needs an option");
    if (names.has(row.option)) fail(row, "two rows of the item have this option");
    names.add(row.option);
    if (!["", "soon", "hidden"].includes(row.status)) {
      fail(row, `status must be empty (live), soon or hidden. It is "${row.status}"`);
    }
    if (row.start !== "") {
      if (row.start !== "1" || starts)
        fail(row, "start is 1 on the option an item starts with, and empty on the others");
      starts = row.option;
    }
  }
  /* Each option has its status: a hidden one is left out, a coming one shown but locked. The item
     is hidden when all are, and coming when none is live */
  const shown = rows.filter((row) => row.status !== "hidden");
  const live = shown.filter((row) => row.status === "");
  if (!hasStatus(first.id) && live.length === 0) {
    fail(first, "at least one option must be live: the item is always shown");
  }
  const itemStatus: Partial<Pick<Tile, "hidden" | "disabled" | "badge">> =
    shown.length === 0
      ? { hidden: true }
      : live.length === 0
        ? { disabled: true, badge: "planned" }
        : {};
  /* The item starts with its start option, or the first live one */
  let initial = shown.findIndex((row) => row.option === starts && row.status === "") + 1;
  if (!initial) initial = Math.max(1, shown.findIndex((row) => row.status === "") + 1);
  const tiers: EditionHit[] = [];
  const modes = shown.map((row, index): TileMode => {
    blank(row, ["max"], "an option has no quantity");
    if (row.unit !== "" && row.unit !== "hours")
      fail(row, "an option's unit is empty, or hours when its hours are entered");
    const at = index + 1;
    const [groupName, label] = row.option.includes(": ")
      ? (row.option.split(": ", 2) as [string, string])
      : [undefined, row.option];
    const pack = needs<PackageId>(row, "package", rulePackages);
    const tier = needs<Edition>(row, "tier", ruleEditions);
    if (pack?.at != null || tier?.at != null) {
      fail(row, `an option's package and tier have no "from"`);
    }
    /* Named after the option only when the options ask for different ones */
    const named = (column: "package" | "tier") =>
      shown.some((other) => other[column] !== row[column]) ? label : "";
    if (pack) {
      rules.push({
        tileId: row.id,
        at,
        exact: true,
        package: pack.name,
        reason: packageReason(pack, itemLabel, named("package")),
      });
    }
    tiers.push(
      tier
        ? { edition: tier.name, reason: editionReason(tier, itemLabel, named("tier")) }
        : { edition: "starter", reason: "" },
    );
    const detail = checkNote(row);
    const value = entry.options.indexOf(row.option) + 1;
    return {
      label,
      build: row.unit === "hours" ? noBuild : buildRate(row),
      ...(detail ? { detail } : {}),
      ...(groupName ? { group: groupName } : {}),
      ...(row.unit === "hours" ? { customHours: true } : {}),
      ...(row.status === "soon" ? { disabled: true } : {}),
      value,
      design: designRate(row),
    };
  });
  const level = (qty: number) => Math.min(modes.length, Math.max(1, Math.round(qty))) - 1;
  const rule: EditionRule = {
    at: (qty) => tiers[level(qty)] ?? { edition: "starter", reason: "" },
  };
  return {
    id: first.id,
    place,
    ...(isCatalogue ? { source: task.item } : {}),
    code: entry.code,
    label: itemLabel,
    group,
    summary: modes[0]?.detail ?? "",
    build: noBuild,
    includedInBase: 0,
    min: 1,
    max: Math.max(1, modes.length),
    initial,
    step: 1,
    stepped: false,
    ...itemStatus,
    modes,
    rule,
    ...markOf(rule, 1),
    requires: [],
    bucket: bucketOf(group),
    design: noDesign,
    designLabel: `${itemLabel} design`,
  };
}

/* ---------- The rules ---------- */

function rule(rules: Rules, name: RuleName, whole = true): number {
  const text = rules[name];
  const value = Number(text);
  if (text === "" || !Number.isFinite(value) || value < 0 || (whole && !Number.isInteger(value))) {
    throw new Error(
      `Rule ${name} must be a ${whole ? "whole number" : "number"}, 0 or more. It is "${text}"`,
    );
  }
  return value;
}

/** A quantity of rounds or variants: so many included, each one past them costs `each`. */
function roundsTile(
  id: string,
  code: number,
  label: string,
  unit: string,
  included: number,
  max: number,
  each: number,
  summary: string,
): Tile {
  if (included > max) throw new Error(`${label}: ${included} included is more than ${max}`);
  return {
    id,
    place: "design",
    code,
    label,
    group: "design",
    summary,
    build: same(each),
    includedInBase: included,
    unit,
    min: included,
    max,
    initial: included,
    step: 1,
    stepped: true,
    rule: steppedRule([]),
    requires: [],
    bucket: "design",
    design: noDesign,
    designLabel: `${label} design`,
  };
}

function choiceTile(id: string, code: number, label: string, summary: string): Tile {
  return {
    id,
    place: "design",
    code,
    label,
    group: "design",
    summary,
    build: noBuild,
    includedInBase: 0,
    min: 1,
    max: 1,
    initial: 1,
    step: 1,
    stepped: false,
    rule: steppedRule([]),
    requires: [],
    bucket: "design",
    design: noDesign,
    designLabel: `${label} design`,
  };
}

const roundsNote = (included: number, each: number) => `${included} included, then ${each}h each`;

/** Design and Languages: the items the rules make. */
function ruleTiles(rules: Rules, codeOf: (id: string) => number, packages: PackageRule[]): Tile[] {
  const variants = rule(rules, "ai-variants-included");
  const percent = rule(rules, "ai-variant-percent");
  const aiRounds = rule(rules, "ai-feedback-included");
  const aiEach = rule(rules, "ai-feedback-each", false);
  const customRounds = rule(rules, "custom-feedback-included");
  const customEach = rule(rules, "custom-feedback-each", false);
  const included = rule(rules, "languages-included");
  const second = rule(rules, "languages-second", false);
  const each = rule(rules, "languages-each", false);
  const languagesMax = rule(rules, "languages-max");
  const growthFrom = rule(rules, "languages-growth-from");
  const professionalFrom = rule(rules, "languages-professional-from");
  if (included < 1 || included > languagesMax) {
    throw new Error(`Languages: ${included} included must be 1 to ${languagesMax}`);
  }
  packages.push({
    tileId: "languages",
    at: growthFrom,
    exact: false,
    package: "growth",
    reason: (qty) => `${qty} languages`,
  });
  const languageRule = steppedRule([
    {
      name: "professional",
      at: professionalFrom,
      reason: "{qty} languages need Content Hub Professional",
    },
  ]);
  const share = percent === 50 ? "half" : `${percent}%`;
  return [
    {
      ...roundsTile(
        "ai-design",
        codeOf("ai-design"),
        "AI generated design",
        "variants",
        variants,
        rule(rules, "ai-variants-max"),
        0,
        `Generates design variants from the features included and how many of each. ${variants === 2 ? "Two" : variants} variants are the starting cost. Each variant after that adds ${share} of that cost, rounded up.`,
      ),
    },
    roundsTile(
      "ai-feedback",
      codeOf("ai-feedback"),
      "AI feedback",
      "rounds",
      aiRounds,
      rule(rules, "ai-feedback-max"),
      aiEach,
      roundsNote(aiRounds, aiEach),
    ),
    choiceTile(
      "custom-design",
      codeOf("custom-design"),
      "Custom design",
      "Design depends on the features included and how many of each.",
    ),
    roundsTile(
      "design-feedback",
      codeOf("design-feedback"),
      "Custom feedback",
      "rounds",
      customRounds,
      rule(rules, "custom-feedback-max"),
      customEach,
      roundsNote(customRounds, customEach),
    ),
    {
      id: "languages",
      place: "basics",
      code: codeOf("languages"),
      label: "Languages",
      group: "languages",
      summary: `${included === 1 ? "One included, 2nd" : `${included} included, the next`} is ${second}h, then ${each}h each`,
      build: same(each),
      includedInBase: included,
      firstUnitHours: second,
      unit: "languages",
      min: 1,
      max: languagesMax,
      initial: 1,
      step: 1,
      stepped: true,
      rule: languageRule,
      ...markOf(languageRule, 1),
      requires: [],
      bucket: "implementation",
      design: noDesign,
      designLabel: "Languages design",
    },
  ];
}

function pageRule(rules: Rules): PageRule {
  const max = rule(rules, "pages-max");
  const initial = rule(rules, "pages-start");
  const from = rule(rules, "pages-professional-from");
  if (initial < 1 || initial > max)
    throw new Error(`Rule pages-start ${initial} is outside 1 to ${max}`);
  return { min: 1, max, initial, steps: [{ edition: "professional", at: from }] };
}

/** Reads the files. Anything it cannot use is an error that names the row or the rule. */
export function buildCatalog(
  rows: readonly Row[],
  rules: Rules,
  codes: readonly CodeEntry[],
): Catalog {
  const byId = new Map<string, Row[]>();
  for (const row of rows) {
    if (!row.id) throw new Error("A row has no id");
    if (ruleTileIds.includes(row.id)) {
      throw new Error(`${row.id} cannot be an id: it is made from the rules`);
    }
    const list = byId.get(row.id);
    if (list) list.push(row);
    else byId.set(row.id, [row]);
  }
  /* Every item and option has a link code: one given before, or the next one */
  const merged = withCodes(codes, [
    ...ruleTileIds.map((id) => ({ id, option: "" })),
    ...rows.map((row) => ({ id: row.id, option: row.option })),
  ]);
  const entryOf = new Map(merged.map((entry) => [entry.id, entry]));
  const codeOf = (id: string) => entryOf.get(id)?.code ?? 0;

  const packageRules: PackageRule[] = [];
  const list: Tile[] = ruleTiles(rules, codeOf, packageRules);
  for (const [id, own] of byId) {
    const first = own[0] as Row;
    if (own.length > 1 && own.some((row) => !row.option)) {
      fail(first, `${id} has ${own.length} rows. An item has one row, or one for each option`);
    }
    const entry = entryOf.get(id) as CodeEntry;
    list.push(
      first.option
        ? modeTile(own, entry, packageRules)
        : plainTile(first, entry.code, packageRules),
    );
  }

  const tileById = new Map(list.map((item) => [item.id, item]));
  const byCode = new Map<number, Tile>();
  for (const item of list) {
    const taken = byCode.get(item.code);
    if (taken) throw new Error(`${item.label} and ${taken.label} have the same code, ${item.code}`);
    byCode.set(item.code, item);
    /* A design line is named after its task: "ai-menu". No task may already have that name. */
    for (const name of [`ai-${item.id}`, `design-${item.id}`]) {
      if (tileById.has(name)) throw new Error(`${item.id} cannot be an id: ${name} is one already`);
    }
  }
  for (const id of neededIds) {
    if (!tileById.has(id))
      throw new Error(`The table has no ${id} row. The page is built around it`);
  }
  for (const [id, parts] of Object.entries(partsOf)) {
    if (!tileById.has(id)) continue;
    for (const part of parts) {
      if (!tileById.has(part)) throw new Error(`The table has ${id} and not its part, ${part}`);
    }
  }
  /* "ai-variants" is the line for extra design variants */
  if (tileById.has("variants")) throw new Error("variants cannot be an id");

  /* Reasons are listed by the tasks' codes, so moving a row in the table never reorders them */
  const ruleCode = (item: PackageRule) => tileById.get(item.tileId)?.code ?? 0;
  packageRules.sort((a, b) => ruleCode(a) - ruleCode(b) || a.at - b.at);

  return {
    tiles: list,
    byId: tileById,
    byCode,
    packageRules,
    pages: pageRule(rules),
    variantPercent: rule(rules, "ai-variant-percent"),
    codes: merged,
  };
}

/* The catalog in use. The page is built from the files it was shipped with; the calculations page
   also reads drafts of them, and puts one in use for as long as it takes to price an estimate. */

let active: Catalog = buildCatalog(
  parseTable(liveText),
  parseRules(liveRulesText),
  parseCodes(liveCodesText),
);

export let tiles: readonly Tile[] = active.tiles;
export let packageRules: readonly PackageRule[] = active.packageRules;
/** More than this many website pages needs Professional. */
export let starterPageCap: number = (active.pages.steps[0]?.at ?? 1) - 1;
export let defaultWebsitePages: number = active.pages.initial;

export function currentCatalog(): Catalog {
  return active;
}

/** Puts a catalog in use, and returns the one it replaces. */
export function useCatalog(next: Catalog): Catalog {
  const before = active;
  active = next;
  tiles = next.tiles;
  packageRules = next.packageRules;
  starterPageCap = (next.pages.steps[0]?.at ?? 1) - 1;
  defaultWebsitePages = next.pages.initial;
  return before;
}

export function withCatalog<Result>(next: Catalog, run: () => Result): Result {
  const before = useCatalog(next);
  try {
    return run();
  } finally {
    useCatalog(before);
  }
}

export function comingLaterTiles(): Tile[] {
  return tiles.filter((item) => item.disabled && !item.hidden);
}

export function getTile(id: string): Tile {
  const found = active.byId.get(id);
  if (!found) throw new Error(`Unknown tile: ${id}`);
  return found;
}

export function hasTile(id: string): boolean {
  return active.byId.has(id);
}

/** An item that is shown: in the table, and not hidden. */
export function isShown(id: string): boolean {
  const found = active.byId.get(id);
  return !!found && !found.hidden;
}

/** What the shelf offers, in the table's order: its items, the Blog and the Product catalogue.
    Hidden ones are left out. */
export function shelfTiles(): Tile[] {
  return tiles.filter(
    (item) =>
      !item.hidden &&
      (item.place === "shelf" || item.id === "blog-setups" || item.id === catalogueId),
  );
}

/** The Product catalogue's sources, as its Source buttons show them: the one with options first,
    then those to come. Hidden ones are left out. */
export function catalogueSources(): Tile[] {
  return tiles
    .filter((item) => item.source !== undefined && !item.hidden)
    .sort((a, b) => Number(b.id === catalogueId) - Number(a.id === catalogueId));
}

export function tileByCode(code: number): Tile | undefined {
  return active.byCode.get(code);
}

/** In the table's order, which is the order hours are listed in. */
export function tilesInGroup(group: GroupId): Tile[] {
  return tiles.filter((item) => item.group === group);
}

export function pageLimits(): { min: number; max: number } {
  return active.pages;
}

/** The tier a page count needs, when it needs more than Starter. */
export function pageEdition(count: number): EditionHit | null {
  let found: EditionHit | null = null;
  for (const step of active.pages.steps) {
    if (count < step.at) continue;
    found = {
      edition: step.edition,
      reason: `${step.at - 1}+ website pages need Content Hub ${editionLabel[step.edition]}`,
    };
  }
  return found;
}

function modeAt(item: Tile, qty: number): TileMode | undefined {
  if (!item.modes || item.modes.length === 0) return undefined;
  return item.modes[Math.min(item.modes.length, Math.max(1, Math.round(qty))) - 1];
}

export function tileMode(item: Tile, qty: number): TileMode | undefined {
  return modeAt(item, qty);
}

/** Build hours of a task at a quantity, for a design choice. */
export function tileHours(item: Tile, qty: number, choice: Choice): number {
  if (item.disabled || item.hidden) return 0;
  const kind = buildKind(choice);
  if (item.modes && item.modes.length > 0) return modeAt(item, qty)?.build[kind] ?? 0;
  const rate = item.build[kind];
  if (!item.unit) return rate;
  const units = Math.max(0, qty - item.includedInBase);
  if (units > 0 && item.firstUnitHours !== undefined) {
    return item.firstUnitHours + rate * (units - 1);
  }
  return rate * units;
}

export function modeLabel(item: Tile, qty: number): string | undefined {
  return modeAt(item, qty)?.label;
}

export type DesignPart = {
  id: string;
  label: string;
  qty: number;
  unit?: string;
  mode?: string;
  hours: number;
};

/** One variant beyond the included ones: a share of the base design, rounded up to a whole hour. */
export function aiVariantHours(baseHours: number): number {
  return Math.ceil((baseHours * active.variantPercent) / 100);
}

/** How much of a task is in the estimate: its quantity or mode. */
export type Amount = { qty: number };

/**
 * Design hours, one line for each task that has a design rate and is in the estimate. Custom
 * design is charged only while Custom design is on; AI design is one set of these lines.
 */
export function designParts(
  kind: DesignKind,
  amountOf: (item: Tile) => Amount | undefined,
): DesignPart[] {
  const prefix = kind === "ai" ? "ai" : "design";
  const parts: DesignPart[] = [];
  for (const group of groups) {
    for (const item of tilesInGroup(group.id)) {
      if (item.hidden || item.disabled) continue;
      const amount = amountOf(item);
      if (!amount) continue;
      const id = `${prefix}-${item.id}`;
      const label = `${kind === "ai" ? "AI " : ""}${item.designLabel}`;
      let part: DesignPart;
      if (item.modes && item.modes.length > 0) {
        const mode = modeAt(item, amount.qty);
        const rate = mode?.design[kind] ?? 0;
        /* The mode is named only when it changes the hours */
        const named = item.modes.some((other) => other.design[kind] !== rate);
        part = {
          id,
          label,
          qty: 1,
          ...(named && mode ? { mode: mode.label } : {}),
          hours: rate,
        };
      } else if (item.stepped) {
        part = {
          id,
          label,
          qty: amount.qty,
          ...(item.unit ? { unit: item.unit } : {}),
          hours: item.design[kind] * amount.qty,
        };
      } else part = { id, label, qty: 1, hours: item.design[kind] };
      if (part.hours > 0) parts.push(part);
    }
  }
  return parts;
}
