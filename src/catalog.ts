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
  designKinds,
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
  "kickoff",
  "training",
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
  "design" | "site" | "blog" | "features" | "languages" | "catalogue" | "membership" | "content";

export type GroupLayout = "pair" | "tiles" | "wide" | "three";

/** Design, Build ("implementation"), Content, and Project: the work around the site, the kick-off,
    training and project management. */
export type HourBucket = "design" | "implementation" | "content" | "project";

/** What the hours that are not Design, Build or Content are called on the page and in a quote. */
export const projectName = "Project";

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
  { id: "membership", label: "Memberships", layout: "tiles" },
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
  "kickoff",
  "training",
] as const;

/** The ids of the lines an estimate makes itself, apart from the table's items: no item may have
    one, or the page would show the item's hours as that line's. */
export const madeLineIds = { variants: "ai-variants", management: "project-management" } as const;

/** The site basics whose hours are Project. The others are Build: each has its place on the page,
    so their type is fixed. */
export const projectBasicIds: readonly string[] = ["kickoff", "training"];

/** The site basics in every estimate once: a link holds no number for them (quote.ts), so they
    take no unit and no options. */
export const onceBasicIds: readonly string[] = ["header", "footer", "setup", "kickoff"];

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
  /** Its design hours are entered too, in this item of their own (unit "build and design hours"). */
  designInput?: string;
  /** The item whose design hours this one holds: in the estimate with it, never on its own. */
  designOf?: string;
  /** How many of it the estimate has, when it can have more than one: an item of its own. Its hours
      count once for each. */
  countedBy?: string;
  /** The item it counts: in the estimate with it, never on its own. */
  counts?: string;
  /** Shown, but not selectable. No build hours. */
  disabled?: boolean;
  /** Not shown anywhere, and left out of every estimate. Its link code stays taken. */
  hidden?: boolean;
  modes?: readonly TileMode[];
  rule: EditionRule;
  badge?: TileBadge;
  hub?: { id: HubId; edition: Edition; detail: string };
  note?: string;
  /** Design and content sit outside the package rate and the extra cap. */
  bucket: HourBucket;
  /** A task with modes keeps its design hours on each mode. */
  design: DesignRate;
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
  /** Project management: this share of the estimate's design, build and content hours, in percent, whatever the
      design. */
  managementPercent: number;
  /** The link codes with every item of the table in them: what Save and the build write. */
  codes: readonly CodeEntry[];
};

const rulePackages = ["growth", "platform"] as const;
const ruleEditions = ["professional", "enterprise"] as const;

/** Where an item of the table is in the estimator:
    basics     in every estimate (the page is built around them, so the list is fixed)
    shelf      added when the site needs it, on its own
    blog       the Blog: the number of blogs, and its templates
    catalogue  the Product catalogue: its sources, and what goes with them
    membership Memberships: how members sign in, their access groups, and what goes with them */
export const places = ["basics", "shelf", "blog", "catalogue", "membership"] as const;
export type Place = (typeof places)[number] | "design";

/** What the Blog, the Product catalogue and Memberships are called. They are places, not rows of
    the table. */
export const placeName = {
  blog: "Blog",
  catalogue: "Product catalogue",
  membership: "Memberships",
} as const;

/** The Product catalogue's first source, HubDB: the catalogue on the shelf, and in the estimate's
    middle column, whichever source it has. Every item of the catalogue that is not one of its parts
    is a source, with the same options: an estimate's catalogue has one of them. */
export const catalogueId = "product-catalogue";

/** A way the design gets made. Each is an item the rules make, and every estimate has one of them:
    AI generated, Nimbly and Custom with their own build and design hours and feedback rounds; None
    with no design hours, building as Custom. */
export type DesignChoice = {
  kind: Choice;
  /** Its item: in the estimate while it is the choice. */
  id: string;
  /** Its feedback rounds, in the estimate with it. None has none. */
  feedbackId?: string;
  feedbackName?: string;
  /** On its button. */
  label: string;
  /** In the hours and the reasons for the package. */
  name: string;
  note: string;
};

export const designChoices: readonly DesignChoice[] = [
  {
    kind: "ai",
    id: "ai-design",
    feedbackId: "ai-feedback",
    feedbackName: "AI feedback",
    label: "AI generated",
    name: "AI generated design",
    note: "AI generates variants from Nimbly's default templates and the client's brief. The client picks one.",
  },
  {
    kind: "nimbly",
    id: "nimbly-design",
    feedbackId: "nimbly-feedback",
    feedbackName: "Nimbly feedback",
    label: "Nimbly",
    name: "Nimbly design",
    note: "A designer adapts Nimbly's default templates to the client's brief.",
  },
  {
    kind: "custom",
    id: "custom-design",
    feedbackId: "custom-feedback",
    feedbackName: "Custom feedback",
    label: "Custom",
    name: "Custom design",
    note: "A designer creates a fully custom design from the client's brief.",
  },
  {
    kind: "none",
    id: "no-design",
    label: "None",
    name: "No design",
    note: "The client provides the design. No design hours; build hours as for Custom.",
  },
];

/** The design a new estimate starts with. */
export const startingDesign = designChoices.find(
  (choice) => choice.kind === "nimbly",
) as DesignChoice;

/** Items the rules make. */
const ruleTileIds: readonly string[] = [
  ...designChoices.flatMap((choice) => [
    choice.id,
    ...(choice.feedbackId ? [choice.feedbackId] : []),
  ]),
  "languages",
];

/** Items the page is built around: the basics. A table without one of them cannot be used. */
const neededIds = basicsTileIds;

/** Parts that live inside another item's card: with the item in the table, they must be too. */
export const partsOf: Record<string, readonly string[]> = {
  "blog-setups": ["blog-list", "blog-post", "blog-recent"],
  "product-catalogue": ["catalogue-custom", "favorite-products", "related-products"],
  membership: ["membership-groups", "membership-social", "membership-area"],
};

/** The items with parts, and the place they and their parts are in. */
const cardPlaces: Record<string, (typeof places)[number]> = {
  "blog-setups": "blog",
  "product-catalogue": "catalogue",
  membership: "membership",
};

/** Parts added to their item on their own, each with a status of its own. */
export const optionalPartIds: readonly string[] = [
  "blog-recent",
  "favorite-products",
  "related-products",
  "membership-social",
  "membership-area",
];

/** Parts always in the estimate with their item: the Blog's templates (a status on each option)
    and Memberships' access groups. The catalogue's custom hours go with its Custom option. */
export function requiredPartsOf(id: string): string[] {
  return (partsOf[id] ?? []).filter(
    (part) => !optionalPartIds.includes(part) && part !== "catalogue-custom",
  );
}

/** The item a part is in. */
export function ownerOf(id: string): string | undefined {
  return Object.entries(partsOf).find(([, parts]) => parts.includes(id))?.[0];
}

/** Items whose status can be Coming soon or Hidden: what sits on the shelf, the sources of the
    Product catalogue and the parts added on their own; not the basics that every estimate has. */
export function hasStatus(id: string): boolean {
  return (
    !isAlwaysOn(id) && !ruleTileIds.includes(id) && (!isPart(id) || optionalPartIds.includes(id))
  );
}

/** A part of the Blog or of the Product catalogue: in the estimate with it, never on its own. */
export function isPart(id: string): boolean {
  return Object.values(partsOf).some((parts) => parts.includes(id));
}

/** A source of the Product catalogue: an item of the catalogue that is not one of its parts. */
export function isSource(id: string, place: string): boolean {
  return place === "catalogue" && !isPart(id);
}

function fail(row: Row, message: string): never {
  throw new Error(`${row.item || row.id}${row.option ? `, ${row.option}` : ""}: ${message}`);
}

/** A number of the table: whole hours, quantities and limits, so every sum is exact. */
function number(row: Row, column: Column, fallback: number): number {
  const text = row[column];
  if (text === "") return fallback;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) {
    fail(row, `${column} must be a whole number, 0 or more. It is "${text}"`);
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

const noBuild: BuildRate = { ai: 0, nimbly: 0, custom: 0 };
const noDesign: DesignRate = { ai: 0, nimbly: 0, custom: 0 };
const same = (hours: number): BuildRate => ({ ai: hours, nimbly: hours, custom: hours });

function buildRate(row: Row): BuildRate {
  return {
    ai: number(row, "build-ai", 0),
    nimbly: number(row, "build-nimbly", 0),
    custom: number(row, "build-custom", 0),
  };
}

function designRate(row: Row): DesignRate {
  return {
    ai: number(row, "design-ai", 0),
    nimbly: number(row, "design-nimbly", 0),
    custom: number(row, "design-custom", 0),
  };
}

const hourColumns = [
  "build-ai",
  "build-nimbly",
  "build-custom",
  "design-ai",
  "design-nimbly",
  "design-custom",
] as const;

/** Where the row belongs, checked against what the page is built around. */
function placeOf(row: Row): (typeof places)[number] {
  const place = places.find((item) => item === row.place);
  if (!place) fail(row, `place must be one of ${places.join(", ")}. It is "${row.place}"`);
  const basic = basicsTileIds.some((id) => id === row.id);
  const owner = cardPlaces[row.id] ? row.id : ownerOf(row.id);
  const expected = basic ? "basics" : owner ? (cardPlaces[owner] ?? null) : null;
  if (expected && place !== expected) fail(row, `place must be ${expected}. It is ${place}`);
  /* The catalogue takes more sources; the basics, the Blog and Memberships are fixed */
  if (!expected && place !== "shelf" && place !== "catalogue") {
    const fixed =
      place === "basics"
        ? [...basicsTileIds]
        : Object.keys(cardPlaces)
            .filter((id) => cardPlaces[id] === place)
            .flatMap((id) => [id, ...(partsOf[id] ?? [])]);
    fail(row, `place cannot be ${place}: it holds ${fixed.join(", ")}`);
  }
  if (row.type !== "" && row.type !== "content" && row.type !== "project") {
    fail(row, `type must be empty (build), content or project. It is "${row.type}"`);
  }
  if (row.type === "content" && place !== "shelf") {
    fail(row, "type can be content on items of the shelf only");
  }
  if (row.type === "project" && place !== "shelf" && place !== "basics") {
    fail(row, "type can be project on items of the site basics and the shelf only");
  }
  if (place === "basics") {
    const fixed = projectBasicIds.includes(row.id) ? "project" : "";
    if (row.type !== fixed) {
      fail(row, `type is fixed in the site basics: ${fixed ? "project" : "empty (build)"}`);
    }
    if (onceBasicIds.includes(row.id) && (row.unit || row.option)) {
      fail(row, "unit and option must be empty: it is in every estimate once");
    }
  }
  return place;
}

function groupOf(row: Row, place: (typeof places)[number]): GroupId {
  if (place === "basics") return "site";
  if (place === "shelf") return row.type === "content" ? "content" : "features";
  return place;
}

/** Where an item's hours count: Content and Project by its type, Build otherwise. Its design
    hours are always Design. */
function bucketOf(group: GroupId, type = ""): HourBucket {
  if (group === "design") return "design";
  if (type === "project") return "project";
  return group === "content" ? "content" : "implementation";
}

function statusOf(row: Row): { disabled?: true; badge?: TileBadge; hidden?: true } {
  if (isSource(row.id, row.place) && row.status === "") {
    fail(
      row,
      "status must be soon or hidden: a source of products is live with its options, and this one has none yet",
    );
  }
  if (row.status === "") return {};
  if (!hasStatus(row.id)) {
    fail(
      row,
      "status can be set on items of the shelf, sources of products and parts added on their own. This one is always shown",
    );
  }
  if (row.status === "soon") return { disabled: true, badge: "planned" };
  if (row.status === "hidden") return { hidden: true };
  fail(row, `status must be empty (live), soon or hidden. It is "${row.status}"`);
}

/** The tier an item needs, as its badge says it, with the option or quantity it has: Pro, Ent, or
    none for Starter. An item that needs another tier with another option or from a quantity on
    shows that one: Forms with external data is Pro with HubDB and Ent with External API. */
export function tierMark(item: Tile, qty: number = item.initial): "Pro" | "Ent" | undefined {
  const edition = item.rule.at(qty).edition;
  if (edition === "professional") return "Pro";
  return edition === "enterprise" ? "Ent" : undefined;
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

/** The unit of an item whose build hours and design hours are both entered in the estimate. */
export const designInputUnit = "build and design hours";
/** The item that holds the design hours entered for another. */
export const designInputId = (id: string) => `${id}-design`;

/** The design hours entered for an item: an item of their own, so a link holds them, in the
    estimate with it. Counted as design hours whatever the design. */
function designInputTile(item: Tile, code: number): Tile {
  return {
    ...item,
    id: designInputId(item.id),
    code,
    designInput: undefined,
    designOf: item.id,
    summary: "",
    bucket: "design",
    initial: 0,
    rule: steppedRule([]),
    badge: undefined,
  };
}

/** The Blog's parts the blogs may need more than one of, each with the item that counts it and what
    it counts: with more than one blog, a blog may need a list or post template of its own, or a
    recent posts section of its own design. The count is never more than the blogs; one, the one
    they all share, is no count at all. */
export const templateCounts: Readonly<Record<string, { id: string; unit: string }>> = {
  "blog-list": { id: "blog-list-count", unit: "templates" },
  "blog-post": { id: "blog-post-count", unit: "templates" },
  "blog-recent": { id: "blog-recent-count", unit: "versions" },
};

/** How many of an item the estimate has: an item of its own, so a link holds it, with no hours of
    its own. It multiplies the item's. Its most is the blogs' most (set once the table is read). */
function countTile(item: Tile, id: string, unit: string, code: number): Tile {
  return {
    id,
    place: item.place,
    code,
    label: item.label,
    group: item.group,
    summary: "",
    build: noBuild,
    includedInBase: 0,
    unit,
    min: 1,
    max: 100,
    initial: 1,
    step: 1,
    stepped: true,
    counts: item.id,
    rule: steppedRule([]),
    bucket: item.bucket,
    design: noDesign,
  };
}

/** A task with one row: a switch, a quantity, or hours you enter. */
function plainTile(row: Row, code: number, rules: PackageRule[]): Tile {
  if (!row.item) fail(row, "item is empty");
  const place = placeOf(row);
  const group = groupOf(row, place);
  /* "build and design hours": both entered, the design hours in an item of their own */
  const withDesign = row.unit === designInputUnit;
  const unit = withDesign ? "hours" : row.unit || undefined;
  const hourInput = unit === "hours";
  const min = hourInput ? 0 : 1;
  const max = number(row, "max", unit ? Number.NaN : 1);
  const initial = number(row, "start", min);
  if (Number.isNaN(max)) fail(row, "max is empty. An item with a unit needs its highest quantity");
  if (!unit && (max !== 1 || initial !== 1)) {
    fail(row, "start and max need a unit, such as templates or hours");
  }
  if (min > max) fail(row, `max ${max} is less than ${min}`);
  if (initial < min || initial > max) fail(row, `start ${initial} is outside ${min} to ${max}`);
  if (hourInput) blank(row, hourColumns, "its hours are entered in the estimate");
  if (withDesign && row.type !== "") {
    fail(row, "type must be empty: build and design hours are build hours and design hours");
  }
  const source = isSource(row.id, place);
  const label = source ? `${placeName.catalogue} (${row.item})` : row.item;

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
    ...(source ? { source: row.item } : {}),
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
    ...(withDesign ? { designInput: designInputId(row.id) } : {}),
    ...statusOf(row),
    rule,
    bucket: bucketOf(group, row.type),
    design: designRate(row),
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
  /* A source's rows are the Product catalogue from that source: "Product catalogue (HubDB)" */
  const isCatalogue = isSource(first.id, place);
  const itemLabel = isCatalogue ? `${placeName.catalogue} (${task.item})` : task.item;
  const names = new Set<string>();
  let starts = "";
  for (const row of rows) {
    if (!row.option) fail(row, "every row of an item with options needs an option");
    if (names.has(row.option)) fail(row, "two rows of the item have this option");
    if (row.option.includes("|")) {
      fail(row, 'an option name cannot have "|": link-codes.csv keeps the options apart with it');
    }
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
    bucket: bucketOf(group, task.type),
    design: noDesign,
  };
}

/* ---------- The rules ---------- */

/** A rule's number: whole, as the hours are. */
function rule(rules: Rules, name: RuleName): number {
  const text = rules[name];
  const value = Number(text);
  if (text === "" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Rule ${name} must be a whole number, 0 or more. It is "${text}"`);
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
  /* At least one: a link writes the number from 1 (see quote.ts) */
  if (included < 1 || included > max) {
    throw new Error(`${label}: ${included} ${unit} included must be 1 to ${max}`);
  }
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
    bucket: "design",
    design: noDesign,
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
    bucket: "design",
    design: noDesign,
  };
}

const roundsNote = (included: number, each: number) => `${included} included, then ${each}h each`;

/** A package a rule names: empty for none, growth or platform. */
function rulePackage(rules: Rules, name: RuleName): PackageId | null {
  const text = rules[name].trim();
  if (text === "") return null;
  const found = rulePackages.find((item) => item === text);
  if (!found) throw new Error(`Rule ${name} must be growth, platform or empty. It is "${text}"`);
  return found;
}

/** Design and Languages: the items the rules make. */
function ruleTiles(rules: Rules, codeOf: (id: string) => number, packages: PackageRule[]): Tile[] {
  const variants = rule(rules, "ai-variants-included");
  const included = rule(rules, "languages-included");
  const second = rule(rules, "languages-second");
  const each = rule(rules, "languages-each");
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
  /* Each design, with the package it needs, then its feedback rounds: so many included, each one
     past them charged */
  const designs = designChoices.flatMap((choice): Tile[] => {
    const needs = rulePackage(rules, `${choice.kind}-package`);
    if (needs) {
      packages.push({
        tileId: choice.id,
        at: 1,
        exact: false,
        package: needs,
        reason: () => choice.name,
      });
    }
    const design =
      choice.kind === "ai"
        ? roundsTile(
            choice.id,
            codeOf(choice.id),
            choice.name,
            "variants",
            variants,
            rule(rules, "ai-variants-max"),
            0,
            choice.note,
          )
        : choiceTile(choice.id, codeOf(choice.id), choice.name, choice.note);
    if (choice.kind === "none" || !choice.feedbackId) return [design];
    const rounds = rule(rules, `${choice.kind}-feedback-included`);
    const each = rule(rules, `${choice.kind}-feedback-each`);
    const feedback = roundsTile(
      choice.feedbackId,
      codeOf(choice.feedbackId),
      choice.feedbackName ?? `${choice.label} feedback`,
      "rounds",
      rounds,
      rule(rules, `${choice.kind}-feedback-max`),
      each,
      roundsNote(rounds, each),
    );
    return [design, feedback];
  });
  return [
    ...designs,
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
      bucket: "implementation",
      design: noDesign,
    },
  ];
}

function pageRule(rules: Rules): PageRule {
  const max = rule(rules, "pages-max");
  const initial = rule(rules, "pages-start");
  const from = rule(rules, "pages-professional-from");
  if (initial < 1 || initial > max)
    throw new Error(`Rule pages-start ${initial} is outside 1 to ${max}`);
  /* A new estimate starts under the cap, and the estimator's two buttons each have a side */
  if (from <= initial || from > max) {
    throw new Error(
      `Rule pages-professional-from ${from} must be ${initial + 1} to ${max}: above pages-start, up to pages-max`,
    );
  }
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
  /* Every item and option has a link code: one given before, or the next one. A link names the
     items of the shelf and their parts by code, so they come first, in the table's order, each with
     what goes with it; the basics and the designs, which a link holds otherwise, come last */
  const linked = rows.filter((row) => !basicsTileIds.some((id) => id === row.id));
  const merged = withCodes(codes, [
    ...linked.flatMap((row) => [
      { id: row.id, option: row.option },
      ...(row.unit === designInputUnit ? [{ id: designInputId(row.id), option: "" }] : []),
      ...(templateCounts[row.id] ? [{ id: templateCounts[row.id]?.id ?? "", option: "" }] : []),
    ]),
    ...ruleTileIds.map((id) => ({ id, option: "" })),
    ...rows
      .filter((row) => basicsTileIds.some((id) => id === row.id))
      .map((row) => ({ id: row.id, option: row.option })),
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
    const item = first.option
      ? modeTile(own, entry, packageRules)
      : plainTile(first, entry.code, packageRules);
    list.push(item);
    if (item.designInput) {
      if (byId.has(item.designInput)) {
        fail(first, `${item.designInput} cannot be an id: it holds ${id}'s design hours`);
      }
      list.push(designInputTile(item, codeOf(item.designInput)));
    }
    const count = templateCounts[id];
    if (count) {
      if (byId.has(count.id))
        fail(first, `${count.id} cannot be an id: it holds how many ${id} there are`);
      item.countedBy = count.id;
      list.push(countTile(item, count.id, count.unit, codeOf(count.id)));
    }
  }

  const tileById = new Map(list.map((item) => [item.id, item]));
  /* A count is never more than the blogs, so it goes as high as they can */
  for (const item of list) {
    const owner = item.counts ? ownerOf(item.counts) : undefined;
    const most = owner ? tileById.get(owner)?.max : undefined;
    if (most !== undefined) item.max = most;
  }
  const byCode = new Map<number, Tile>();
  for (const item of list) {
    const taken = byCode.get(item.code);
    if (taken) throw new Error(`${item.label} and ${taken.label} have the same code, ${item.code}`);
    byCode.set(item.code, item);
    /* A design line is named after its kind and task: "ai-menu". No task may have that name. */
    for (const name of designKinds.map((kind) => `${kind}-${item.id}`)) {
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
  for (const id of Object.values(madeLineIds)) {
    const item = tileById.get(id);
    if (item)
      throw new Error(`${item.label}: ${id} cannot be an id: it is a line the estimate makes`);
  }

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
    managementPercent: rule(rules, "pm-percent"),
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

/** What the shelf offers, in the table's order: its items, the Blog, the Product catalogue and
    Memberships. Hidden ones are left out; the Product catalogue is shown while any of its sources
    is. */
export function shelfTiles(): Tile[] {
  return tiles.filter((item) =>
    item.id === catalogueId
      ? catalogueSources().length > 0
      : !item.hidden &&
        !item.designOf &&
        (item.place === "shelf" || cardPlaces[item.id] !== undefined),
  );
}

/** An item of the shelf that can be added: not coming soon. The Product catalogue can while any of
    its sources is live. */
export function isReady(item: Tile): boolean {
  return item.id === catalogueId
    ? catalogueSources().some((source) => !source.disabled)
    : !item.disabled && !item.hidden;
}

/** The Product catalogue's sources, every one, in the table's order: HubDB first. */
export function sourceTiles(): Tile[] {
  return tiles
    .filter((item) => item.source !== undefined)
    .sort((a, b) => Number(b.id === catalogueId) - Number(a.id === catalogueId));
}

/** The source the shelf's Product catalogue comes with: HubDB, or the first live one when HubDB is
    hidden or coming soon. */
export function shelfSource(): Tile | undefined {
  return sourceTiles().find((item) => !item.disabled && !item.hidden);
}

/** The sources its Source buttons show: the hidden ones are left out. */
export function catalogueSources(): Tile[] {
  return sourceTiles().filter((item) => !item.hidden);
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
  /** The item it is the design of. */
  item: string;
  label: string;
  qty: number;
  unit?: string;
  mode?: string;
  hours: number;
};

/** Project management's share of the estimate's design, build and content hours, in percent. */
export function managementPercent(): number {
  return active.managementPercent;
}

/** One variant beyond the included ones: a share of the base design, rounded up to a whole hour. */
export function aiVariantHours(baseHours: number): number {
  return Math.ceil((baseHours * active.variantPercent) / 100);
}

/** How much of a task is in the estimate: its quantity or mode, and how many of it with what that
    counts (the Blog's templates or recent posts versions, with more than one blog). */
export type Amount = { qty: number; times?: number; unit?: string };

/**
 * Design hours of one kind, one line for each task that has a design rate and is in the estimate:
 * "nimbly-menu", named as the item. Only the estimate's design choice is charged.
 */
export function designParts(
  kind: DesignKind,
  amountOf: (item: Tile) => Amount | undefined,
): DesignPart[] {
  const parts: DesignPart[] = [];
  for (const group of groups) {
    for (const item of tilesInGroup(group.id)) {
      if (item.hidden || item.disabled) continue;
      const amount = amountOf(item);
      if (!amount) continue;
      const id = `${kind}-${item.id}`;
      const label = item.label;
      let part: DesignPart;
      /* How many, when more than one, as its build line says */
      const times = amount.times ?? 1;
      const counted = times > 1 && amount.unit ? { unit: amount.unit } : {};
      if (item.modes && item.modes.length > 0) {
        const mode = modeAt(item, amount.qty);
        const rate = mode?.design[kind] ?? 0;
        /* Named with its option, as its build line is */
        part = {
          id,
          item: item.id,
          label,
          qty: times,
          ...counted,
          ...(mode ? { mode: mode.label } : {}),
          hours: rate * times,
        };
      } else if (item.stepped) {
        part = {
          id,
          item: item.id,
          label,
          qty: amount.qty,
          ...(item.unit ? { unit: item.unit } : {}),
          hours: item.design[kind] * amount.qty,
        };
      } else {
        part = {
          id,
          item: item.id,
          label,
          qty: times,
          ...counted,
          hours: item.design[kind] * times,
        };
      }
      if (part.hours > 0) parts.push(part);
    }
  }
  return parts;
}
