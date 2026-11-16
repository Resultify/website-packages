/**
 * Hours come only from the selected items.
 * The package is the lowest tier that covers every selected option.
 * Design hours stay separate from build hours.
 * Website pages are not build hours. Past a number of them, the tier goes up.
 * Every number comes from the files in src/ (estimator.csv, rules.csv), through catalog.ts.
 * Build hours depend on the design choice: AI generated, Custom, or none.
 */

import {
  type Amount,
  aiVariantHours,
  alwaysOnTileIds,
  basicsTileIds,
  type Choice,
  defaultWebsitePages,
  designParts,
  type Edition,
  editionLabel,
  editionRank,
  getParcel,
  getStartingPoint,
  getTile,
  groups,
  type HourBucket,
  type HubId,
  hubName,
  isAlwaysOn,
  modeLabel,
  type PackageId,
  type PackageRule,
  type Parcel,
  pageEdition,
  pageLimits,
  packageRules,
  type ShapeId,
  type StartingPoint,
  type StartingPointId,
  type StepId,
  starterPageCap,
  type Tile,
  tileByCode,
  tileHours,
  tiles,
  tilesInGroup,
} from "./catalog.ts";
import { codeIn, packLink, unpackLink } from "./link.ts";

export type { Choice, PackageRule };
export { packageRules };

export type Selection = {
  startingPoint: StartingPointId;
  /** Published website pages. More than 30 needs Content Hub Professional. */
  websitePages: number;
  /** Selected tiles. The number is the quantity, the mode index, or entered hours. */
  tiles: Record<string, number>;
};

export type HourLine = {
  id: string;
  label: string;
  qty: number;
  unit?: string;
  mode?: string;
  openHours: number;
  billedHours: number;
  extra: boolean;
  bucket: HourBucket;
};

export type HubBadge = {
  id: HubId;
  edition: Edition;
  title: string;
  details: string[];
};

export type MissingPiece = {
  tileId: string;
  label: string;
  have: number;
  need: number;
};

export type TrimPiece = {
  tileId: string;
  label: string;
};

export type RestoreHint = {
  shape: Exclude<ShapeId, "custom">;
  label: string;
  missing: MissingPiece[];
  trim: TrimPiece[];
  savedHours: number;
};

export type PageSpeed = {
  mobile: number;
  desktop: number;
  accessibility: number;
  seo: number;
  security: number;
  notes: string[];
};

export type Quote = {
  selection: Selection;
  startingPoint: StartingPoint;
  shape: ShapeId;
  label: string;
  parcel: Parcel | null;
  extraTileIds: string[];
  extraCount: number;
  foundationHours: number;
  openHours: number;
  hours: number;
  savedHours: number;
  designHours: number;
  implementationHours: number;
  implementationOpenHours: number;
  packageOpenHours: number;
  packageHours: number;
  contentHours: number;
  packageReasons: string[];
  edition: Edition;
  editionReasons: string[];
  usualEditionWarning: string | null;
  hubs: HubBadge[];
  lines: HourLine[];
  restore: RestoreHint | null;
  pageSpeed: PageSpeed;
};

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatHours(hours: number): string {
  return roundHours(hours)
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

function clampQuantity(qty: number, min: number, max: number): number {
  const rounded = Math.round(qty);
  if (!Number.isFinite(rounded)) return min;
  return Math.min(max, Math.max(min, rounded));
}

/** Feedback rounds are charged past the included ones, on a line of their own. */
const feedbackIds = ["design-feedback", "ai-feedback"] as const;

/** How much of a task is in the estimate, for its design hours. */
function amountOf(selection: Selection): (item: Tile) => Amount | undefined {
  return (item) => {
    const qty = selection.tiles[item.id];
    return qty === undefined ? undefined : { qty };
  };
}

/** The estimate's design choice, which picks the build hours of every item. */
export function choiceOf(selection: Selection): Choice {
  if (selection.tiles["ai-design"] !== undefined) return "ai";
  if (selection.tiles["custom-design"] !== undefined) return "custom";
  return "none";
}

function hoursFor(item: Tile, qty: number, selection: Selection): number {
  if (item.group === "design") return 0;
  return tileHours(item, qty, choiceOf(selection));
}

/** Related products do not go with the catalogue's Module based option. */
export function isModuleBased(level: number | undefined): boolean {
  return level !== undefined && modeLabel(getTile("product-catalogue"), level) === "Module based";
}

/** The catalogue mode whose hours are entered, counted from 1. 0 when it has none. */
function customCatalogueLevel(): number {
  return (getTile("product-catalogue").modes ?? []).findIndex((mode) => mode.customHours) + 1;
}

export function normalize(selection: Selection): Selection {
  const next: Record<string, number> = {};
  for (const [id, qty] of Object.entries(selection.tiles)) {
    if (!Number.isFinite(qty)) continue;
    let piece: ReturnType<typeof getTile>;
    try {
      piece = getTile(id);
    } catch {
      continue;
    }
    if (piece.disabled || piece.hidden) continue;
    let level = clampQuantity(qty, piece.min, piece.max);
    /* An option that is coming soon cannot be chosen: the item takes the one it starts with */
    if (piece.modes?.[level - 1]?.disabled) level = piece.initial;
    next[id] = level;
  }

  let grew = true;
  while (grew) {
    grew = false;
    for (const id of Object.keys(next)) {
      for (const req of getTile(id).requires) {
        if (next[req] !== undefined) continue;
        next[req] = getTile(req).initial;
        grew = true;
      }
    }
    const external = next["external-forms"];
    if (external === 1 && next.hubdb === undefined) {
      next.hubdb = getTile("hubdb").initial;
      grew = true;
    }
  }

  if (next["blog-setups"] !== undefined) {
    if (next["blog-list"] === undefined) next["blog-list"] = 1;
    if (next["blog-post"] === undefined) next["blog-post"] = 1;
  } else {
    delete next["blog-list"];
    delete next["blog-post"];
    delete next["blog-recent"];
  }
  if (next["ai-design"] !== undefined && next["custom-design"] !== undefined) {
    delete next["custom-design"];
    delete next["design-feedback"];
  }
  if (next["ai-design"] !== undefined) {
    if (next["ai-feedback"] === undefined) next["ai-feedback"] = getTile("ai-feedback").initial;
  } else {
    delete next["ai-feedback"];
  }
  if (next["custom-design"] !== undefined) {
    if (next["design-feedback"] === undefined) {
      next["design-feedback"] = getTile("design-feedback").initial;
    }
  } else {
    delete next["design-feedback"];
  }
  if (next["product-catalogue"] !== customCatalogueLevel()) delete next["catalogue-custom"];
  else if (next["catalogue-custom"] === undefined) {
    next["catalogue-custom"] = getTile("catalogue-custom").initial;
  }
  if (next["product-catalogue"] === undefined) {
    delete next["favorite-products"];
    delete next["related-products"];
  } else if (isModuleBased(next["product-catalogue"])) {
    delete next["related-products"];
  }
  for (const id of alwaysOnTileIds) {
    if (next[id] === undefined) next[id] = getTile(id).initial;
  }

  return {
    startingPoint: selection.startingPoint,
    websitePages: clampQuantity(
      selection.websitePages ?? defaultWebsitePages,
      pageLimits().min,
      pageLimits().max,
    ),
    tiles: next,
  };
}

function dependentsOf(rootId: string, selected: Record<string, number>): Set<string> {
  const remove = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of tiles) {
      if (remove.has(item.id)) continue;
      if (item.requires.some((req) => remove.has(req))) {
        remove.add(item.id);
        grew = true;
      }
    }
  }
  if (rootId === "hubdb" && selected["external-forms"] === 1) remove.add("external-forms");
  return remove;
}

const childTileIds = ["blog-list", "blog-post"] as const;

export function setTile(selection: Selection, tileId: string, on: boolean): Selection {
  const piece = getTile(tileId);
  if (piece.disabled) return selection;
  if (!on && (isAlwaysOn(tileId) || childTileIds.some((id) => id === tileId))) return selection;
  if (on && tileId === "blog-recent" && selection.tiles["blog-setups"] === undefined) {
    return selection;
  }
  if (
    on &&
    (tileId === "favorite-products" || tileId === "related-products") &&
    selection.tiles["product-catalogue"] === undefined
  ) {
    return selection;
  }
  if (on && tileId === "related-products" && isModuleBased(selection.tiles["product-catalogue"])) {
    return selection;
  }
  const next = { ...selection.tiles };
  if (on) {
    next[tileId] = piece.initial;
    if (tileId === "ai-design") {
      delete next["custom-design"];
      delete next["design-feedback"];
    }
    if (tileId === "custom-design") {
      delete next["ai-design"];
      delete next["ai-feedback"];
    }
    return normalize({ ...selection, tiles: next });
  }
  for (const id of dependentsOf(tileId, selection.tiles)) delete next[id];
  if (tileId === "blog-setups") {
    delete next["blog-list"];
    delete next["blog-post"];
    delete next["blog-recent"];
  }
  if (tileId === "product-catalogue") {
    delete next["favorite-products"];
    delete next["related-products"];
  }
  return normalize({ ...selection, tiles: next });
}

export function setQuantity(selection: Selection, tileId: string, qty: number): Selection {
  const piece = getTile(tileId);
  if (piece.disabled) return selection;
  if (qty < piece.min) {
    if (isAlwaysOn(tileId) || childTileIds.some((id) => id === tileId)) return selection;
    return setTile(selection, tileId, false);
  }
  return normalize({
    ...selection,
    tiles: { ...selection.tiles, [tileId]: qty },
  });
}

/** Quantity changes apply immediately. The package is derived again from the whole set. */
export function stepQuantity(selection: Selection, tileId: string, qty: number): Selection {
  return setQuantity(selection, tileId, qty);
}

export function setWebsitePages(selection: Selection, websitePages: number): Selection {
  return normalize({ ...selection, websitePages });
}

export function selectionForShape(_shape: ShapeId, websitePages = defaultWebsitePages): Selection {
  return normalize({
    startingPoint: "cms-react",
    websitePages,
    /* What is always in, and AI design, each at the quantity the table starts it with */
    tiles: Object.fromEntries(
      [...alwaysOnTileIds, "ai-design", "ai-feedback"].map((id) => [id, getTile(id).initial]),
    ),
  });
}

const packageRank = { essential: 0, growth: 1, platform: 2 } as const;

function raisePackage(current: PackageId, next: PackageId): PackageId {
  return packageRank[next] > packageRank[current] ? next : current;
}

/** The rules are the table's package cells: "growth@5" on a task, "growth" on a mode. */
function matchedRules(selection: Selection): PackageRule[] {
  return packageRules.filter((rule) => {
    const qty = selection.tiles[rule.tileId];
    if (qty === undefined) return false;
    return rule.exact ? qty === rule.at : qty >= rule.at;
  });
}

/** Lowest package that satisfies every selected option. The highest need wins. */
export function packageFor(selection: Selection): PackageId {
  return matchedRules(selection).reduce<PackageId>(
    (pack, rule) => raisePackage(pack, rule.package),
    "essential",
  );
}

/** What holds the package at its current level. Empty for Essential. */
export function packageReasonsFor(selection: Selection): string[] {
  const pack = packageFor(selection);
  return matchedRules(selection)
    .filter((rule) => rule.package === pack)
    .map((rule) => `${rule.reason(selection.tiles[rule.tileId] ?? 0)} → ${getParcel(pack).label}`);
}

type Priced = {
  parcel: Parcel | null;
  shape: ShapeId;
  label: string;
  extraTileIds: string[];
  extraCount: number;
  foundationHours: number;
  openHours: number;
  hours: number;
  savedHours: number;
  designHours: number;
  implementationHours: number;
  implementationOpenHours: number;
  packageOpenHours: number;
  packageHours: number;
  contentHours: number;
  lines: HourLine[];
};

const aiVariantsLineId = "ai-variants";

function price(selection: Selection): Priced {
  const parcel = getParcel(packageFor(selection));
  const extraTileIds: string[] = [];

  const lines: HourLine[] = [];
  let parcelOpen = 0;
  let listOpen = 0;
  let side = 0;

  for (const group of groups) {
    for (const item of tilesInGroup(group.id)) {
      const qty = selection.tiles[item.id];
      if (qty === undefined || feedbackIds.some((id) => id === item.id)) continue;
      const open = hoursFor(item, qty, selection);
      listOpen += open;
      const isContent = item.bucket === "content";
      if (isContent) side += open;
      else parcelOpen += open;
      const mode = modeLabel(item, qty);
      lines.push({
        id: item.id,
        label: item.label,
        qty,
        ...(item.unit ? { unit: item.unit } : {}),
        ...(mode ? { mode } : {}),
        openHours: roundHours(open),
        billedHours: roundHours(open),
        extra: false,
        bucket: item.bucket,
      });
    }
  }

  const pushFeedback = (id: string) => {
    const qty = selection.tiles[id];
    if (qty === undefined) return;
    const rounds = getTile(id);
    const extra = Math.max(0, qty - rounds.includedInBase);
    /* A round costs the same whatever the design choice */
    const hours = extra * rounds.build.custom;
    if (hours <= 0) return;
    listOpen += hours;
    parcelOpen += hours;
    lines.push({
      id,
      label: rounds.label,
      qty: extra,
      unit: "extra rounds",
      openHours: hours,
      billedHours: hours,
      extra: false,
      bucket: "design",
    });
  };
  const amount = amountOf(selection);
  if (selection.tiles["custom-design"] !== undefined) {
    for (const part of designParts("custom", amount)) {
      listOpen += part.hours;
      parcelOpen += part.hours;
      lines.push({
        id: part.id,
        label: part.label,
        qty: part.qty,
        ...(part.unit ? { unit: part.unit } : {}),
        ...(part.mode ? { mode: part.mode } : {}),
        openHours: part.hours,
        billedHours: part.hours,
        extra: false,
        bucket: "design",
      });
    }
  }
  const aiVariants = selection.tiles["ai-design"];
  if (aiVariants !== undefined) {
    const parts = designParts("ai", amount);
    for (const part of parts) {
      listOpen += part.hours;
      parcelOpen += part.hours;
      lines.push({
        id: part.id,
        label: part.label,
        qty: part.qty,
        ...(part.unit ? { unit: part.unit } : {}),
        ...(part.mode ? { mode: part.mode } : {}),
        openHours: part.hours,
        billedHours: part.hours,
        extra: false,
        bucket: "design",
      });
    }
    const extraVariants = Math.max(0, aiVariants - getTile("ai-design").includedInBase);
    const baseDesign = parts.reduce((sum, part) => sum + part.hours, 0);
    const variantHours = extraVariants * aiVariantHours(baseDesign);
    if (variantHours > 0) {
      listOpen += variantHours;
      parcelOpen += variantHours;
      lines.push({
        id: aiVariantsLineId,
        label: "Extra design variants",
        qty: extraVariants,
        unit: "variants",
        openHours: variantHours,
        billedHours: variantHours,
        extra: false,
        bucket: "design",
      });
    }
  }
  for (const id of feedbackIds) pushFeedback(id);

  const hours = roundHours(parcelOpen + side);
  const designHours = sumBucket(lines, "design");
  const contentHours = sumBucket(lines, "content");
  const implementationOpenHours = sumBucket(lines, "implementation");
  const implementationHours = sumBilled(lines, "implementation");
  const packageOpenHours = roundHours(implementationOpenHours + designHours);
  const packageHours = roundHours(hours - contentHours);
  const openHours = roundHours(listOpen);

  return {
    parcel,
    shape: parcel.id,
    label: parcel.label,
    extraTileIds,
    extraCount: extraTileIds.length,
    foundationHours: 0,
    openHours,
    hours,
    savedHours: roundHours(openHours - hours),
    designHours,
    implementationHours,
    implementationOpenHours,
    packageOpenHours,
    packageHours,
    contentHours,
    lines,
  };
}

function sumBucket(lines: HourLine[], bucket: HourBucket): number {
  return roundHours(
    lines.filter((line) => line.bucket === bucket).reduce((sum, line) => sum + line.openHours, 0),
  );
}

function sumBilled(lines: HourLine[], bucket: HourBucket): number {
  return roundHours(
    lines.filter((line) => line.bucket === bucket).reduce((sum, line) => sum + line.billedHours, 0),
  );
}

function pageHits(selection: Selection): { edition: Edition; reason: string }[] {
  const hit = pageEdition(selection.websitePages);
  return hit ? [hit] : [];
}

function editionOf(selection: Selection): { edition: Edition; reasons: string[] } {
  let edition: Edition = "starter";
  const pages = pageHits(selection);
  const hits: { edition: Edition; reason: string }[] = [
    {
      edition: "starter",
      reason: "Content Hub Starter removes HubSpot branding.",
    },
    ...pages,
  ];
  for (const [id, qty] of Object.entries(selection.tiles)) {
    hits.push(getTile(id).rule.at(qty));
  }
  for (const hit of hits) {
    if (editionRank[hit.edition] > editionRank[edition]) edition = hit.edition;
  }
  const reasons = [
    ...new Set(
      hits
        .filter((hit) => hit.edition === edition && hit.reason.length > 0)
        .map((hit) => hit.reason),
    ),
  ];
  for (const hit of pages) {
    if (!reasons.includes(hit.reason)) reasons.push(hit.reason);
  }
  return { edition, reasons };
}

const hubOrder: readonly HubId[] = [
  "marketing",
  "service",
  "sales",
  "commerce",
  "operations",
  "crm",
];

function hubsOf(selection: Selection): HubBadge[] {
  const byHub = new Map<HubId, HubBadge>();
  for (const [id, qty] of Object.entries(selection.tiles)) {
    if (qty === undefined) continue;
    const hub = getTile(id).hub;
    if (!hub) continue;
    const current = byHub.get(hub.id);
    if (!current) {
      byHub.set(hub.id, {
        id: hub.id,
        edition: hub.edition,
        title: `${hubName[hub.id]} ${editionLabel[hub.edition]}`,
        details: [hub.detail],
      });
      continue;
    }
    if (!current.details.includes(hub.detail)) current.details.push(hub.detail);
    if (editionRank[hub.edition] > editionRank[current.edition]) {
      current.edition = hub.edition;
      current.title = `${hubName[hub.id]} ${editionLabel[hub.edition]}`;
    }
  }
  return hubOrder.flatMap((id) => {
    const badge = byHub.get(id);
    return badge ? [badge] : [];
  });
}

function pageSpeedOf(selection: Selection): PageSpeed {
  let mobile = 90;
  let desktop = 96;
  let accessibility = 96;
  let seo = 94;
  const security = 95;
  const notes: string[] = [];
  const sections = selection.tiles.sections ?? 0;
  if (sections > 14) {
    mobile -= 5;
    desktop -= 2;
    notes.push("Performance: a long run of sections weighs more on a phone.");
  }
  if ((selection.tiles["custom-forms"] ?? 0) > 0) {
    accessibility -= 1;
    notes.push("Accessibility: forms need labels, errors, and a visible focus state.");
  }
  if (selection.tiles["blog-post"] !== undefined) seo += 2;
  if ((selection.tiles.languages ?? 1) > 1) {
    seo += 1;
    notes.push("SEO: each language needs hreflang. That work is in the language hours.");
  }
  if (selection.websitePages > starterPageCap) {
    seo -= 1;
    notes.push("SEO: a larger site needs unique titles and a checked sitemap.");
  }
  const clamp = (score: number) => Math.min(100, Math.max(35, score));
  if (notes.length === 0) {
    notes.push("A light build: labelled controls, one language, no third-party player.");
  }
  return {
    mobile: clamp(mobile),
    desktop: clamp(desktop),
    accessibility: clamp(accessibility),
    seo: clamp(seo),
    security: clamp(security),
    notes,
  };
}

export function quote(input: Selection): Quote {
  const selection = normalize(input);
  const priced = price(selection);
  const { edition, reasons } = editionOf(selection);
  let usualEditionWarning: string | null = null;
  if (priced.parcel && editionRank[edition] > editionRank[priced.parcel.usualEdition]) {
    const because = reasons.join(" ");
    const need = editionLabel[edition];
    const usual = editionLabel[priced.parcel.usualEdition];
    usualEditionWarning = because
      ? `${priced.parcel.label} is usually Content Hub ${usual}. This set needs ${need}: ${because}`
      : `${priced.parcel.label} is usually Content Hub ${usual}. This set needs ${need}.`;
  }

  const restore = null;
  const packageReasons = packageReasonsFor(selection);

  return {
    selection,
    startingPoint: getStartingPoint(selection.startingPoint),
    shape: priced.shape,
    label: priced.label,
    parcel: priced.parcel,
    extraTileIds: priced.extraTileIds,
    extraCount: priced.extraCount,
    foundationHours: priced.foundationHours,
    openHours: priced.openHours,
    hours: priced.hours,
    savedHours: priced.savedHours,
    designHours: priced.designHours,
    implementationHours: priced.implementationHours,
    implementationOpenHours: priced.implementationOpenHours,
    packageOpenHours: priced.packageOpenHours,
    packageHours: priced.packageHours,
    contentHours: priced.contentHours,
    packageReasons,
    edition,
    editionReasons: reasons,
    usualEditionWarning,
    hubs: hubsOf(selection),
    lines: priced.lines,
    restore,
    pageSpeed: pageSpeedOf(selection),
  };
}

function stepOfLine(line: HourLine): StepId {
  if (line.bucket === "design") return "design";
  if (line.bucket === "content") return "content";
  if (line.id === "languages") return "languages";
  return basicsTileIds.some((id) => id === line.id) ? "basics" : "addons";
}

/** Step totals add up to the quote total, so the page reads as one sum. */
export function stepHours(result: Quote, step: StepId): number {
  return roundHours(
    result.lines
      .filter((line) => stepOfLine(line) === step)
      .reduce((sum, line) => sum + line.openHours, 0),
  );
}

/** What one more AI design variant costs for this scope. */
export function aiVariantCost(result: Quote): number {
  const base = result.lines.filter(
    (line) =>
      line.bucket === "design" &&
      line.id.startsWith("ai-") &&
      line.id !== "ai-feedback" &&
      line.id !== aiVariantsLineId,
  );
  return aiVariantHours(base.reduce((sum, line) => sum + line.openHours, 0));
}

/** The estimate as the short code a link carries after its #. See link.ts for what is in it. */
export function encodeSelection(selection: Selection): string {
  const entries: [number, number][] = [];
  for (const [id, qty] of Object.entries(selection.tiles)) {
    const item = getTile(id);
    /* A mode is stored as its number in link-codes.csv, not its place, so the table's rows can be
       reordered */
    const value = item.modes ? item.modes[qty - 1]?.value : qty;
    if (value !== undefined) entries.push([item.code, value]);
  }
  return packLink({
    /* Two spare bits, kept for a later use */
    mode: 0,
    pages: selection.websitePages,
    entries,
  });
}

/** Reads a code, a link or the address's hash. Null when it is not a link. */
export function decodeSelection(hash: string): Selection | null {
  const packed = unpackLink(codeIn(hash));
  if (!packed) return null;
  const tilesSelected: Record<string, number> = {};
  for (const [code, value] of packed.entries) {
    const item = tileByCode(code);
    /* A task or mode that is no longer in the table is left out */
    if (!item) continue;
    if (!item.modes) tilesSelected[item.id] = value;
    else {
      /* An option that is hidden now: the item keeps the one it starts with */
      const level = item.modes.findIndex((mode) => mode.value === value) + 1;
      tilesSelected[item.id] = level > 0 ? level : item.initial;
    }
  }
  return normalize({
    startingPoint: "cms-react",
    websitePages: packed.pages,
    tiles: tilesSelected,
  });
}

export function isShapeId(value: string): value is ShapeId {
  return value === "essential" || value === "growth" || value === "platform" || value === "custom";
}
