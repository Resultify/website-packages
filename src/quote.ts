/**
 * Hours come only from the selected items.
 * The package is the lowest tier that covers every selected option.
 * Design hours stay separate from build hours.
 * Website pages are not build hours. More than 30 needs Professional.
 */

import {
  aiDesignParts,
  aiDesignSets,
  alwaysOnTileIds,
  type BlogSetupMode,
  type DesignInput,
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
  type Parcel,
  type ShapeId,
  type StartingPoint,
  type StartingPointId,
  starterPageCap,
  startingPoints,
  tileHours,
  tiles,
  tilesInGroup,
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
  edition: Edition;
  editionReasons: string[];
  usualEditionWarning: string | null;
  hubs: HubBadge[];
  lines: HourLine[];
  restore: RestoreHint | null;
  pageSpeed: PageSpeed;
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

function blogTemplateCount(selection: Selection, countId: string): number {
  const setups = selection.tiles["blog-setups"];
  if (setups === undefined) return 0;
  if (setups <= 1) return 1;
  return selection.tiles[countId] ?? 1;
}

function designInputFor(selection: Selection): DesignInput {
  const blog = selection.tiles["blog-setups"] !== undefined;
  return {
    templates: selection.tiles.templates ?? 0,
    landing: selection.tiles["landing-templates"] ?? 0,
    sections: selection.tiles.sections ?? 0,
    menu: selection.tiles.menu ?? 0,
    header: selection.tiles.header !== undefined,
    footer: selection.tiles.footer !== undefined,
    customForms: selection.tiles["custom-forms"] !== undefined,
    search: selection.tiles.search ?? 0,
    systemPages: selection.tiles.system !== undefined,
    setup: selection.tiles.setup !== undefined,
    listTemplates: blog ? blogTemplateCount(selection, "blog-list-count") : 0,
    listAdvanced: selection.tiles["blog-list"] === 2,
    postTemplates: blog ? blogTemplateCount(selection, "blog-post-count") : 0,
    postAdvanced: selection.tiles["blog-post"] === 2,
    recentPosts: selection.tiles["blog-recent"] !== undefined,
    hubdb: selection.tiles.hubdb ?? 0,
    catalogue: selection.tiles["product-catalogue"] ?? 0,
    favoriteProducts: selection.tiles["favorite-products"] ?? 0,
    relatedProducts: selection.tiles["related-products"] !== undefined,
  };
}

function hoursFor(item: ReturnType<typeof getTile>, qty: number, selection: Selection): number {
  if (item.id === "blog-list" || item.id === "blog-post") {
    const countId = item.id === "blog-list" ? "blog-list-count" : "blog-post-count";
    return blogTemplateCount(selection, countId) * (qty >= 2 ? 8 : 4);
  }
  if (item.id === "custom-design" || item.id === "ai-design") return 0;
  return tileHours(item, qty);
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
    if (next["blog-list-count"] === undefined) next["blog-list-count"] = 1;
    if (next["blog-post-count"] === undefined) next["blog-post-count"] = 1;
    if ((next["blog-setups"] ?? 0) <= 1) {
      next["blog-list-count"] = 1;
      next["blog-post-count"] = 1;
    }
  } else {
    delete next["blog-list"];
    delete next["blog-post"];
    delete next["blog-list-count"];
    delete next["blog-post-count"];
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
  if (next["product-catalogue"] === undefined) {
    delete next["favorite-products"];
    delete next["related-products"];
  } else if (next["product-catalogue"] === 1) {
    delete next["related-products"];
  }
  for (const id of alwaysOnTileIds) {
    if (next[id] === undefined) next[id] = getTile(id).initial;
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
  return remove;
}

const childTileIds = ["blog-list", "blog-post", "blog-list-count", "blog-post-count"] as const;

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
  if (on && tileId === "related-products" && selection.tiles["product-catalogue"] === 1) {
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
    delete next["blog-list-count"];
    delete next["blog-post-count"];
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

export function setBlogSetupMode(selection: Selection, blogSetupMode: BlogSetupMode): Selection {
  return normalize({ ...selection, blogSetupMode });
}

export function selectionForShape(
  _shape: ShapeId,
  websitePages = defaultWebsitePages,
  blogSetupMode: BlogSetupMode = "same",
): Selection {
  return normalize({
    startingPoint: "cms-react",
    websitePages,
    blogSetupMode,
    tiles: {
      templates: 3,
      sections: 8,
      menu: 1,
      languages: 1,
      header: 1,
      footer: 1,
      setup: 1,
      "ai-design": 2,
      "ai-feedback": 1,
    },
  });
}

const packageRank = { essential: 0, growth: 1, platform: 2 } as const;

function raisePackage(
  current: Exclude<ShapeId, "custom">,
  next: Exclude<ShapeId, "custom">,
): Exclude<ShapeId, "custom"> {
  return packageRank[next] > packageRank[current] ? next : current;
}

/** Lowest package that satisfies every selected option. The highest need wins. */
export function packageFor(selection: Selection): Exclude<ShapeId, "custom"> {
  let pack: Exclude<ShapeId, "custom"> = "essential";
  const selected = selection.tiles;
  if ((selected.templates ?? 0) >= 5) pack = raisePackage(pack, "growth");
  if ((selected.sections ?? 0) >= 11) pack = raisePackage(pack, "growth");
  if ((selected.menu ?? 1) >= 2) pack = raisePackage(pack, "growth");
  if ((selected.languages ?? 1) >= 2) pack = raisePackage(pack, "growth");
  const landing = selected["landing-templates"];
  if (landing !== undefined && landing >= 3) pack = raisePackage(pack, "growth");
  if (selected.search === 2) pack = raisePackage(pack, "growth");
  if (selected["custom-forms"] !== undefined) pack = raisePackage(pack, "growth");
  if (selected.hubdb !== undefined) pack = raisePackage(pack, "growth");
  if ((selected["blog-setups"] ?? 0) >= 2) pack = raisePackage(pack, "growth");
  if (selected["blog-list"] === 2) pack = raisePackage(pack, "growth");
  if (selected["blog-post"] === 2) pack = raisePackage(pack, "growth");
  if (selected["product-catalogue"] !== undefined) pack = raisePackage(pack, "platform");
  if (selected["favorite-products"] !== undefined) pack = raisePackage(pack, "platform");
  if (selected["related-products"] !== undefined) pack = raisePackage(pack, "platform");
  return pack;
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
      if (qty === undefined) continue;
      const open = hoursFor(item, qty, selection);
      listOpen += open;
      const isContent = item.bucket === "content";
      if (isContent) side += open;
      else parcelOpen += open;
      const mode = modeLabel(item, qty);
      const counted =
        item.id === "blog-list" || item.id === "blog-post"
          ? blogTemplateCount(
              selection,
              item.id === "blog-list" ? "blog-list-count" : "blog-post-count",
            )
          : qty;
      const unit = item.id === "blog-list" || item.id === "blog-post" ? "templates" : item.unit;
      lines.push({
        id: item.id,
        label: item.label,
        qty: counted,
        ...(unit ? { unit } : {}),
        ...(mode ? { mode } : {}),
        openHours: roundHours(open),
        billedHours: roundHours(open),
        extra: false,
        bucket: item.bucket,
      });
    }
  }

  const pushFeedback = (id: string, included: number, rate: number) => {
    const qty = selection.tiles[id];
    if (qty === undefined) return;
    const extra = Math.max(0, qty - included);
    const hours = extra * rate;
    if (hours <= 0) return;
    listOpen += hours;
    parcelOpen += hours;
    lines.push({
      id,
      label: getTile(id).label,
      qty: extra,
      unit: "extra rounds",
      openHours: hours,
      billedHours: hours,
      extra: false,
      bucket: "design",
    });
  };
  const designInput = designInputFor(selection);
  if (selection.tiles["custom-design"] !== undefined) {
    for (const part of designParts(designInput)) {
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
    for (const part of aiDesignParts(designInput, aiDesignSets(aiVariants))) {
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
  pushFeedback("design-feedback", 2, 6);
  pushFeedback("ai-feedback", 1, 3);

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
  if (selection.websitePages <= starterPageCap) return [];
  return [
    {
      edition: "professional",
      reason: "30+ website pages need Content Hub Professional",
    },
  ];
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
    edition,
    editionReasons: reasons,
    usualEditionWarning,
    hubs: hubsOf(selection),
    lines: priced.lines,
    restore,
    pageSpeed: pageSpeedOf(selection),
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
  return value === "essential" || value === "growth" || value === "platform" || value === "custom";
}

export function isBlogSetupMode(value: string): value is BlogSetupMode {
  return value === "same" || value === "list" || value === "post" || value === "both";
}
