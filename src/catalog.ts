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
export const closingTileIds = ["setup", "launch"] as const;

/** These stay on. Their quantities and modes choose the package. */
export const alwaysOnTileIds = [
  "templates",
  "sections",
  "menu",
  "languages",
  "system",
  "header",
  "footer",
  "setup",
  "launch",
] as const;

export function isAlwaysOn(id: string): boolean {
  return alwaysOnTileIds.some((item) => item === id);
}

export const editionFacts: Record<Edition, readonly string[]> = {
  free: [
    "HubSpot branding stays on pages",
    "30 website pages and 30 landing pages",
    "One blog, up to 100 posts",
    "3 languages",
  ],
  starter: [
    "Branding removed from pages",
    "URL redirects and personalization tokens",
    "30 website pages and 30 landing pages",
    "One blog, up to 10,000 posts",
    "Up to 50 languages",
    "One root domain",
    "CTAs: banner, pop-up box, slide-in, embedded, embedded image",
  ],
  professional: [
    "Everything in Starter, with 10,000 website and landing pages",
    "Up to 100 blogs",
    "HubDB, dynamic pages, and smart content",
    "Memberships, up to 2 access groups",
    "HubSpot Video with advanced features, up to 150 videos",
    "Brand voice and content remix",
    "Unlimited languages",
    "One root domain",
  ],
  enterprise: [
    "Everything in Professional",
    "Up to 10 root domains",
    "Serverless functions and custom objects",
    "Up to 100 access groups",
    "HubSpot Video advanced features for up to 500 videos",
  ],
};

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
  | "events"
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
  { id: "events", label: "", layout: "wide" },
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
    label: "AI generated",
    group: "design",
    summary: "Under development.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "custom-design",
    label: "Custom design",
    group: "design",
    summary:
      "On by default in every package. Design hours are charged only while this is on. Build hours stay the same.",
    baseHours: 0,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "templates",
    label: "Page templates",
    group: "site",
    summary: "2h each to build. 1–3 keeps Essential. 4 or more needs Growth.",
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
      "A hero, cards, a quote, an FAQ, and the rest. 3h each to build. 1–10 keeps Essential. 11 or more needs Growth.",
    baseHours: 0,
    perUnitHours: 3,
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
    summary:
      "Off until you add them. 2h each to build. 1–2 keeps Essential. 3 or more needs Growth.",
    baseHours: 0,
    perUnitHours: 2,
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
    summary:
      "Included with the blog. Simple is 4h. Advanced is 8h and adds related posts and other advanced HubSpot blog features. Advanced needs Growth.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4 },
      { label: "Advanced", hours: 8 },
    ],
    rule: starter,
  }),
  tile({
    id: "blog-post",
    label: "Post template",
    group: "blog",
    summary:
      "Included with the blog. Simple is 4h. Advanced is 8h and adds related posts and other advanced HubSpot blog features. Advanced needs Growth.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4 },
      { label: "Advanced", hours: 8 },
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
    summary:
      "Off until you add it. The blog itself has no hours. One blog keeps Essential. Two or more needs Growth. Turning this off also turns off the templates and recent posts.",
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
    summary:
      "Off until you add it, and only while the blog is on. Simple lists the latest posts. Advanced can match by tag. Both are 4h to build. Advanced needs Growth.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4 },
      { label: "Advanced", hours: 4 },
    ],
    rule: starter,
  }),
  tile({
    id: "search",
    label: "Search",
    group: "site",
    summary:
      "Off until you add it. Simple is the search results template, 4h. Advanced adds filters and grouped results, 10h, and needs Growth.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4 },
      { label: "Advanced", hours: 10 },
    ],
    rule: starter,
  }),
  tile({
    id: "menu",
    label: "Menu",
    group: "site",
    summary:
      "Simple is a standard header menu, 2h, and keeps Essential. Advanced is a mega menu, 14h, and needs Growth.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 2 },
      { label: "Advanced", hours: 14 },
    ],
    rule: starter,
  }),
  tile({
    id: "system",
    label: "System pages",
    group: "site",
    summary:
      "404 and 500 error pages, the subscription page, the backup unsubscribe page, and the subscriptions update page. 2h.",
    baseHours: 2,
    rule: starter,
  }),
  tile({
    id: "header",
    label: "Global site header",
    group: "site",
    summary: "The theme header: logo, navigation slot, and announcement. 3h.",
    baseHours: 3,
    rule: starter,
  }),
  tile({
    id: "footer",
    label: "Global site footer",
    group: "site",
    summary: "The theme footer: links, contact, and legal. 4h.",
    baseHours: 4,
    rule: starter,
  }),
  tile({
    id: "setup",
    label: "Initial setup",
    group: "site",
    summary: "Kickoff, accounts, and the first deploy.",
    baseHours: 6,
    rule: starter,
  }),
  tile({
    id: "launch",
    label: "Launch",
    group: "site",
    summary:
      "Go-live checks and the handover. Includes the DNS change that points the domain at HubSpot.",
    baseHours: 6,
    rule: starter,
  }),
  tile({
    id: "hubdb",
    label: "HubDB based section",
    group: "features",
    summary:
      "Off until you add it. A HubDB-backed section, 10h each. A resource library, a directory, or a filterable list that is not a full catalogue. Needs Growth, and Content Hub Professional.",
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
    label: "CRM object based section",
    group: "features",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "crm-custom-section",
    label: "CRM custom object based section",
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
        hours: 28,
        detail:
          "A module shows one product and several levels of subproducts. There is no listing page and no dynamic pages. It suits a few main products with many subproducts.",
      },
      {
        label: "Simple",
        hours: 16,
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
        hours: 48,
        group: "Dynamic pages",
        detail:
          "The filtered catalogue, plus an SEO-friendly page for each category. Each category page has filters, sorting, and breadcrumbs, and each product has a detail page.",
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
    summary:
      "A favorite-products section on a static page. 6h each. Several are allowed. Off until the catalogue is on.",
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
    summary: "Related products on the product detail page. 6h. Off until the catalogue is on.",
    baseHours: 6,
    rule: starter,
  }),
  tile({
    id: "event-catalogue",
    label: "Event catalogue",
    group: "events",
    summary: "",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "forms",
    label: "Form",
    group: "site",
    summary: "A standard HubSpot form, with HubSpot's own styling. 1h each.",
    baseHours: 0,
    perUnitHours: 1,
    unit: "forms",
    min: 1,
    max: 20,
    initial: 2,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "custom-forms",
    label: "Custom forms",
    group: "features",
    summary:
      "Off until you add it. Needs Growth. The same HubSpot form, restyled to the brand. The first is 6h, then 2h each.",
    baseHours: 6,
    perUnitHours: 2,
    includedInBase: 1,
    unit: "forms",
    min: 1,
    max: 10,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "external-forms",
    label: "Forms with external data",
    group: "features",
    summary:
      "A custom form filled from HubDB, or from an external API through a serverless function. Not in the build yet.",
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
    id: "ctas",
    label: "CTAs",
    group: "site",
    summary:
      "HubSpot CTAs: a sticky banner, a pop-up box, a slide-in, an embedded button or banner, or an embedded image. 1h each. Any package.",
    baseHours: 0,
    perUnitHours: 1,
    unit: "CTAs",
    min: 1,
    max: 20,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "membership",
    label: "Memberships",
    group: "features",
    summary:
      "Login, registration, reset, and access denied, plus each access group. Not in the build yet.",
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
    note: "Content Hub Professional includes 2 access groups. Enterprise includes 100.",
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
      "One language is included. The second is 20h. Each language after that is 5h. That covers the language switcher, the domain setup, and translations for the templates and sections. Starter allows 50. Professional is unlimited.",
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
    "sections",
    "menu",
    "header",
    "footer",
    "system",
    "forms",
    "ctas",
    "search",
    "landing-templates",
    "setup",
    "launch",
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
  features: [
    "custom-forms",
    "external-forms",
    "hubdb",
    "crm-section",
    "crm-custom-section",
    "membership",
  ],
  events: ["event-catalogue"],
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
  return 20 + 5 * (qty - 2);
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
      "A smaller website: up to 3 page templates, 10 sections, one language, a simple menu, and one blog.",
    usualEdition: "starter",
    maxExtras: 0,
    items: [],
  },
  {
    id: "growth",
    label: packageName.growth,
    customer:
      "A larger website: more templates, sections, or languages, or an advanced menu, search, or blog.",
    usualEdition: "professional",
    maxExtras: 0,
    items: [],
  },
  {
    id: "platform",
    label: packageName.platform,
    customer:
      "The website plus a product catalogue, with a product list and a page for each product.",
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
  hours: number;
};

export type DesignInput = {
  templates: number;
  landing: number;
  sections: number;
  listTemplates: number;
  listAdvanced: boolean;
  postTemplates: number;
  postAdvanced: boolean;
  recentPosts: boolean;
};

/** Design hours. Charged only while Custom design is on. Build hours are separate. */
export function designParts(input: DesignInput): DesignPart[] {
  const parts: DesignPart[] = [
    { id: "design-base", label: "Design base", qty: 1, hours: 4 },
    {
      id: "design-templates",
      label: "Page template design",
      qty: input.templates,
      unit: "templates",
      hours: 3 * input.templates,
    },
    {
      id: "design-landing",
      label: "Landing page design",
      qty: input.landing,
      unit: "templates",
      hours: 3 * input.landing,
    },
    {
      id: "design-sections",
      label: "Section design",
      qty: input.sections,
      unit: "sections",
      hours: 4 * input.sections,
    },
    {
      id: "design-blog-list",
      label: "Blog list design",
      qty: input.listTemplates,
      unit: "templates",
      hours: input.listTemplates * (input.listAdvanced ? 6 : 4),
    },
    {
      id: "design-blog-post",
      label: "Blog post design",
      qty: input.postTemplates,
      unit: "templates",
      hours: input.postTemplates * (input.postAdvanced ? 6 : 4),
    },
    {
      id: "design-recent",
      label: "Recent blog posts design",
      qty: 1,
      hours: input.recentPosts ? 4 : 0,
    },
  ];
  return parts.filter((part) => part.hours > 0);
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
