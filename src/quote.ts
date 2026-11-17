/**
 * Hours come only from the selected items.
 * The package is the lowest tier that covers every selected option.
 * Design hours stay separate from build hours.
 * Website pages are not build hours. Past a number of them, the tier goes up.
 * Every number comes from the files in src/ (estimator.csv, rules.csv), through catalog.ts.
 * Build hours depend on the design choice: AI generated, Nimbly, Custom, or none.
 */

import {
  type Amount,
  aiVariantHours,
  alwaysOnTileIds,
  basicsTileIds,
  type Choice,
  catalogueId,
  madeLineIds,
  defaultWebsitePages,
  type DesignChoice,
  type DesignPart,
  designChoices,
  designParts,
  type Edition,
  editionLabel,
  editionRank,
  getParcel,
  getStartingPoint,
  getTile,
  groups,
  hasTile,
  type HourBucket,
  type HubId,
  hubName,
  isAlwaysOn,
  managementPercent,
  modeLabel,
  ownerOf,
  type PackageId,
  type PackageRule,
  type Parcel,
  pageEdition,
  pageLimits,
  packageRules,
  partsOf,
  requiredPartsOf,
  type ShapeId,
  type StartingPoint,
  type StartingPointId,
  type StepId,
  shelfSource,
  sourceTiles,
  startingDesign,
  starterPageCap,
  type Tile,
  tileByCode,
  tileHours,
  tileMode,
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
  /** How many of qty come with the estimate at no charge: feedback rounds, variants, languages. */
  included?: number;
  /** The item the hours are of, build or design. None for feedback, variants and management. */
  item?: string;
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
  /** The kick-off, training and project management: the work around the site. */
  projectHours: number;
  packageReasons: string[];
  edition: Edition;
  editionReasons: string[];
  usualEditionWarning: string | null;
  hubs: HubBadge[];
  lines: HourLine[];
  restore: RestoreHint | null;
  pageSpeed: PageSpeed;
};

/** Project management's hours: `percent` of `base`, rounded up to a whole hour. Hours and
    percents are whole numbers, so the share is exact: 15% of 101h is 15.15, so 16h. */
export function managementHours(base: number, percent: number): number {
  return Math.ceil((base * percent) / 100);
}

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
const feedbackIds: readonly string[] = designChoices.flatMap((choice) =>
  choice.feedbackId ? [choice.feedbackId] : [],
);
/** A design's item and its feedback rounds. */
const designIds = (choice: DesignChoice) => [
  choice.id,
  ...(choice.feedbackId ? [choice.feedbackId] : []),
];

/** How much of a task is in the estimate, for its design hours. */
function amountOf(selection: Selection): (item: Tile) => Amount | undefined {
  return (item) => {
    const qty = selection.tiles[item.id];
    if (qty === undefined) return undefined;
    return { qty, times: timesOf(selection, item), unit: countUnit(item) };
  };
}

/** How many of an item the estimate has: its count, or one. */
function timesOf(selection: Selection, item: Tile): number {
  return item.countedBy ? (selection.tiles[item.countedBy] ?? 1) : 1;
}

/** What an item's count counts: templates, versions. */
function countUnit(item: Tile): string | undefined {
  return item.countedBy ? getTile(item.countedBy).unit : undefined;
}

/** The estimate's design choice, which picks the build hours of every item. An estimate without
    one gets the starting design. */
export function designOf(selection: Selection): DesignChoice {
  return designChoices.find((choice) => selection.tiles[choice.id] !== undefined) ?? startingDesign;
}

export function choiceOf(selection: Selection): Choice {
  return designOf(selection).kind;
}

function hoursFor(item: Tile, qty: number, selection: Selection): number {
  if (item.group === "design") return 0;
  return tileHours(item, qty, choiceOf(selection));
}

/** The source of the estimate's Product catalogue: HubDB, or another with the same options. None
    when the catalogue is not in the estimate. */
export function sourceIn(chosen: Readonly<Record<string, number>>): string | undefined {
  return sourceTiles().find((item) => chosen[item.id] !== undefined)?.id;
}

/** An item of the shelf in the estimate. The Product catalogue is, with any of its sources. */
export function isIn(chosen: Readonly<Record<string, number>>, id: string): boolean {
  return id === catalogueId ? sourceIn(chosen) !== undefined : chosen[id] !== undefined;
}

/** Related products do not go with the catalogue's Module based option, from any source. */
export function isModuleBased(chosen: Readonly<Record<string, number>>): boolean {
  const source = sourceIn(chosen);
  return source !== undefined && modeLabel(getTile(source), chosen[source] ?? 0) === "Module based";
}

/** A source's option whose hours are entered, counted from 1. 0 when it has none. */
function customLevel(source: string): number {
  return (getTile(source).modes ?? []).findIndex((mode) => mode.customHours) + 1;
}

/** An option's whole name: "Dynamic pages: Simple". */
const optionName = (mode: { label: string; group?: string } | undefined) =>
  mode ? (mode.group ? `${mode.group}: ${mode.label}` : mode.label) : "";

/** The catalogue's parts: they go with it, whatever its source. */
const catalogueParts = ["catalogue-custom", "favorite-products", "related-products"] as const;

/** Social sign-in does not go with SSO: the client's identity provider signs members in. */
export function isSso(chosen: Readonly<Record<string, number>>): boolean {
  const level = chosen.membership;
  return level !== undefined && hasTile("membership")
    ? modeLabel(getTile("membership"), level) === "SSO"
    : false;
}

/** A part that does not go with the option its item has. */
export function isBlocked(chosen: Readonly<Record<string, number>>, id: string): boolean {
  if (id === "related-products") return isModuleBased(chosen);
  if (id === "membership-social") return isSso(chosen);
  return false;
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

  /* An item of the shelf never brings another with it: only its own parts, below */

  /* The parts of the Blog and Memberships: in with their item, the ones always in it at the
     quantity they start with; out without it, or when its option does not take them */
  for (const [owner, parts] of Object.entries(partsOf)) {
    if (owner === catalogueId) continue;
    if (next[owner] === undefined) for (const id of parts) delete next[id];
    else {
      for (const id of requiredPartsOf(owner)) next[id] ??= getTile(id).initial;
      for (const id of parts) if (isBlocked(next, id)) delete next[id];
    }
  }
  /* A count of the Blog's templates: only with more than one blog, and never more than the blogs.
     One is the template they share, and no count */
  for (const item of tiles) {
    if (!item.counts || next[item.id] === undefined) continue;
    const owner = ownerOf(item.counts);
    const most = owner ? (next[owner] ?? 0) : 0;
    const qty = Math.min(most, next[item.id] ?? 1);
    if (next[item.counts] === undefined || qty <= 1) delete next[item.id];
    else next[item.id] = qty;
  }
  /* One design, always: the first of the list when a link has more, the starting design when it
     has none. With its feedback rounds */
  const design = designOf({ ...selection, tiles: next });
  for (const choice of designChoices) {
    if (choice !== design) for (const id of designIds(choice)) delete next[id];
  }
  for (const id of designIds(design)) next[id] ??= getTile(id).initial;
  /* Design hours entered for an item go with it */
  for (const item of tiles) {
    if (!item.designInput) continue;
    if (next[item.id] === undefined) delete next[item.designInput];
    else next[item.designInput] ??= 0;
  }
  /* One source for the catalogue: the first of the table's when a link has more. The hours
     entered for its Custom option, while that is the option */
  const source = sourceIn(next);
  for (const item of sourceTiles()) if (item.id !== source) delete next[item.id];
  if (source === undefined) for (const id of catalogueParts) delete next[id];
  else {
    if (next[source] !== customLevel(source)) delete next["catalogue-custom"];
    else next["catalogue-custom"] ??= getTile("catalogue-custom").initial;
    for (const id of catalogueParts) if (isBlocked(next, id)) delete next[id];
  }
  for (const id of alwaysOnTileIds) {
    if (next[id] === undefined) next[id] = getTile(id).initial;
  }

  /* Website pages are one of two, as the estimator offers them: up to what Starter takes, or more */
  const pages = clampQuantity(
    selection.websitePages ?? defaultWebsitePages,
    pageLimits().min,
    pageLimits().max,
  );
  return {
    startingPoint: selection.startingPoint,
    websitePages:
      pages > starterPageCap ? starterPageCap + 1 : Math.min(defaultWebsitePages, starterPageCap),
    tiles: next,
  };
}

/** Always in the estimate with their item: they cannot be taken out on their own. */
const isRequiredPart = (id: string) => {
  const owner = ownerOf(id);
  return owner !== undefined && requiredPartsOf(owner).includes(id);
};

/** Puts the Product catalogue in the estimate from a source, or moves it to that source: with the
    option it has when the source has that option live, or the one the source starts with. The
    shelf's Product catalogue comes with its first live source. */
export function setSource(selection: Selection, sourceId: string): Selection {
  let source = getTile(sourceId);
  if (source.disabled || source.hidden) {
    const first = shelfSource();
    if (sourceId !== catalogueId || !first) return selection;
    source = first;
  }
  const next = { ...selection.tiles };
  const before = sourceIn(next);
  let level = next[source.id] ?? source.initial;
  if (before !== undefined && before !== source.id) {
    const name = optionName(tileMode(getTile(before), next[before] ?? 0));
    const same = (source.modes ?? []).findIndex(
      (mode) => !mode.disabled && optionName(mode) === name,
    );
    if (same !== -1) level = same + 1;
    delete next[before];
  }
  next[source.id] = level;
  return normalize({ ...selection, tiles: next });
}

export function setTile(selection: Selection, tileId: string, on: boolean): Selection {
  const piece = getTile(tileId);
  if (piece.source !== undefined) {
    if (on) return setSource(selection, tileId);
    /* Out with whichever source it has, and its parts */
    const next = { ...selection.tiles };
    for (const item of sourceTiles()) delete next[item.id];
    for (const id of catalogueParts) delete next[id];
    return normalize({ ...selection, tiles: next });
  }
  if (piece.disabled || piece.hidden) return selection;
  if (!on && (isAlwaysOn(tileId) || isRequiredPart(tileId))) return selection;
  /* A part comes in only with its item, and with an option of it that takes the part */
  const owner = ownerOf(tileId);
  if (on && owner !== undefined && !isIn(selection.tiles, owner)) return selection;
  if (on && isBlocked(selection.tiles, tileId)) return selection;
  const next = { ...selection.tiles };
  if (on) {
    next[tileId] = piece.initial;
    /* A design takes the place of the one before it */
    if (designChoices.some((choice) => choice.id === tileId)) {
      for (const choice of designChoices) {
        if (choice.id !== tileId) for (const id of designIds(choice)) delete next[id];
      }
    }
    return normalize({ ...selection, tiles: next });
  }
  /* Out with its own parts, and nothing else */
  delete next[tileId];
  for (const id of partsOf[tileId] ?? []) delete next[id];
  return normalize({ ...selection, tiles: next });
}

export function setQuantity(selection: Selection, tileId: string, qty: number): Selection {
  const piece = getTile(tileId);
  if (piece.disabled || piece.hidden) return selection;
  if (qty < piece.min) {
    if (isAlwaysOn(tileId) || isRequiredPart(tileId)) return selection;
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
    /* What is always in, and the starting design with its feedback rounds, each at the quantity
       the table starts it with */
    tiles: Object.fromEntries(
      [...alwaysOnTileIds, ...designIds(startingDesign)].map((id) => [id, getTile(id).initial]),
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
  projectHours: number;
  lines: HourLine[];
};

const aiVariantsLineId = madeLineIds.variants;
/** The line of project management, in Project. */
export const managementLineId = madeLineIds.management;

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
      /* The design, its rounds and design hours entered are lines of their own, below; a count is
         in its item's line */
      if (qty === undefined || item.group === "design" || item.designOf || item.counts) continue;
      /* A template the blogs need more than one of counts once for each */
      const times = timesOf(selection, item);
      const open = hoursFor(item, qty, selection) * times;
      listOpen += open;
      const isContent = item.bucket === "content";
      if (isContent) side += open;
      else parcelOpen += open;
      const mode = modeLabel(item, qty);
      lines.push({
        id: item.id,
        item: item.designOf ?? item.id,
        label: item.label,
        qty: times > 1 ? times : qty,
        ...(item.stepped && item.includedInBase > 0 ? { included: item.includedInBase } : {}),
        ...(item.unit ? { unit: item.unit } : times > 1 ? { unit: countUnit(item) } : {}),
        ...(mode ? { mode } : {}),
        openHours: roundHours(open),
        billedHours: roundHours(open),
        extra: false,
        bucket: item.bucket,
      });
    }
  }

  /* The design's feedback rounds: a line even when all are included, so the hours say how many */
  const pushFeedback = (id: string) => {
    const qty = selection.tiles[id];
    if (qty === undefined) return;
    const rounds = getTile(id);
    const extra = Math.max(0, qty - rounds.includedInBase);
    const hours = extra * rounds.build.custom;
    listOpen += hours;
    parcelOpen += hours;
    lines.push({
      id,
      label: "Feedback",
      qty,
      included: rounds.includedInBase,
      unit: "rounds",
      openHours: hours,
      billedHours: hours,
      extra: false,
      bucket: "design",
    });
  };
  /* The design hours of the estimate's design choice, one line for each item, and the design hours
     entered for an item, in the table's order */
  const choice = choiceOf(selection);
  const parts = choice === "none" ? [] : designParts(choice, amountOf(selection));
  const entered: DesignPart[] = tiles.flatMap((item) => {
    const qty = selection.tiles[item.id];
    if (!item.designOf || qty === undefined) return [];
    return [{ id: item.id, item: item.designOf, label: item.label, qty, hours: qty }];
  });
  const place = new Map(tiles.map((item, index) => [item.id, index]));
  const designLines = [...parts, ...entered].sort(
    (a, b) => (place.get(a.item) ?? 0) - (place.get(b.item) ?? 0),
  );
  for (const part of designLines) {
    listOpen += part.hours;
    parcelOpen += part.hours;
    lines.push({
      id: part.id,
      item: part.item,
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
  const aiVariants = selection.tiles["ai-design"];
  if (aiVariants !== undefined) {
    const extraVariants = Math.max(0, aiVariants - getTile("ai-design").includedInBase);
    const baseDesign = parts.reduce((sum, part) => sum + part.hours, 0);
    const variantHours = extraVariants * aiVariantHours(baseDesign);
    /* A line even when all are included, so the hours say how many */
    listOpen += variantHours;
    parcelOpen += variantHours;
    lines.push({
      id: aiVariantsLineId,
      label: "Variants",
      qty: aiVariants,
      included: getTile("ai-design").includedInBase,
      unit: "designs",
      openHours: variantHours,
      billedHours: variantHours,
      extra: false,
      bucket: "design",
    });
  }
  for (const id of feedbackIds) pushFeedback(id);

  /* Project management: a share of the design, build and content hours above, rounded up; not of
     the kick-off and training, which are Project too. The same share whatever the design */
  const percent = managementPercent();
  const base = lines
    .filter((line) => line.bucket !== "project")
    .reduce((sum, line) => sum + line.openHours, 0);
  const management = managementHours(base, percent);
  listOpen += management;
  parcelOpen += management;
  lines.push({
    id: managementLineId,
    label: "Project management",
    qty: 1,
    mode: `${formatHours(percent)}% of ${formatHours(base)}h`,
    openHours: management,
    billedHours: management,
    extra: false,
    bucket: "project",
  });

  const hours = roundHours(parcelOpen + side);
  const designHours = sumBucket(lines, "design");
  const contentHours = sumBucket(lines, "content");
  const projectHours = sumBucket(lines, "project");
  const implementationOpenHours = sumBucket(lines, "implementation");
  const implementationHours = sumBilled(lines, "implementation");
  const packageOpenHours = roundHours(implementationOpenHours + designHours + projectHours);
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
    projectHours,
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
    projectHours: priced.projectHours,
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
  if (line.id === managementLineId) return "basics";
  return basicsTileIds.some((id) => id === line.id) ? "basics" : "addons";
}

/** Step totals add up to the quote total, so the page reads as one sum. With a bucket, only the
    hours that count there: the site basics' Build apart from their Project. */
export function stepHours(result: Quote, step: StepId, bucket?: HourBucket): number {
  return roundHours(
    result.lines
      .filter((line) => stepOfLine(line) === step && (!bucket || line.bucket === bucket))
      .reduce((sum, line) => sum + line.openHours, 0),
  );
}

/** The AI design hours of the items in the estimate: what a variant is a share of. */
export function aiDesignHours(result: Quote): number {
  return result.lines
    .filter(
      (line) =>
        /* Named so by designParts; not design hours entered for an item whose id starts with ai- */
        line.bucket === "design" && line.id === `ai-${line.item}`,
    )
    .reduce((sum, line) => sum + line.openHours, 0);
}

/** What one more AI design variant costs for this scope. */
export function aiVariantCost(result: Quote): number {
  return aiVariantHours(aiDesignHours(result));
}

/* ---------- The short link ----------
   A link holds, in this order (see link.ts for the bits):
     - whether the site has more website pages than Starter takes: the estimator offers two
     - the design, and its feedback rounds and AI variants
     - a number for each site basic that has one or options, in the order of linkedBasics. The
       others (header, footer, setup and launch, kick-off) are always in, once, and not in a link
     - every other item that is in, by its code in link-codes.csv, with its number
   An item's number is its quantity, from the least it can be (0 for hours entered, 1 otherwise),
   or for an option its number in link-codes.csv, so the table's rows can be reordered. Every
   number the link writes counts from 1, so the usual ones take one bit. */

/** The site basics a link holds a number for, in this order. Fixed here, not by the table, so a
    link reads the same whatever the files say. */
const linkedBasics = ["templates", "sections", "menu", "languages", "training"] as const;

/** How many fixed numbers a link has with a design: its feedback rounds, its variants, the basics. */
function fixedCount(design: number): number {
  const choice = designChoices[design];
  if (!choice) return -1;
  return (choice.feedbackId ? 1 : 0) + (choice.kind === "ai" ? 1 : 0) + linkedBasics.length;
}

/** An item's number in a link, from 1. */
function linkNumber(item: Tile, qty: number): number {
  if (item.modes) return item.modes[qty - 1]?.value ?? 1;
  return Math.max(0, Math.round(qty) - item.min) + 1;
}

/** An item's quantity or option from its number in a link. An option that is gone: the one the
    item starts with. */
function fromLinkNumber(item: Tile, value: number): number {
  if (item.modes) return item.modes.findIndex((mode) => mode.value === value) + 1 || item.initial;
  return value - 1 + item.min;
}

/** Items a link names by code: not the design's, and not the site basics. */
const isCoded = (id: string) =>
  !isAlwaysOn(id) && !designChoices.some((choice) => designIds(choice).includes(id));

/** The estimate as the short code a link carries after its #. */
export function encodeSelection(selection: Selection): string {
  const tiles = selection.tiles;
  const design = designOf(selection);
  const fixed: number[] = [];
  if (design.feedbackId) fixed.push(Math.max(1, tiles[design.feedbackId] ?? 1));
  if (design.kind === "ai") fixed.push(Math.max(1, tiles[design.id] ?? 1));
  for (const id of linkedBasics) {
    fixed.push(hasTile(id) ? linkNumber(getTile(id), tiles[id] ?? getTile(id).initial) : 1);
  }
  const entries: [number, number][] = [];
  for (const [id, qty] of Object.entries(tiles)) {
    if (!isCoded(id) || !hasTile(id)) continue;
    const item = getTile(id);
    entries.push([item.code, linkNumber(item, qty)]);
  }
  return packLink({
    over: selection.websitePages > starterPageCap,
    design: designChoices.indexOf(design),
    fixed,
    entries,
  });
}

/** Reads a code, a link or the address's hash. Null when it is not a link. */
export function decodeSelection(hash: string): Selection | null {
  const packed = unpackLink(codeIn(hash), fixedCount);
  if (!packed) return null;
  const choice = designChoices[packed.design];
  if (!choice) return null;
  const tilesSelected: Record<string, number> = { [choice.id]: 1 };
  const fixed = [...packed.fixed];
  if (choice.feedbackId) tilesSelected[choice.feedbackId] = fixed.shift() ?? 1;
  if (choice.kind === "ai") tilesSelected[choice.id] = fixed.shift() ?? 1;
  for (const id of linkedBasics) {
    const value = fixed.shift() ?? 1;
    if (hasTile(id)) tilesSelected[id] = fromLinkNumber(getTile(id), value);
  }
  for (const [code, value] of packed.entries) {
    const item = tileByCode(code);
    /* A task that is no longer in the table is left out */
    if (!item || !isCoded(item.id)) continue;
    tilesSelected[item.id] = fromLinkNumber(item, value);
  }
  return normalize({
    startingPoint: "cms-react",
    websitePages: packed.over ? starterPageCap + 1 : defaultWebsitePages,
    tiles: tilesSelected,
  });
}

export function isShapeId(value: string): value is ShapeId {
  return value === "essential" || value === "growth" || value === "platform" || value === "custom";
}
