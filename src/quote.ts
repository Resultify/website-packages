/**
 * Foundation is counted once.
 * A package discounts that foundation plus the pieces inside its bands.
 * Extra tiles stay at item price. One more than the cap drops the package rate.
 * Website pages are not build hours. More than 30 needs Professional.
 */

import {
  type BlogSetupMode,
  blogSetupHours,
  defaultWebsitePages,
  type Edition,
  editionLabel,
  editionRank,
  getParcel,
  getStartingPoint,
  getTile,
  type HourBucket,
  type HubId,
  hubName,
  modeLabel,
  type Parcel,
  parcels,
  type ShapeId,
  type StartingPoint,
  type StartingPointId,
  starterPageCap,
  startingPoints,
  tileHours,
  tiles,
} from "./catalog.ts";

export type { BlogSetupMode };

export type Selection = {
  startingPoint: StartingPointId;
  /** Published website pages. More than 30 needs Content Hub Professional. */
  websitePages: number;
  /** How extra blogs reuse the first list and post templates. */
  blogSetupMode: BlogSetupMode;
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
  discountSavings: number;
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
  discountRate: number;
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
  edition: Edition;
  editionReasons: string[];
  usualEditionWarning: string | null;
  hubs: HubBadge[];
  lines: HourLine[];
  restore: RestoreHint | null;
  pageSpeed: PageSpeed;
  assumptions: string[];
};

const blogModes: readonly BlogSetupMode[] = ["same", "list", "post", "both"];

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

function hoursFor(item: ReturnType<typeof getTile>, qty: number, selection: Selection): number {
  if (item.id !== "blog-setups") return tileHours(item, qty);
  const listQty = selection.tiles["blog-list"] ?? 1;
  const postQty = selection.tiles["blog-post"] ?? 1;
  return blogSetupHours(
    qty,
    selection.blogSetupMode,
    tileHours(getTile("blog-list"), listQty),
    tileHours(getTile("blog-post"), postQty),
  );
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
    if (piece.disabled) continue;
    next[id] = clampQuantity(qty, piece.min, piece.max);
  }
  if (next.setup === undefined) next.setup = getTile("setup").initial;

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
    if (external === 2 && next.serverless === undefined) {
      next.serverless = getTile("serverless").initial;
      grew = true;
    }
  }

  const mode = blogModes.includes(selection.blogSetupMode) ? selection.blogSetupMode : "same";
  return {
    startingPoint: selection.startingPoint,
    websitePages: clampQuantity(selection.websitePages ?? defaultWebsitePages, 1, 200),
    blogSetupMode: mode,
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
  if (rootId === "serverless" && selected["external-forms"] === 2) remove.add("external-forms");
  return remove;
}

export function setTile(selection: Selection, tileId: string, on: boolean): Selection {
  const piece = getTile(tileId);
  if (piece.disabled) return selection;
  const next = { ...selection.tiles };
  if (on) {
    next[tileId] = piece.initial;
    if (tileId === "ai-design") delete next["custom-design"];
    if (tileId === "custom-design") delete next["ai-design"];
    return normalize({ ...selection, tiles: next });
  }
  for (const id of dependentsOf(tileId, selection.tiles)) delete next[id];
  return normalize({ ...selection, tiles: next });
}

export function setQuantity(selection: Selection, tileId: string, qty: number): Selection {
  const piece = getTile(tileId);
  if (piece.disabled) return selection;
  if (qty < piece.min) return setTile(selection, tileId, false);
  return normalize({
    ...selection,
    tiles: { ...selection.tiles, [tileId]: qty },
  });
}

const shapeOrder = ["lite", "growth", "platform"] as const;

/**
 * Apply a quantity step. When the step leaves the current package and a
 * neighbouring package can hold the new quantity, snap to that package.
 */
export function stepQuantity(selection: Selection, tileId: string, qty: number): Selection {
  const piece = getTile(tileId);
  if (piece.disabled) return selection;
  if (qty < piece.min) return setTile(selection, tileId, false);
  const naive = setQuantity(selection, tileId, qty);
  const from = quote(selection).shape;
  if (from === "custom" || quote(naive).shape !== "custom") return naive;
  const fromIndex = shapeOrder.indexOf(from);
  const goingUp = qty > (selection.tiles[tileId] ?? 0);
  const candidates = goingUp
    ? shapeOrder.slice(fromIndex + 1)
    : shapeOrder.slice(0, fromIndex).reverse();
  for (const shape of candidates) {
    const band = getParcel(shape).items.find((item) => item.tileId === tileId);
    if (!band || qty < band.min || qty > band.max) continue;
    const snapped = selectionForShape(shape, selection.websitePages, selection.blogSetupMode);
    const moved = setQuantity(snapped, tileId, qty);
    if (quote(moved).shape === shape) return moved;
  }
  return naive;
}

export function setWebsitePages(selection: Selection, websitePages: number): Selection {
  return normalize({ ...selection, websitePages });
}

export function setBlogSetupMode(selection: Selection, blogSetupMode: BlogSetupMode): Selection {
  return normalize({ ...selection, blogSetupMode });
}

export function selectionForShape(
  shape: ShapeId,
  websitePages = defaultWebsitePages,
  blogSetupMode: BlogSetupMode = "same",
): Selection {
  const startingPoint: StartingPointId = "cms-react";
  const base = { startingPoint, websitePages, blogSetupMode, tiles: {} as Record<string, number> };
  if (shape === "custom") return normalize(base);
  const parcel = getParcel(shape);
  const next: Record<string, number> = {};
  for (const item of parcel.items) next[item.tileId] = item.qty;
  return normalize({ ...base, tiles: next });
}

function extraIds(selected: Record<string, number>, parcel: Parcel): string[] {
  const included = new Set(parcel.items.map((item) => item.tileId));
  return Object.keys(selected)
    .filter((id) => getTile(id).bucket === "implementation" && !included.has(id))
    .sort();
}

function itemsCovered(selected: Record<string, number>, parcel: Parcel): boolean {
  return parcel.items.every((item) => {
    const qty = selected[item.tileId];
    return qty !== undefined && qty >= item.min && qty <= item.max;
  });
}

function coveredParcels(selected: Record<string, number>): Parcel[] {
  return parcels.filter((parcel) => {
    if (!itemsCovered(selected, parcel)) return false;
    return extraIds(selected, parcel).length <= parcel.maxExtras;
  });
}

function bestParcel(selected: Record<string, number>): Parcel | null {
  const covered = coveredParcels(selected);
  covered.sort((a, b) => {
    if (b.items.length !== a.items.length) return b.items.length - a.items.length;
    return editionRank[b.usualEdition] - editionRank[a.usualEdition];
  });
  return covered[0] ?? null;
}

type Priced = {
  parcel: Parcel | null;
  shape: ShapeId;
  label: string;
  extraTileIds: string[];
  extraCount: number;
  discountRate: number;
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

function price(selection: Selection): Priced {
  const start = getStartingPoint(selection.startingPoint);
  const parcel = bestParcel(selection.tiles);
  const inParcel = new Set<string>();
  if (parcel) {
    for (const item of parcel.items) inParcel.add(item.tileId);
  }
  const rate = parcel?.discount ?? 0;
  const extraTileIds = parcel
    ? extraIds(selection.tiles, parcel)
    : Object.keys(selection.tiles)
        .filter((id) => getTile(id).bucket === "implementation")
        .sort();

  const lines: HourLine[] = [];
  const foundationOpen = start.hours;
  let parcelOpen = foundationOpen;
  let listOpen = foundationOpen;
  let extraList = 0;
  let side = 0;

  lines.push({
    id: "foundation",
    label: "Foundation",
    qty: 1,
    openHours: foundationOpen,
    billedHours: roundHours(foundationOpen * (1 - rate)),
    extra: false,
    bucket: "implementation",
  });

  for (const item of tiles) {
    const qty = selection.tiles[item.id];
    if (qty === undefined) continue;
    const open = hoursFor(item, qty, selection);
    listOpen += open;
    const isContent = item.bucket === "content";
    const isDesign = item.bucket === "design";
    const extra = !isContent && !isDesign && !inParcel.has(item.id);
    let billed = open;
    if (isContent) side += open;
    else if (parcel && !extra) {
      parcelOpen += open;
      billed = open * (1 - rate);
    } else extraList += open;
    const mode = modeLabel(item, qty);
    lines.push({
      id: item.id,
      label: item.label,
      qty,
      ...(item.unit ? { unit: item.unit } : {}),
      ...(mode ? { mode } : {}),
      openHours: roundHours(open),
      billedHours: roundHours(billed),
      extra,
      bucket: item.bucket,
    });
  }

  const hours = roundHours(parcelOpen * (1 - rate) + extraList + side);
  const designHours = sumBucket(lines, "design");
  const contentHours = sumBucket(lines, "content");
  const implementationOpenHours = sumBucket(lines, "implementation");
  const implementationHours = sumBilled(lines, "implementation");
  const packageOpenHours = roundHours(implementationOpenHours + designHours);
  const packageHours = roundHours(hours - contentHours);
  const openHours = roundHours(listOpen);
  const label = !parcel
    ? "Custom"
    : extraTileIds.length === 0
      ? parcel.label
      : `${parcel.label} + ${extraTileIds.length}`;

  return {
    parcel,
    shape: parcel?.id ?? "custom",
    label,
    extraTileIds,
    extraCount: extraTileIds.length,
    discountRate: rate,
    foundationHours: start.hours,
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
  if (selection.websitePages <= starterPageCap) return [];
  return [
    {
      edition: "professional",
      reason: `${selection.websitePages} website pages need Content Hub Professional`,
    },
  ];
}

function editionOf(selection: Selection): { edition: Edition; reasons: string[] } {
  let edition: Edition = "starter";
  const pages = pageHits(selection);
  const hits: { edition: Edition; reason: string }[] = [
    {
      edition: "starter",
      reason: "Content Hub Starter removes HubSpot branding. Marketing Hub does not.",
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

function missingPieces(selected: Record<string, number>, parcel: Parcel): MissingPiece[] {
  const missing: MissingPiece[] = [];
  for (const item of parcel.items) {
    const have = selected[item.tileId] ?? 0;
    if (have >= item.min && have <= item.max) continue;
    missing.push({
      tileId: item.tileId,
      label: getTile(item.tileId).label,
      have,
      need: have > item.max ? item.max : item.min,
    });
  }
  return missing;
}

function withParcelBands(selection: Selection, parcel: Parcel): Selection {
  const next = { ...selection.tiles };
  for (const item of parcel.items) {
    const have = next[item.tileId] ?? 0;
    if (have < item.min) next[item.tileId] = item.min;
    else if (have > item.max) next[item.tileId] = item.max;
  }
  return normalize({ ...selection, tiles: next });
}

function requiredByOthers(selected: Record<string, number>, id: string): boolean {
  if (id === "hubdb" && selected["external-forms"] === 1) return true;
  if (id === "serverless" && selected["external-forms"] === 2) return true;
  return Object.keys(selected).some(
    (other) => other !== id && getTile(other).requires.includes(id),
  );
}

function fitToParcel(
  selection: Selection,
  parcel: Parcel,
): { selection: Selection; removed: TrimPiece[] } {
  let current = withParcelBands(selection, parcel);
  const removed: TrimPiece[] = [];
  for (let guard = 0; guard < 24; guard++) {
    const extras = extraIds(current.tiles, parcel);
    if (extras.length <= parcel.maxExtras) break;
    const roots = extras.filter((id) => !requiredByOthers(current.tiles, id));
    const pool = roots.length > 0 ? roots : extras;
    pool.sort((a, b) => {
      const diff =
        hoursFor(getTile(b), current.tiles[b] ?? 0, current) -
        hoursFor(getTile(a), current.tiles[a] ?? 0, current);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });
    const drop = pool[0];
    if (!drop) break;
    const before = Object.keys(current.tiles).length;
    removed.push({ tileId: drop, label: getTile(drop).label });
    current = setTile(current, drop, false);
    if (Object.keys(current.tiles).length >= before) break;
  }
  return { selection: current, removed };
}

function restoreHint(selection: Selection, currentHours: number): RestoreHint | null {
  let best: RestoreHint | null = null;
  for (const parcel of parcels) {
    const missing = missingPieces(selection.tiles, parcel);
    const fitted = fitToParcel(selection, parcel);
    if (!coveredParcels(fitted.selection.tiles).some((item) => item.id === parcel.id)) continue;
    if (missing.length === 0 && fitted.removed.length === 0) continue;
    const restored = price(fitted.selection);
    const hint: RestoreHint = {
      shape: parcel.id,
      label: parcel.label,
      missing,
      trim: fitted.removed,
      savedHours: roundHours(currentHours - restored.hours),
      discountSavings: restored.savedHours,
    };
    if (!best || betterHint(hint, best)) best = hint;
  }
  return best;
}

function betterHint(next: RestoreHint, current: RestoreHint): boolean {
  if (next.savedHours !== current.savedHours) return next.savedHours > current.savedHours;
  return next.missing.length + next.trim.length < current.missing.length + current.trim.length;
}

function pageSpeedOf(selection: Selection): PageSpeed {
  let mobile = 90;
  let desktop = 96;
  let accessibility = 96;
  let seo = 94;
  let security = 95;
  const notes: string[] = [];
  const sections = selection.tiles.sections ?? 0;
  if (sections > 14) {
    mobile -= 5;
    desktop -= 2;
    notes.push("Performance: a long run of sections weighs more on a phone.");
  }
  const video = selection.tiles.video;
  if (video === 3) {
    mobile -= 6;
    desktop -= 2;
    accessibility -= 2;
    notes.push("HubSpot Video loads a player. Captions can be added on the file.");
  } else if (video === 2) {
    mobile -= 7;
    desktop -= 3;
    accessibility -= 6;
    security -= 3;
    notes.push("YouTube adds a third-party player. Captions and the embed privacy need a check.");
  } else if (video === 1) {
    mobile -= 3;
    accessibility -= 4;
    notes.push("A file video needs captions and a text alternative.");
  }
  if (selection.tiles["blog-recent"] === 2) {
    mobile -= 4;
    desktop -= 1;
    accessibility -= 5;
    notes.push("Accessibility: a carousel needs a pause control and a keyboard path.");
  }
  if ((selection.tiles.forms ?? 0) > 0 || (selection.tiles["custom-forms"] ?? 0) > 0) {
    accessibility -= 1;
    notes.push("Accessibility: forms need labels, errors, and a visible focus state.");
  }
  if ((selection.tiles.ctas ?? 0) > 2) {
    mobile -= 2;
    accessibility -= 2;
    notes.push("Several CTAs compete. One primary action per view is easier to use.");
  }
  if (selection.tiles["blog-post"] !== undefined) seo += 2;
  if (selection.tiles.redirects !== undefined) {
    seo += 2;
    notes.push("SEO: redirects keep old URLs when each rule is checked.");
  }
  if ((selection.tiles.languages ?? 1) > 1) {
    seo += 1;
    notes.push("SEO: each language needs hreflang. That work is in the language hours.");
  }
  if (selection.websitePages > starterPageCap) {
    seo -= 1;
    notes.push("SEO: a larger site needs unique titles and a checked sitemap.");
  }
  if (selection.tiles["private-app"] !== undefined) {
    security -= 2;
    notes.push("Security: keep the private-app token least-privilege and the webhook URL checked.");
  }
  if (selection.tiles.serverless !== undefined) {
    security -= 2;
    notes.push(
      "Security: serverless functions should validate input and keep secrets out of the response.",
    );
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

function assumptions(start: StartingPoint): string[] {
  return [
    `${start.detail}`,
    "Guide hours, not a quote. Replace the placeholders in src/catalog.ts before a proposal.",
    "Confirm the Content Hub edition against HubSpot's current catalog. Licence price and seats are separate.",
    "More than 30 website pages needs Professional. That choice is not build hours.",
    "The PageSpeed figures are an estimate from the build, not a live test.",
    "The client enters content. The first domain and the first language are included.",
    "Content hours are added in full. The package rate covers the build and the design.",
  ];
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

  const hint = restoreHint(selection, priced.hours);
  const restore = !priced.parcel ? hint : hint && hint.savedHours > 0 ? hint : null;

  return {
    selection,
    startingPoint: getStartingPoint(selection.startingPoint),
    shape: priced.shape,
    label: priced.label,
    parcel: priced.parcel,
    extraTileIds: priced.extraTileIds,
    extraCount: priced.extraCount,
    discountRate: priced.discountRate,
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
    edition,
    editionReasons: reasons,
    usualEditionWarning,
    hubs: hubsOf(selection),
    lines: priced.lines,
    restore,
    pageSpeed: pageSpeedOf(selection),
    assumptions: assumptions(getStartingPoint(selection.startingPoint)),
  };
}

export function encodeSelection(selection: Selection): string {
  const body = Object.entries(selection.tiles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, qty]) => `${id}.${qty}`)
    .join(",");
  return `s=${selection.startingPoint}&w=${selection.websitePages}&b=${selection.blogSetupMode}&t=${body}`;
}

export function decodeSelection(hash: string): Selection | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw.length === 0) return null;
  const params = new Map<string, string>();
  for (const part of raw.split("&")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    params.set(decodeURIComponent(part.slice(0, eq)), decodeURIComponent(part.slice(eq + 1)));
  }
  const start = params.get("s");
  if (!start || !startingPoints.some((item) => item.id === start)) return null;
  const tilesSelected: Record<string, number> = {};
  const body = params.get("t") ?? "";
  if (body.length > 0) {
    for (const part of body.split(",")) {
      const dot = part.lastIndexOf(".");
      if (dot <= 0) continue;
      const id = part.slice(0, dot);
      const qty = Number(part.slice(dot + 1));
      if (!Number.isFinite(qty)) continue;
      try {
        getTile(id);
      } catch {
        continue;
      }
      tilesSelected[id] = qty;
    }
  }
  const website = Number(params.get("w"));
  const mode = params.get("b");
  const blogSetupMode: BlogSetupMode =
    mode === "list" || mode === "post" || mode === "both" || mode === "same" ? mode : "same";
  return normalize({
    startingPoint: start as StartingPointId,
    websitePages: Number.isFinite(website) ? website : defaultWebsitePages,
    blogSetupMode,
    tiles: tilesSelected,
  });
}

export function isShapeId(value: string): value is ShapeId {
  return value === "lite" || value === "growth" || value === "platform" || value === "custom";
}

export function isBlogSetupMode(value: string): value is BlogSetupMode {
  return value === "same" || value === "list" || value === "post" || value === "both";
}
