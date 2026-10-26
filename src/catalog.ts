/**
 * Guide hours. Replace them before a real proposal.
 *
 * Essential, Growth, and Platform are project packages. The active package is
 * the lowest tier that covers every selected option. It is not a choice.
 *
 * Website pages are not build hours. More than 30 needs Professional.
 * The count starts at 25.
 *
 * Design hours are charged only while Custom design is on, and they stay
 * separate from build hours.
 */

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

/** HubSpot's own tier colours, used on the package cards. */
export const tierBrand: Record<Edition, { background: string; color: string }> = {
  free: { background: "#cbd6e2", color: "#33475b" },
  starter: { background: "#ff7a59", color: "#ffffff" },
  professional: { background: "#00a4bd", color: "#ffffff" },
  enterprise: { background: "#33475b", color: "#ffffff" },
};

/** More than this many website pages needs Professional. */
export const starterPageCap = 30;

export const defaultWebsitePages = 25;

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
  | "design"
  | "site"
  | "blog"
  | "features"
  | "languages"
  | "catalogue"
  | "content";

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
  { id: "blog", label: "Blog", layout: "tiles" },
  { id: "features", label: "Extra features", layout: "tiles" },
  { id: "languages", label: "Languages", layout: "wide" },
  { id: "catalogue", label: "", layout: "tiles" },
  { id: "content", label: "Content", layout: "tiles" },
];

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

export type TileMode = { label: string; hours: number; detail?: string; group?: string };

export type BlogSetupMode = "same" | "list" | "post" | "both";

function fixed(edition: Edition, reason: string): EditionRule {
  return { at: () => ({ edition, reason }) };
}

function ladder(
  rungs: { upTo: number; edition: Edition; reason: string }[],
  above: { edition: Edition; reason: (qty: number) => string },
): EditionRule {
  return {
    at(qty) {
      for (const rung of rungs) {
        if (qty <= rung.upTo) return { edition: rung.edition, reason: rung.reason };
      }
      return { edition: above.edition, reason: above.reason(qty) };
    },
  };
}

const starter = fixed("starter", "");

export type Tile = {
  id: string;
  label: string;
  group: GroupId;
  summary: string;
  baseHours: number;
  perUnitHours: number;
  includedInBase: number;
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
  modes?: readonly TileMode[];
  rule: EditionRule;
  mark?: string;
  badge?: TileBadge;
  hub?: { id: HubId; edition: Edition; detail: string };
  requires: readonly string[];
  note?: string;
  /** Design and content sit outside the package rate and the extra cap. */
  bucket: HourBucket;
};

function tile(input: {
  id: string;
  label: string;
  group: GroupId;
  summary: string;
  baseHours: number;
  rule: EditionRule;
  perUnitHours?: number;
  includedInBase?: number;
  unit?: string;
  min?: number;
  max?: number;
  initial?: number;
  step?: number;
  stepped?: boolean;
  hourInput?: boolean;
  disabled?: boolean;
  modes?: readonly TileMode[];
  mark?: string;
  badge?: TileBadge;
  hub?: Tile["hub"];
  requires?: readonly string[];
  note?: string;
  bucket?: HourBucket;
}): Tile {
  const modeLimits = input.modes
    ? { min: 1, max: input.modes.length, stepped: false as const }
    : {};
  return {
    perUnitHours: 0,
    includedInBase: 0,
    min: 1,
    max: 1,
    initial: 1,
    step: 1,
    stepped: false,
    requires: [],
    bucket: "implementation",
    ...input,
    ...modeLimits,
  };
}

export const tiles: readonly Tile[] = [
  tile({
    id: "ai-design",
    label: "AI generated design",
    group: "design",
    summary:
      "Generates design variants from the features included and how many of each. Two variants are the starting cost. Each variant after that adds half of that cost.",
    baseHours: 0,
    unit: "variants",
    min: 2,
    max: 10,
    initial: 2,
    stepped: true,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "ai-feedback",
    label: "AI feedback",
    group: "design",
    summary: "1 round included. Each extra round is 3h.",
    baseHours: 0,
    perUnitHours: 3,
    includedInBase: 1,
    unit: "rounds",
    min: 1,
    max: 10,
    initial: 1,
    stepped: true,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "custom-design",
    label: "Custom design",
    group: "design",
    summary: "Design depends on the features included and how many of each.",
    baseHours: 0,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "design-feedback",
    label: "Custom feedback",
    group: "design",
    summary: "2 rounds included. Each extra round is 6h.",
    baseHours: 0,
    perUnitHours: 6,
    includedInBase: 2,
    unit: "rounds",
    min: 2,
    max: 10,
    initial: 2,
    stepped: true,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "templates",
    label: "Page templates",
    group: "site",
    summary: "2h each to build. 1–4 keeps Essential. 5 or more needs Growth.",
    baseHours: 0,
    perUnitHours: 2,
    unit: "templates",
    min: 1,
    max: 20,
    initial: 3,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "sections",
    label: "Sections",
    group: "site",
    summary:
      "A hero, cards, a quote, an FAQ, and the rest. 4h each to build. 1–10 keeps Essential. 11 or more needs Growth.",
    baseHours: 0,
    perUnitHours: 4,
    unit: "sections",
    min: 1,
    max: 40,
    initial: 8,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "landing-templates",
    label: "Landing templates",
    group: "site",
    summary: "3h each to build. 1–2 keeps Essential. 3 or more needs Growth.",
    baseHours: 0,
    perUnitHours: 3,
    unit: "templates",
    min: 1,
    max: 10,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "blog-list",
    label: "List template",
    group: "blog",
    summary: "A blog list with pagination.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4, detail: "A blog list with pagination." },
      {
        label: "Advanced",
        hours: 8,
        detail:
          "A blog list with a custom grid, favorites, filtering, and pagination. Needs Growth.",
      },
    ],
    rule: starter,
  }),
  tile({
    id: "blog-post",
    label: "Post template",
    group: "blog",
    summary: "A blog post template.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4, detail: "A blog post template." },
      {
        label: "Advanced",
        hours: 8,
        detail:
          "A blog post with related posts and other advanced HubSpot blog features. Needs Growth.",
      },
    ],
    rule: starter,
  }),
  tile({
    id: "blog-list-count",
    label: "List templates",
    group: "blog",
    summary: "How many list templates, when there is more than one blog.",
    baseHours: 0,
    unit: "templates",
    min: 1,
    max: 20,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "blog-post-count",
    label: "Post templates",
    group: "blog",
    summary: "How many post templates, when there is more than one blog.",
    baseHours: 0,
    unit: "templates",
    min: 1,
    max: 20,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "blog-setups",
    label: "Blogs",
    group: "blog",
    summary: "One blog keeps Essential. Two or more needs Growth.",
    baseHours: 0,
    perUnitHours: 0,
    unit: "blogs",
    min: 1,
    max: 100,
    initial: 1,
    stepped: true,
    rule: ladder([{ upTo: 1, edition: "starter", reason: "" }], {
      edition: "professional",
      reason: (qty) => `${qty} blogs need Content Hub Professional`,
    }),
  }),
  tile({
    id: "blog-recent",
    label: "Recent blog posts",
    group: "blog",
    summary: "Lists the latest posts. 4h.",
    baseHours: 4,
    rule: starter,
  }),
  tile({
    id: "search",
    label: "Search",
    group: "site",
    summary: "A search field and a results page template.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4, detail: "A search field and a results page template." },
      {
        label: "Advanced",
        hours: 10,
        detail:
          "A search dialog with favorites and grouped suggestions, plus a results page template. Needs Growth.",
      },
    ],
    rule: starter,
  }),
  tile({
    id: "menu",
    label: "Menu",
    group: "site",
    summary: "A one-level menu, with a touch-friendly version on mobile.",
    baseHours: 0,
    modes: [
      {
        label: "Simple",
        hours: 3,
        detail: "A one-level menu, with a touch-friendly version on mobile.",
      },
      {
        label: "Advanced",
        hours: 12,
        detail: "A multi-level mega menu, with a touch-friendly version on mobile. Needs Growth.",
      },
    ],
    rule: starter,
  }),
  tile({
    id: "system",
    label: "Custom system templates",
    group: "site",
    summary:
      "Custom 404 and 500 error pages, subscription page, backup unsubscribe page, and subscriptions update page.",
    baseHours: 6,
    rule: starter,
  }),
  tile({
    id: "header",
    label: "Global header",
    group: "site",
    summary: "The theme header: logo, navigation slot, and buttons.",
    baseHours: 3,
    rule: starter,
  }),
  tile({
    id: "footer",
    label: "Global footer",
    group: "site",
    summary: "The theme footer: links, contact, and legal.",
    baseHours: 4,
    rule: starter,
  }),
  tile({
    id: "setup",
    label: "Setup and launch",
    group: "site",
    summary:
      "Kickoff, accounts, and the first deploy, then go-live checks, the handover, and the DNS change that points the domain at HubSpot.",
    baseHours: 12,
    rule: starter,
  }),
  tile({
    id: "hubdb",
    label: "HubDB based section",
    group: "features",
    summary:
      "A HubDB-backed section. A resource library, a directory, or a filterable list that is not a full catalogue.",
    baseHours: 0,
    perUnitHours: 10,
    unit: "modules",
    min: 1,
    max: 10,
    initial: 1,
    stepped: true,
    mark: "Pro",
    rule: fixed("professional", "HubDB needs Content Hub Professional"),
  }),
  tile({
    id: "crm-section",
    label: "CRM Object based section",
    group: "features",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "crm-custom-section",
    label: "Custom Object based section",
    group: "features",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    mark: "Ent",
    rule: fixed("enterprise", "A CRM custom object needs Enterprise"),
  }),
  tile({
    id: "product-catalogue",
    label: "HubDB-based",
    group: "catalogue",
    summary:
      "Platform only. HubDB is the catalogue you can quote. CRM Object and Custom Object are in development.",
    baseHours: 0,
    initial: 2,
    modes: [
      {
        label: "Module based",
        hours: 22,
        detail:
          "A module shows one product and several levels of subproducts. There is no listing page and no dynamic pages. It suits a few main products with many subproducts.",
      },
      {
        label: "Simple",
        hours: 18,
        group: "Dynamic pages",
        detail:
          "Dynamic pages with one listing page, pagination, and a detail page for each product.",
      },
      {
        label: "Filtered",
        hours: 28,
        group: "Dynamic pages",
        detail:
          "Dynamic pages with one listing page, pagination, simple filters, sorting, and a detail page for each product.",
      },
      {
        label: "Multi-level",
        hours: 40,
        group: "Dynamic pages",
        detail:
          "The filtered catalogue, plus an SEO-friendly listing page for each category. Each category page has filters, sorting, and breadcrumbs, and each product has a detail page.",
      },
    ],
    mark: "Pro",
    rule: fixed("professional", "A product catalogue on HubDB needs Content Hub Professional"),
  }),
  tile({
    id: "catalogue-crm",
    label: "CRM Object",
    group: "catalogue",
    summary: "Products as the standard CRM product record. In development.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "catalogue-objects",
    label: "CRM custom object",
    group: "catalogue",
    summary: "Enterprise only. Products as a CRM custom object. In development.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    mark: "Ent",
    rule: fixed("enterprise", "CRM custom objects need Enterprise"),
  }),
  tile({
    id: "favorite-products",
    label: "Favorite products",
    group: "catalogue",
    summary: "A favorite-products section on a static page.",
    baseHours: 0,
    perUnitHours: 6,
    unit: "sections",
    min: 1,
    max: 10,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "related-products",
    label: "Related products",
    group: "catalogue",
    summary: "Related products on the product detail page.",
    baseHours: 6,
    rule: starter,
  }),
  tile({
    id: "custom-forms",
    label: "Custom forms",
    group: "site",
    summary: "Works like a standard HubSpot form, with your brand styling and better performance",
    baseHours: 5,
    rule: starter,
  }),
  tile({
    id: "external-forms",
    label: "Forms with external data",
    group: "features",
    summary:
      "A custom form filled from HubDB, or from an external API through a serverless function.",
    baseHours: 0,
    modes: [
      { label: "HubDB", hours: 12 },
      { label: "External API", hours: 18 },
    ],
    disabled: true,
    badge: "planned",
    rule: ladder(
      [
        {
          upTo: 1,
          edition: "professional",
          reason: "A form fed by HubDB needs Content Hub Professional",
        },
      ],
      {
        edition: "enterprise",
        reason: () => "A form that calls an external API needs Content Hub Enterprise",
      },
    ),
  }),
  tile({
    id: "membership",
    label: "Memberships",
    group: "features",
    summary: "",
    baseHours: 0,
    disabled: true,
    perUnitHours: 4,
    includedInBase: 1,
    unit: "access groups",
    min: 1,
    max: 20,
    initial: 1,
    stepped: true,
    mark: "Pro",
    badge: "planned",
    note: "",
    rule: ladder(
      [
        {
          upTo: 2,
          edition: "professional",
          reason: "Memberships need Content Hub Professional",
        },
      ],
      {
        edition: "enterprise",
        reason: (qty) => `${qty} access groups need Content Hub Enterprise`,
      },
    ),
  }),
  tile({
    id: "languages",
    label: "Languages",
    group: "languages",
    summary:
      "One language is included. The second is 14h. Each language after that is 6h. That covers the language switcher, the domain setup, and translations for the templates and sections.",
    baseHours: 0,
    unit: "languages",
    min: 1,
    max: 60,
    initial: 1,
    stepped: true,
    rule: ladder([{ upTo: 50, edition: "starter", reason: "" }], {
      edition: "professional",
      reason: (qty) => `${qty} languages need Content Hub Professional`,
    }),
  }),
  tile({
    id: "redirects",
    label: "Additional redirects",
    group: "content",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "migrate-pages",
    label: "Page migration",
    group: "content",
    bucket: "content",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "migrate-posts",
    label: "Blog import",
    group: "content",
    bucket: "content",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "content-hours",
    label: "Content",
    group: "content",
    summary: "",
    baseHours: 0,
    perUnitHours: 1,
    unit: "hours",
    min: 0,
    max: 400,
    initial: 0,
    hourInput: true,
    bucket: "content",
    rule: starter,
  }),
];

const tileById = new Map<string, Tile>(tiles.map((item) => [item.id, item]));

export function getTile(id: string): Tile {
  const found = tileById.get(id);
  if (!found) throw new Error(`Unknown tile: ${id}`);
  return found;
}

const groupOrder: Partial<Record<GroupId, readonly string[]>> = {
  design: ["ai-design", "custom-design"],
  site: [
    "templates",
    "landing-templates",
    "sections",
    "menu",
    "header",
    "footer",
    "custom-forms",
    "search",
    "system",
    "setup",
  ],
  blog: [
    "blog-setups",
    "blog-list",
    "blog-post",
    "blog-list-count",
    "blog-post-count",
    "blog-recent",
  ],
  catalogue: [
    "product-catalogue",
    "catalogue-crm",
    "catalogue-objects",
    "favorite-products",
    "related-products",
  ],
  features: ["external-forms", "hubdb", "crm-section", "crm-custom-section", "membership"],
  content: ["content-hours", "migrate-pages", "migrate-posts", "redirects"],
};

export function tilesInGroup(group: GroupId): Tile[] {
  const items = tiles.filter((item) => item.group === group);
  const order = groupOrder[group];
  if (!order) return items;
  return order.flatMap((id) => {
    const found = items.find((item) => item.id === id);
    return found ? [found] : [];
  });
}

export function tileHours(item: Tile, qty: number): number {
  if (item.disabled) return 0;
  if (item.id === "languages") return languageHours(qty);
  if (item.id === "redirects") return redirectHours(qty);
  if (item.modes && item.modes.length > 0) {
    const index = Math.min(item.modes.length, Math.max(1, Math.round(qty))) - 1;
    return item.modes[index]?.hours ?? 0;
  }
  const units = Math.max(0, qty - item.includedInBase);
  return item.baseHours + item.perUnitHours * units;
}

export function languageHours(qty: number): number {
  if (qty <= 1) return 0;
  return 14 + 6 * (qty - 2);
}

export function redirectHours(count: number): number {
  if (count <= 0) return 0;
  const hundreds = Math.ceil(count / 100);
  return 4 + 2 * (hundreds - 1);
}

export function modeLabel(item: Tile, qty: number): string | undefined {
  if (!item.modes || item.modes.length === 0) return undefined;
  const index = Math.min(item.modes.length, Math.max(1, Math.round(qty))) - 1;
  return item.modes[index]?.label;
}

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

export type DesignPart = {
  id: string;
  label: string;
  qty: number;
  unit?: string;
  mode?: string;
  hours: number;
};

export type DesignInput = {
  templates: number;
  landing: number;
  sections: number;
  /** 0 off, 1 simple, 2 advanced. */
  menu: number;
  header: boolean;
  footer: boolean;
  customForms: boolean;
  /** 0 off, 1 simple, 2 advanced. */
  search: number;
  systemPages: boolean;
  setup: boolean;
  listTemplates: number;
  listAdvanced: boolean;
  postTemplates: number;
  postAdvanced: boolean;
  recentPosts: boolean;
  hubdb: number;
  /** 0 off, then module based, simple, filtered, multi-level. */
  catalogue: number;
  favoriteProducts: number;
  relatedProducts: boolean;
};

const catalogueDesignMode = ["", "Module based", "Simple", "Filtered", "Multi-level"] as const;

type DesignRates = {
  template: number;
  landing: number;
  section: number;
  menuSimple: number;
  menuAdvanced: number;
  header: number;
  footer: number;
  customForms: number;
  searchSimple: number;
  searchAdvanced: number;
  system: number;
  setup: number;
  blogListSimple: number;
  blogListAdvanced: number;
  blogPostSimple: number;
  blogPostAdvanced: number;
  recent: number;
  hubdb: number;
  catalogue: readonly [number, number, number, number, number];
  favorite: number;
  related: number;
};

const customDesignRates: DesignRates = {
  template: 2,
  landing: 2,
  section: 3,
  menuSimple: 2,
  menuAdvanced: 8,
  header: 2,
  footer: 3,
  customForms: 4,
  searchSimple: 3,
  searchAdvanced: 6,
  system: 5,
  setup: 4,
  blogListSimple: 4,
  blogListAdvanced: 6,
  blogPostSimple: 4,
  blogPostAdvanced: 6,
  recent: 3,
  hubdb: 3,
  catalogue: [0, 16, 10, 18, 28],
  favorite: 3,
  related: 3,
};

const aiDesignRates: DesignRates = {
  template: 1,
  landing: 1,
  section: 1,
  menuSimple: 1,
  menuAdvanced: 1,
  header: 1,
  footer: 1,
  customForms: 1,
  searchSimple: 1,
  searchAdvanced: 1,
  system: 1,
  setup: 4,
  blogListSimple: 2,
  blogListAdvanced: 2,
  blogPostSimple: 2,
  blogPostAdvanced: 2,
  recent: 1,
  hubdb: 1,
  catalogue: [0, 6, 4, 6, 10],
  favorite: 1,
  related: 1,
};

/** Two variants are the starting cost. Each variant after that adds half of that cost. */
export function aiDesignSets(variants: number): number {
  if (variants <= 0) return 0;
  return 1 + Math.max(0, variants - 2) * 0.5;
}

function designLines(
  input: DesignInput,
  rates: DesignRates,
  idPrefix: string,
  namePrefix: string,
): DesignPart[] {
  const menuAdvanced = input.menu >= 2;
  const searchAdvanced = input.search >= 2;
  const listRate = input.listAdvanced ? rates.blogListAdvanced : rates.blogListSimple;
  const postRate = input.postAdvanced ? rates.blogPostAdvanced : rates.blogPostSimple;
  const catalogueLevel = Math.min(rates.catalogue.length - 1, Math.max(0, input.catalogue));
  const catalogueMode = catalogueDesignMode[catalogueLevel] ?? "";
  const parts: DesignPart[] = [
    {
      id: `${idPrefix}templates`,
      label: `${namePrefix}Page template design`,
      qty: input.templates,
      unit: "templates",
      hours: rates.template * input.templates,
    },
    {
      id: `${idPrefix}landing`,
      label: `${namePrefix}Landing page design`,
      qty: input.landing,
      unit: "templates",
      hours: rates.landing * input.landing,
    },
    {
      id: `${idPrefix}sections`,
      label: `${namePrefix}Section design`,
      qty: input.sections,
      unit: "sections",
      hours: rates.section * input.sections,
    },
    {
      id: `${idPrefix}menu`,
      label: `${namePrefix}Menu design`,
      qty: 1,
      ...(rates.menuSimple === rates.menuAdvanced
        ? {}
        : { mode: menuAdvanced ? "Advanced" : "Simple" }),
      hours: input.menu === 0 ? 0 : menuAdvanced ? rates.menuAdvanced : rates.menuSimple,
    },
    {
      id: `${idPrefix}header`,
      label: `${namePrefix}Global header design`,
      qty: 1,
      hours: input.header ? rates.header : 0,
    },
    {
      id: `${idPrefix}footer`,
      label: `${namePrefix}Global footer design`,
      qty: 1,
      hours: input.footer ? rates.footer : 0,
    },
    {
      id: `${idPrefix}custom-forms`,
      label: `${namePrefix}Custom forms design`,
      qty: 1,
      hours: input.customForms ? rates.customForms : 0,
    },
    {
      id: `${idPrefix}search`,
      label: `${namePrefix}Search design`,
      qty: 1,
      ...(rates.searchSimple === rates.searchAdvanced
        ? {}
        : { mode: searchAdvanced ? "Advanced" : "Simple" }),
      hours: input.search === 0 ? 0 : searchAdvanced ? rates.searchAdvanced : rates.searchSimple,
    },
    {
      id: `${idPrefix}system`,
      label: `${namePrefix}Custom system templates design`,
      qty: 1,
      hours: input.systemPages ? rates.system : 0,
    },
    {
      id: `${idPrefix}setup`,
      label: `${namePrefix}Setup and launch design`,
      qty: 1,
      hours: input.setup ? rates.setup : 0,
    },
    {
      id: `${idPrefix}blog-list`,
      label: `${namePrefix}Blog list design`,
      qty: input.listTemplates,
      unit: "templates",
      ...(rates.blogListSimple === rates.blogListAdvanced
        ? {}
        : { mode: input.listAdvanced ? "Advanced" : "Simple" }),
      hours: input.listTemplates * listRate,
    },
    {
      id: `${idPrefix}blog-post`,
      label: `${namePrefix}Blog post design`,
      qty: input.postTemplates,
      unit: "templates",
      ...(rates.blogPostSimple === rates.blogPostAdvanced
        ? {}
        : { mode: input.postAdvanced ? "Advanced" : "Simple" }),
      hours: input.postTemplates * postRate,
    },
    {
      id: `${idPrefix}recent`,
      label: `${namePrefix}Recent blog posts design`,
      qty: 1,
      hours: input.recentPosts ? rates.recent : 0,
    },
    {
      id: `${idPrefix}hubdb`,
      label: `${namePrefix}HubDB section design`,
      qty: input.hubdb,
      unit: "modules",
      hours: rates.hubdb * input.hubdb,
    },
    {
      id: `${idPrefix}catalogue`,
      label: `${namePrefix}Product catalogue design`,
      qty: 1,
      ...(catalogueMode ? { mode: catalogueMode } : {}),
      hours: rates.catalogue[catalogueLevel] ?? 0,
    },
    {
      id: `${idPrefix}favorites`,
      label: `${namePrefix}Favorite products design`,
      qty: input.favoriteProducts,
      unit: "sections",
      hours: rates.favorite * input.favoriteProducts,
    },
    {
      id: `${idPrefix}related`,
      label: `${namePrefix}Related products design`,
      qty: 1,
      hours: input.relatedProducts ? rates.related : 0,
    },
  ];
  return parts.filter((part) => part.hours > 0);
}

/** Design hours. Charged only while Custom design is on. Build hours are separate. */
export function designParts(input: DesignInput): DesignPart[] {
  return designLines(input, customDesignRates, "design-", "");
}

/** AI design hours for one set, multiplied by the variant sets. */
export function aiDesignParts(input: DesignInput, sets: number): DesignPart[] {
  if (sets <= 0) return [];
  return designLines(input, aiDesignRates, "ai-", "AI ").map((part) => ({
    ...part,
    hours: part.hours * sets,
  }));
}

function assertCatalog(): void {
  const ids = new Set<string>();
  for (const item of tiles) {
    if (ids.has(item.id)) throw new Error(`Duplicate tile: ${item.id}`);
    ids.add(item.id);
    if (item.modes && item.max !== item.modes.length) {
      throw new Error(`${item.id} mode count does not match its max`);
    }
    if (item.initial < item.min || item.initial > item.max) {
      throw new Error(`${item.id} initial quantity is outside its range`);
    }
    if (item.stepped && !item.unit) throw new Error(`${item.id} has a stepper and no unit`);
    for (const req of item.requires) {
      if (!tileById.has(req)) throw new Error(`${item.id} requires unknown tile ${req}`);
    }
  }

  for (const parcel of parcels) {
    const included = new Set(parcel.items.map((item) => item.tileId));
    for (const item of parcel.items) {
      const piece = tileById.get(item.tileId);
      if (!piece) throw new Error(`${parcel.id} includes unknown tile ${item.tileId}`);
      if (item.min > item.max || item.qty < item.min || item.qty > item.max) {
        throw new Error(`${parcel.id} ${item.tileId} is outside its own band`);
      }
      if (item.qty < piece.min || item.qty > piece.max) {
        throw new Error(`${parcel.id} ${item.tileId} quantity ${item.qty} is outside the tile`);
      }
      for (const req of piece.requires) {
        if (!included.has(req)) {
          throw new Error(`${parcel.id} includes ${piece.id} without ${req}`);
        }
      }
    }
  }
}

assertCatalog();
