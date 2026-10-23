/**
 * Guide hours. Replace them before a real proposal.
 *
 * Lite on the CMS React foundation (56h) with 2 templates, 8 sections,
 * a simple blog list, a blog post, recent posts, a simple menu, header, footer,
 * system pages, and a 12h initial setup is 76h of pieces.
 * 56 + 76 = 132 open hours. Lite is 50% off, so the build is 66h.
 *
 * Website pages are not build hours. More than 30 needs Professional.
 * The count starts at 25.
 */

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

/** Attached to every package type. */
export const setupHours = 12;

export const setupNote = "initial setup. Kickoff, accounts, and the first deploy.";

export const editionFacts: Record<Edition, readonly string[]> = {
  free: [
    "HubSpot branding stays on pages",
    "30 website pages and 30 landing pages",
    "One blog, up to 100 posts",
    "3 languages",
  ],
  starter: [
    "Branding removed from pages",
    "Marketing Hub does not remove that branding",
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
    hours: 56,
    detail: "Theme, modules, fields, deploy, and handover on a HubSpot Projects theme.",
  },
];

export type GroupId =
  | "design"
  | "site"
  | "languages"
  | "features"
  | "account"
  | "service"
  | "launch"
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
  { id: "languages", label: "Languages", layout: "wide" },
  { id: "features", label: "Extra features", layout: "tiles" },
  {
    id: "account",
    label: "Account add-ons",
    layout: "tiles",
    note: "Separate from the page build. These can raise the HubSpot tier.",
  },
  { id: "service", label: "Service", layout: "tiles" },
  { id: "launch", label: "Launch", layout: "tiles" },
  { id: "content", label: "Content work", layout: "three" },
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
  new: "New",
  planned: "In development",
};

export type TileMode = { label: string; hours: number };

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
    summary: "A first design pass from the brand notes. 20h. Choosing this clears Custom design.",
    baseHours: 20,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "custom-design",
    label: "Custom design",
    group: "design",
    summary:
      "A designed set of pages before the build. 30h. Choosing this clears AI generated design.",
    baseHours: 30,
    bucket: "design",
    rule: starter,
  }),
  tile({
    id: "templates",
    label: "Page templates",
    group: "site",
    summary: "Page templates to build. 3h each. Lite holds 2–4, Growth 4–6, Platform 4–12.",
    baseHours: 0,
    perUnitHours: 3,
    unit: "templates",
    min: 1,
    max: 20,
    initial: 2,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "sections",
    label: "Sections",
    group: "site",
    summary:
      "Sections to design and build, including things like a hero, cards, a quote, or an FAQ. 3h each. Lite holds 8–12, Growth 8–18, Platform 8–22.",
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
    label: "Landing page templates",
    group: "site",
    summary: "Landing templates to build. None in the packages. 3h each, up to 10.",
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
    group: "site",
    summary: "Simple is a post list. Advanced adds filters, featured posts, and a richer layout.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4 },
      { label: "Advanced", hours: 10 },
    ],
    rule: starter,
  }),
  tile({
    id: "blog-post",
    label: "Post template",
    group: "site",
    summary: "The template for one blog post.",
    baseHours: 4,
    rule: starter,
  }),
  tile({
    id: "blog-setups",
    label: "Blogs",
    group: "site",
    summary:
      "One blog is included in Lite, with its list template and its post template. Each extra blog is 2h, and can reuse those templates or get its own.",
    baseHours: 0,
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
    group: "site",
    summary:
      "Simple shows the latest posts. Advanced matches recent posts by tag and can be a carousel.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 6 },
      { label: "Advanced", hours: 12 },
    ],
    rule: starter,
  }),
  tile({
    id: "search",
    label: "Search",
    group: "site",
    summary: "Simple is the search results template. Advanced adds filters and grouped results.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 6 },
      { label: "Advanced", hours: 14 },
    ],
    rule: starter,
  }),
  tile({
    id: "menu",
    label: "Menu",
    group: "site",
    summary: "Simple is a standard header menu. Advanced is a mega menu.",
    baseHours: 0,
    modes: [
      { label: "Simple", hours: 4 },
      { label: "Advanced", hours: 12 },
    ],
    rule: starter,
  }),
  tile({
    id: "system",
    label: "System pages",
    group: "site",
    summary: "404, 500, subscriptions, and the password prompt.",
    baseHours: 2,
    rule: starter,
  }),
  tile({
    id: "header",
    label: "Global header",
    group: "site",
    summary: "The theme header: logo, navigation slot, and announcement. Placeholder hours.",
    baseHours: 8,
    rule: starter,
  }),
  tile({
    id: "footer",
    label: "Global footer",
    group: "site",
    summary: "The theme footer: links, contact, and legal. Placeholder hours.",
    baseHours: 6,
    rule: starter,
  }),
  tile({
    id: "setup",
    label: "Initial setup",
    group: "site",
    summary: setupNote,
    baseHours: setupHours,
    rule: starter,
  }),
  tile({
    id: "video",
    label: "Video",
    group: "features",
    summary:
      "File is a decorative mp4 from the file manager and plays on any tier. YouTube is an embed, also any tier. HubSpot Video, with tracking, captions, and an in-player form or CTA, starts on Professional (150 videos, 500 on Enterprise).",
    baseHours: 0,
    modes: [
      { label: "File", hours: 4 },
      { label: "YouTube", hours: 3 },
      { label: "HubSpot Video", hours: 8 },
    ],
    rule: ladder([{ upTo: 2, edition: "starter", reason: "" }], {
      edition: "professional",
      reason: () => "HubSpot Video needs Content Hub Professional",
    }),
  }),
  tile({
    id: "hubdb",
    label: "HubDB module",
    group: "features",
    summary:
      "One HubDB-backed module. Use it for a resource library, a team or office directory, or a filterable list that is not a full catalogue.",
    baseHours: 12,
    mark: "Pro",
    rule: fixed("professional", "HubDB needs Content Hub Professional"),
  }),
  tile({
    id: "product-catalogue",
    label: "Product catalogue",
    group: "features",
    summary:
      "HubDB product catalogue. Basic is listing and detail. Filtered adds facets. Multi-level adds categories.",
    baseHours: 0,
    modes: [
      { label: "Basic", hours: 16 },
      { label: "Filtered", hours: 28 },
      { label: "Multi-level", hours: 40 },
    ],
    mark: "Pro",
    badge: "new",
    requires: ["hubdb"],
    rule: fixed("professional", "A product catalogue on HubDB needs Content Hub Professional"),
  }),
  tile({
    id: "event-catalogue",
    label: "Event catalogue",
    group: "features",
    summary: "HubDB event listing and event page. Not in the build yet.",
    baseHours: 0,
    disabled: true,
    mark: "Pro",
    badge: "planned",
    requires: ["hubdb"],
    rule: fixed("professional", "An event catalogue on HubDB needs Content Hub Professional"),
  }),
  tile({
    id: "forms",
    label: "Forms",
    group: "features",
    summary: "A standard HubSpot form, with HubSpot's own styling. 3h each.",
    baseHours: 0,
    perUnitHours: 3,
    unit: "forms",
    min: 1,
    max: 20,
    initial: 1,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "custom-forms",
    label: "Custom forms",
    group: "features",
    summary:
      "The same HubSpot form, restyled to the brand type, colours, and buttons. The first is 8h, then 4h each.",
    baseHours: 8,
    perUnitHours: 4,
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
    group: "features",
    summary:
      "HubSpot CTAs: a sticky banner, a pop-up box, a slide-in, an embedded button or banner, or an embedded image. 3h each. Available from Content Hub Starter.",
    baseHours: 0,
    perUnitHours: 3,
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
    mark: "50+",
    rule: ladder([{ upTo: 50, edition: "starter", reason: "" }], {
      edition: "professional",
      reason: (qty) => `${qty} languages need Content Hub Professional`,
    }),
  }),
  tile({
    id: "domains",
    label: "Extra root domains",
    group: "account",
    summary: "Each root domain beyond the first. 5h each. Enterprise allows up to 10.",
    baseHours: 0,
    perUnitHours: 5,
    unit: "extra domains",
    min: 1,
    max: 9,
    initial: 1,
    stepped: true,
    mark: "Ent",
    rule: fixed("enterprise", "A second root domain needs Content Hub Enterprise"),
  }),
  tile({
    id: "serverless",
    label: "Serverless functions",
    group: "account",
    summary: "CMS serverless functions. Enter the hours for this account. None until you set them.",
    baseHours: 0,
    perUnitHours: 1,
    unit: "hours",
    min: 0,
    max: 400,
    initial: 0,
    hourInput: true,
    mark: "Ent",
    rule: fixed("enterprise", "Serverless functions need Content Hub Enterprise"),
  }),
  tile({
    id: "custom-objects",
    label: "Custom objects",
    group: "account",
    summary:
      "Custom object definitions used by the site. Enter the hours. None until you set them.",
    baseHours: 0,
    perUnitHours: 1,
    unit: "hours",
    min: 0,
    max: 400,
    initial: 0,
    hourInput: true,
    mark: "Ent",
    rule: fixed("enterprise", "Custom objects need Content Hub Enterprise"),
  }),
  tile({
    id: "private-app",
    label: "Private app and webhooks",
    group: "account",
    summary:
      "A private app and its webhooks. They work on every tier. The cap follows the account's highest hub: Starter is 100 calls per 10 seconds and 250,000 a day, Professional is 190 and 625,000, Enterprise is 190 and 1,000,000. Up to 20 private apps, and 1,000 webhook subscriptions on each. A workflow webhook that sends contact data needs Marketing Hub Enterprise. Enter the hours. None until you set them.",
    baseHours: 0,
    perUnitHours: 1,
    unit: "hours",
    min: 0,
    max: 400,
    initial: 0,
    hourInput: true,
    rule: starter,
  }),
  tile({
    id: "meetings",
    label: "Meetings",
    group: "features",
    summary: "A meetings link on the site.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    hub: { id: "sales", edition: "starter", detail: "Meetings" },
    rule: starter,
  }),
  tile({
    id: "kb",
    label: "Knowledge base",
    group: "service",
    summary: "Knowledge base theme.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    mark: "Service",
    hub: { id: "service", edition: "professional", detail: "Knowledge base" },
    rule: starter,
  }),
  tile({
    id: "portal",
    label: "Customer portal",
    group: "service",
    summary: "Customer portal theme.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    mark: "Service",
    hub: { id: "service", edition: "professional", detail: "Customer portal" },
    rule: starter,
  }),
  tile({
    id: "redirects",
    label: "Redirects",
    group: "launch",
    summary:
      "Redirects for domains HubSpot hosts, from the customer's URL list. The first 100 are 6h. Each further 100 is 2h. The old host still needs its own rules.",
    baseHours: 0,
    unit: "redirects",
    min: 100,
    max: 5000,
    initial: 100,
    step: 100,
    stepped: true,
    rule: starter,
  }),
  tile({
    id: "migrate-pages",
    label: "Page migration",
    group: "content",
    bucket: "content",
    summary: "Rebuild pages from the current site.",
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
    summary: "Import blog posts into the new templates.",
    baseHours: 0,
    disabled: true,
    badge: "planned",
    rule: starter,
  }),
  tile({
    id: "content-hours",
    label: "Content",
    group: "content",
    summary: "Hours to write and enter the page and blog content. None until you set them.",
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
    "blog-list",
    "blog-post",
    "blog-setups",
    "blog-recent",
    "search",
    "header",
    "footer",
    "system",
  ],
  features: [
    "forms",
    "custom-forms",
    "external-forms",
    "ctas",
    "hubdb",
    "product-catalogue",
    "event-catalogue",
    "membership",
    "meetings",
    "video",
  ],
  content: ["content-hours", "migrate-pages", "migrate-posts"],
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
  return 6 + 2 * (hundreds - 1);
}

export function blogSetupHours(
  qty: number,
  mode: BlogSetupMode,
  listHours: number,
  postHours: number,
): number {
  const extra = Math.max(0, qty - 1);
  if (extra === 0) return 0;
  const added =
    mode === "list"
      ? listHours
      : mode === "post"
        ? postHours
        : mode === "both"
          ? listHours + postHours
          : 0;
  return extra * (2 + added);
}

export function modeLabel(item: Tile, qty: number): string | undefined {
  if (!item.modes || item.modes.length === 0) return undefined;
  const index = Math.min(item.modes.length, Math.max(1, Math.round(qty))) - 1;
  return item.modes[index]?.label;
}

export type ShapeId = "lite" | "growth" | "platform" | "custom";

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
  blurb: string;
  discount: number;
  usualEdition: Edition;
  maxExtras: number;
  items: readonly ParcelItem[];
};

function fixedItem(tileId: string, qty: number, min = qty, max = qty): ParcelItem {
  return { tileId, qty, min, max };
}

const liteItems: readonly ParcelItem[] = [
  fixedItem("templates", 2, 2, 4),
  fixedItem("sections", 8, 8, 12),
  fixedItem("blog-list", 1, 1, 2),
  fixedItem("blog-post", 1),
  fixedItem("blog-setups", 1, 1, 1),
  fixedItem("blog-recent", 1, 1, 1),
  fixedItem("menu", 1, 1, 2),
  fixedItem("header", 1),
  fixedItem("footer", 1),
  fixedItem("system", 1),
  fixedItem("setup", 1),
  fixedItem("languages", 1, 1, 60),
];

const growthItems: readonly ParcelItem[] = [
  fixedItem("templates", 4, 4, 6),
  fixedItem("sections", 8, 8, 18),
  fixedItem("blog-list", 2, 1, 2),
  fixedItem("blog-post", 1),
  fixedItem("blog-setups", 1, 1, 100),
  fixedItem("blog-recent", 1, 1, 2),
  fixedItem("menu", 2, 1, 2),
  fixedItem("search", 2, 1, 2),
  fixedItem("header", 1),
  fixedItem("footer", 1),
  fixedItem("system", 1),
  fixedItem("setup", 1),
  fixedItem("hubdb", 1),
  fixedItem("forms", 1, 1, 20),
  fixedItem("languages", 1, 1, 60),
];

const platformItems: readonly ParcelItem[] = [
  fixedItem("templates", 4, 4, 12),
  fixedItem("sections", 8, 8, 22),
  fixedItem("blog-list", 2, 1, 2),
  fixedItem("blog-post", 1),
  fixedItem("blog-setups", 1, 1, 100),
  fixedItem("blog-recent", 2, 1, 2),
  fixedItem("menu", 2, 1, 2),
  fixedItem("search", 2, 1, 2),
  fixedItem("header", 1),
  fixedItem("footer", 1),
  fixedItem("system", 1),
  fixedItem("setup", 1),
  fixedItem("hubdb", 1),
  fixedItem("product-catalogue", 2, 1, 3),
  fixedItem("forms", 1, 1, 20),
  fixedItem("languages", 1, 1, 60),
];

export const parcels: readonly Parcel[] = [
  {
    id: "lite",
    label: "Lite",
    blurb: "One blog, with the list and post templates.",
    discount: 0.5,
    usualEdition: "starter",
    maxExtras: 1,
    items: liteItems,
  },
  {
    id: "growth",
    label: "Growth",
    blurb: "More templates, an advanced blog, and a HubDB module.",
    discount: 0.35,
    usualEdition: "professional",
    maxExtras: 3,
    items: growthItems,
  },
  {
    id: "platform",
    label: "Platform",
    blurb: "A product catalogue and the wider build.",
    discount: 0.2,
    usualEdition: "professional",
    maxExtras: 4,
    items: platformItems,
  },
];

export type ShapeChoice = {
  id: ShapeId;
  label: string;
  discountLabel: string;
  blurb: string;
  extraLabel: string;
  usualEdition: Edition | null;
};

function extraLabel(count: number): string {
  return count === 1 ? "1 extra option" : `${count} extra options`;
}

export const shapeChoices: readonly ShapeChoice[] = [
  ...parcels.map((parcel) => ({
    id: parcel.id,
    label: parcel.label,
    discountLabel: `${Math.round(parcel.discount * 100)}% off`,
    blurb: parcel.blurb,
    extraLabel: extraLabel(parcel.maxExtras),
    usualEdition: parcel.usualEdition,
  })),
  {
    id: "custom",
    label: "Custom",
    discountLabel: "Item price",
    blurb: "Each piece on its own, without the package rate.",
    extraLabel: "No package cap",
    usualEdition: null,
  },
];

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
