import {
  badgeLabel,
  defaultWebsitePages,
  type Edition,
  editionFacts,
  editionLabel,
  getTile,
  groups,
  type HubId,
  hubName,
  type ShapeId,
  setupHours,
  setupNote,
  shapeChoices,
  starterPageCap,
  type Tile,
  tileHours,
  tilesInGroup,
} from "./catalog.ts";
import { type ProductIconId, productIconPaths } from "./product-icons.ts";
import {
  type BlogSetupMode,
  decodeSelection,
  encodeSelection,
  formatHours,
  isBlogSetupMode,
  isShapeId,
  type MissingPiece,
  type Quote,
  quote,
  type Selection,
  selectionForShape,
  setBlogSetupMode,
  setQuantity,
  setTile,
  setWebsitePages,
  stepQuantity,
  type TrimPiece,
} from "./quote.ts";

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) throw new Error("Missing #app");

let selection: Selection = decodeSelection(location.hash) ?? selectionForShape("lite");

type PendingChange = { key: string; message: string; next: Selection };

let pending: PendingChange | null = null;

function commit(next: Selection): void {
  pending = null;
  selection = quote(next).selection;
  const hash = `#${encodeSelection(selection)}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
  draw();
}

function draw(): void {
  const focusId =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.focus
      : undefined;
  app?.replaceChildren(render(quote(selection)));
  if (!focusId) return;
  const next = document.querySelector(`[data-focus="${CSS.escape(focusId)}"]`);
  if (next instanceof HTMLElement) next.focus();
}

function quantityLabel(unit: string, qty: number): string {
  if (qty === 1 && unit === "CTAs") return "1 CTA";
  if (qty === 1 && unit.endsWith("s")) return `1 ${unit.slice(0, -1)}`;
  return `${qty} ${unit}`;
}

function piecePhrase(piece: MissingPiece): string {
  if (piece.have <= 0) return `add ${piece.label}`;
  if (piece.have > piece.need) return `lower ${piece.label} to ${piece.need}`;
  return `raise ${piece.label} to ${piece.need}`;
}

function nameList(names: string[]): string {
  const shown = names.slice(0, 8);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")}, and ${rest} more` : shown.join(", ");
}

function restoreCopy(result: Quote): string {
  const hint = result.restore;
  if (!hint) return "";
  const missing = nameList(hint.missing.map(piecePhrase));
  const trim = nameList(hint.trim.map((piece: TrimPiece) => piece.label));
  const save = hint.savedHours > 0 ? ` and save ${formatHours(hint.savedHours)}h` : "";
  if (hint.trim.length > 0 && hint.missing.length === 0) {
    return `Remove ${trim} to fit ${hint.label}${save}.`;
  }
  if (hint.trim.length > 0) {
    return `To use ${hint.label}, ${missing}, and remove ${trim}${save}.`;
  }
  if (hint.savedHours > 0) {
    const sentence = missing.charAt(0).toUpperCase() + missing.slice(1);
    return `${sentence} to restore ${hint.label} and save ${formatHours(hint.savedHours)}h.`;
  }
  const noun = hint.missing.length === 1 ? "change" : "changes";
  return `${hint.label} is ${hint.missing.length} ${noun} away (${missing}). That shape saves ${formatHours(hint.discountSavings)}h against the item price of the same set.`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function productIcon(id: ProductIconId): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 28 28");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("product-icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "#FF4800");
  path.setAttribute("d", productIconPaths[id]);
  svg.append(path);
  return svg;
}

function tierPill(edition: Edition, text: string): HTMLElement {
  const badge = el("span", "tier-pill");
  badge.dataset.edition = edition;
  badge.textContent = text;
  return badge;
}

function productLine(
  icon: ProductIconId,
  name: string,
  edition: Edition,
  tier: string,
): HTMLElement {
  const row = el("span", "product-line");
  const title = el("span", "product-name");
  const mark = el("span", "product-mark");
  mark.append(productIcon(icon));
  title.append(mark, el("span", undefined, name));
  row.append(title, tierPill(edition, tier));
  return row;
}

function render(result: Quote): HTMLElement {
  const page = el("div", "page");
  page.append(renderNav(result), renderLayout(result));
  return page;
}

function resultifyLogo(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1024 1024");
  svg.setAttribute("aria-label", "Resultify");
  svg.setAttribute("role", "img");
  svg.classList.add("logo");
  const plate = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  plate.setAttribute("width", "1024");
  plate.setAttribute("height", "1024");
  plate.setAttribute("fill", "#010202");
  const mark = document.createElementNS("http://www.w3.org/2000/svg", "path");
  mark.setAttribute("fill", "#fff");
  mark.setAttribute(
    "d",
    "M552.9,565.79c67.3-27.7,114.5-87.1,114.5-159.9,0-94.2-75.8-170.2-168.7-170.2H366.9v95H490.2c41,0,76.6,34.8,76.6,76.8,0,44.3-35.6,80.7-76.6,80.7H366.9V573h82.3L552.1,782.8c1.6,3.1,5.4,7.1,12.4,7.1h81.2c13.1,0,18.6-12.6,13.1-22.9Z",
  );
  svg.append(plate, mark);
  return svg;
}

function renderNav(result: Quote): HTMLElement {
  const header = el("header", "navbar");
  const brand = el("div", "nav-brand");
  brand.append(resultifyLogo(), el("p", "nav-title", "Website packages"));
  const tools = el("div", "nav-tools");
  tools.append(renderPageCap(result));
  const reset = el("button", "nav-btn");
  reset.type = "button";
  reset.dataset.action = "reset";
  reset.dataset.focus = "reset";
  reset.textContent = "Reset";
  const share = el("button", "nav-btn");
  share.type = "button";
  share.dataset.action = "share";
  share.dataset.focus = "share";
  share.textContent = "Share";
  const json = el("button", "nav-btn");
  json.type = "button";
  json.disabled = true;
  json.textContent = "JSON";
  tools.append(reset, share, json);
  header.append(brand, tools);
  return header;
}

function renderLayout(result: Quote): HTMLElement {
  const layout = el("div", "layout");
  layout.append(renderShapes(result), renderBoard(result), renderRail(result));
  return layout;
}

function shapeProducts(choiceId: ShapeId, result: Quote): HTMLElement[] {
  const active = result.shape === choiceId;
  if (active) {
    const rows = [
      productLine("content", "Content Hub", result.edition, editionLabel[result.edition]),
    ];
    for (const hub of result.hubs) {
      rows.push(
        productLine(hubIcon(hub.id), hubName[hub.id], hub.edition, editionLabel[hub.edition]),
      );
    }
    return rows;
  }
  const choice = shapeChoices.find((item) => item.id === choiceId);
  if (choice?.usualEdition) {
    return [
      productLine("content", "Content Hub", choice.usualEdition, editionLabel[choice.usualEdition]),
    ];
  }
  return [];
}

function hubIcon(id: HubId): ProductIconId {
  if (
    id === "marketing" ||
    id === "sales" ||
    id === "service" ||
    id === "commerce" ||
    id === "crm"
  ) {
    return id;
  }
  return "operations";
}

function renderPageCap(result: Quote): HTMLElement {
  const on = result.selection.websitePages > starterPageCap;
  const button = el("button", on ? "nav-btn page-cap is-on" : "nav-btn page-cap");
  button.type = "button";
  button.dataset.action = "pages-over";
  button.dataset.focus = "pages-over";
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.append(el("span", undefined, "30+ pages"), infoMark());
  const note = el(
    "span",
    "info-note",
    "More than 30 website pages needs Professional. This is not a build feature.",
  );
  note.setAttribute("role", "tooltip");
  note.setAttribute("aria-hidden", "true");
  button.setAttribute("aria-label", "30+ pages");
  button.append(note);
  return button;
}

function infoMark(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("info-i");
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("cx", "8");
  ring.setAttribute("cy", "8");
  ring.setAttribute("r", "6.25");
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "currentColor");
  ring.setAttribute("stroke-width", "1.25");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("cx", "8");
  dot.setAttribute("cy", "5.15");
  dot.setAttribute("r", "0.85");
  dot.setAttribute("fill", "currentColor");
  const stem = document.createElementNS("http://www.w3.org/2000/svg", "path");
  stem.setAttribute("d", "M8 7.35v4.15");
  stem.setAttribute("fill", "none");
  stem.setAttribute("stroke", "currentColor");
  stem.setAttribute("stroke-width", "1.35");
  stem.setAttribute("stroke-linecap", "round");
  svg.append(ring, dot, stem);
  return svg;
}

function renderShapes(result: Quote): HTMLElement {
  const nav = el("nav", "shapes");
  nav.setAttribute("aria-label", "Project shape");
  for (const shape of shapeChoices) {
    const on = result.shape === shape.id;
    const button = el("button", on ? "shape is-on" : "shape");
    button.type = "button";
    button.dataset.action = "shape";
    button.dataset.id = shape.id;
    button.dataset.focus = `shape-${shape.id}`;
    button.setAttribute("aria-pressed", on ? "true" : "false");
    if (shape.id !== "custom") button.append(el("span", "shape-discount", shape.discountLabel));
    button.append(el("span", "shape-name", shape.label));
    const rows = shapeProducts(shape.id, result);
    if (rows.length > 0) {
      const tiers = el("span", "tier-row");
      for (const row of rows) tiers.append(row);
      button.append(tiers);
    }
    const setup = el("span", "shape-setup");
    setup.append(
      el("strong", undefined, `${setupHours}h`),
      document.createTextNode(` ${setupNote}`),
    );
    button.append(
      el("span", "shape-extra", shape.extraLabel),
      el("span", "shape-blurb", shape.blurb),
      setup,
    );
    nav.append(button);
  }
  return nav;
}

function renderBoard(result: Quote): HTMLElement {
  const board = el("div", "board");
  const blogIds = new Set(["blog-list", "blog-post", "blog-setups"]);
  for (const group of groups) {
    const section = el("section", `group is-${group.layout}`);
    if (group.label) section.append(el("h2", undefined, group.label));
    if (group.note) section.append(el("p", "group-note", group.note));
    const grid = el("div", `tiles is-${group.layout}`);
    let blogPlaced = false;
    for (const item of tilesInGroup(group.id)) {
      if (blogIds.has(item.id)) {
        if (!blogPlaced) {
          grid.append(renderBlog(result));
          blogPlaced = true;
        }
        continue;
      }
      grid.append(renderTile(result, item.id));
    }
    section.append(grid);
    board.append(section);
  }
  return board;
}

function ownsPending(id: string): boolean {
  if (!pending) return false;
  return (
    pending.key.startsWith(`step:${id}:`) ||
    pending.key.startsWith(`tile:${id}:`) ||
    pending.key.startsWith(`mode:${id}:`)
  );
}

function appendLimit(parent: HTMLElement, id: string): void {
  if (!pending || !ownsPending(id)) return;
  const note = el("p", "limit", pending.message);
  note.id = `limit-${id}`;
  note.setAttribute("role", "status");
  parent.append(note);
}

function stepClass(id: string, target: number): string {
  return pending?.key === `step:${id}:${target}` ? "step is-armed" : "step";
}

function renderStepper(tile: Tile, qty: number): HTMLElement {
  const step = tile.step;
  const stepper = el("div", "stepper");
  const dec = el("button", stepClass(tile.id, qty - step));
  dec.type = "button";
  dec.dataset.action = "dec";
  dec.dataset.id = tile.id;
  dec.dataset.focus = `dec-${tile.id}`;
  dec.disabled = qty - step < tile.min;
  dec.setAttribute("aria-label", `Fewer ${tile.unit ?? tile.label}`);
  dec.textContent = "−";
  const input = el("input", "qty");
  input.type = "number";
  input.inputMode = "numeric";
  input.min = String(tile.min);
  input.max = String(tile.max);
  input.step = String(step);
  input.value = String(qty);
  input.dataset.action = "qty";
  input.dataset.id = tile.id;
  input.dataset.focus = `qty-${tile.id}`;
  input.setAttribute("aria-label", tile.unit ?? tile.label);
  const inc = el("button", stepClass(tile.id, qty + step));
  inc.type = "button";
  inc.dataset.action = "inc";
  inc.dataset.id = tile.id;
  inc.dataset.focus = `inc-${tile.id}`;
  inc.disabled = qty + step > tile.max;
  inc.setAttribute("aria-label", `More ${tile.unit ?? tile.label}`);
  inc.textContent = "+";
  stepper.append(dec, input, inc);
  return stepper;
}

function renderModes(id: string, modes: readonly { label: string }[], qty: number): HTMLElement {
  const wrap = el("div", "modes");
  for (const [index, mode] of modes.entries()) {
    const level = index + 1;
    const modeButton = el("button", level === qty ? "mode is-on" : "mode");
    modeButton.type = "button";
    modeButton.dataset.action = "mode";
    modeButton.dataset.id = id;
    modeButton.dataset.qty = String(level);
    modeButton.dataset.focus = `mode-${id}-${level}`;
    modeButton.setAttribute("aria-pressed", level === qty ? "true" : "false");
    if (pending?.key === `mode:${id}:${level}`) modeButton.classList.add("is-armed");
    modeButton.textContent = mode.label;
    wrap.append(modeButton);
  }
  return wrap;
}

function renderBlogPart(result: Quote, id: string): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id];
  const on = qty !== undefined;
  const part = el("div", on ? "blog-part is-on" : "blog-part");
  const button = el("button", "tile-button");
  button.type = "button";
  button.dataset.action = "tile";
  button.dataset.id = id;
  button.dataset.focus = `tile-${id}`;
  button.setAttribute("aria-pressed", on ? "true" : "false");
  const top = el("span", "tile-top");
  top.append(el("span", "seat"), el("span", "tile-name", tile.label));
  button.append(top);
  const line = result.lines.find((item) => item.id === id);
  const hours = line?.openHours;
  if (on && hours !== undefined) {
    const meta = line && !line.extra && result.parcel ? "Included" : `${formatHours(hours)}h`;
    button.append(el("span", "tile-meta", meta));
  }
  button.append(el("span", "tile-summary", tile.summary));
  part.append(button);
  if (on && tile.modes && qty !== undefined) part.append(renderModes(id, tile.modes, qty));
  appendLimit(part, id);
  return part;
}

function renderBlogExtra(result: Quote): HTMLElement {
  const extra = el("div", "blog-extra");
  extra.append(el("p", undefined, "Each extra blog can reuse these templates, or get its own."));
  const modes = el("div", "modes");
  const choices: { id: BlogSetupMode; label: string }[] = [
    { id: "same", label: "Reuse these" },
    { id: "list", label: "New list" },
    { id: "post", label: "New post" },
    { id: "both", label: "New list and post" },
  ];
  for (const choice of choices) {
    const modeButton = el(
      "button",
      result.selection.blogSetupMode === choice.id ? "mode is-on" : "mode",
    );
    modeButton.type = "button";
    modeButton.dataset.action = "blog-mode";
    modeButton.dataset.qty = choice.id;
    modeButton.dataset.focus = `blog-mode-${choice.id}`;
    modeButton.setAttribute(
      "aria-pressed",
      result.selection.blogSetupMode === choice.id ? "true" : "false",
    );
    modeButton.textContent = choice.label;
    modes.append(modeButton);
  }
  extra.append(modes);
  return extra;
}

function renderBlog(result: Quote): HTMLElement {
  const setups = getTile("blog-setups");
  const qty = result.selection.tiles["blog-setups"];
  const on = qty !== undefined;
  const card = el("article", on ? "blog-set is-on" : "blog-set");
  const button = el("button", "tile-button");
  button.type = "button";
  button.dataset.action = "tile";
  button.dataset.id = "blog-setups";
  button.dataset.focus = "tile-blog-setups";
  button.setAttribute("aria-pressed", on ? "true" : "false");
  const top = el("span", "tile-top");
  top.append(el("span", "seat"), el("span", "tile-name", "Blog"));
  button.append(top);
  const hours = result.lines.find((item) => item.id === "blog-setups")?.openHours ?? 0;
  if (on) {
    button.append(el("span", "tile-meta", hours === 0 ? "Included" : `${formatHours(hours)}h`));
  }
  button.append(el("span", "tile-summary", setups.summary));
  card.append(button);
  if (on && qty !== undefined) card.append(renderStepper(setups, qty));
  appendLimit(card, "blog-setups");
  const parts = el("div", "blog-parts");
  parts.append(renderBlogPart(result, "blog-list"), renderBlogPart(result, "blog-post"));
  card.append(parts);
  if (on && qty !== undefined && qty > 1) card.append(renderBlogExtra(result));
  return card;
}

function markBadge(mark: string): HTMLElement {
  if (mark === "Pro") return tierPill("professional", "Pro");
  if (mark === "Ent") return tierPill("enterprise", "Ent");
  if (mark === "Service") {
    const chip = el("span", "product-name");
    const icon = el("span", "product-mark");
    icon.append(productIcon("service"));
    chip.append(icon, el("span", undefined, "Service"));
    return chip;
  }
  return el("span", "mark", mark);
}

function renderTile(result: Quote, id: string): HTMLElement {
  const line = result.lines.find((item) => item.id === id);
  const qty = result.selection.tiles[id];
  const on = qty !== undefined;
  const tile = getTile(id);
  const card = el("article", on ? "tile is-on" : "tile");
  if (tile.disabled) card.classList.add("is-disabled");

  const button = el("button", "tile-button");
  button.type = "button";
  button.dataset.action = "tile";
  button.dataset.id = id;
  button.dataset.focus = `tile-${id}`;
  button.disabled = tile.disabled === true;
  button.setAttribute("aria-pressed", on ? "true" : "false");

  const top = el("span", "tile-top");
  top.append(el("span", "seat"));
  top.append(el("span", "tile-name", tile.label));
  const flags = el("span", "tile-flags");
  if (tile.badge && tile.badge !== "planned") {
    flags.append(el("span", `badge badge-${tile.badge}`, badgeLabel[tile.badge]));
  }
  if (tile.mark) flags.append(markBadge(tile.mark));
  if (flags.childElementCount > 0) top.append(flags);
  button.append(top);

  const shownQty = qty ?? tile.initial;
  const shownHours = on && line ? line.openHours : tileHours(tile, shownQty);
  if (!tile.disabled) {
    const meta = el("span", "tile-meta");
    if (tile.hourInput) {
      meta.append(el("span", undefined, on ? `${formatHours(shownQty)}h` : "Set the hours"));
    } else if (
      (tile.id === "languages" || tile.id === "blog-setups") &&
      shownQty === 1 &&
      shownHours === 0
    ) {
      meta.append(el("span", undefined, "Included"));
    } else {
      meta.append(el("span", undefined, `${formatHours(shownHours)}h`));
      const shownMode = tile.modes?.[shownQty - 1]?.label;
      if (shownMode) meta.append(el("span", "dot", "·"), el("span", undefined, shownMode));
      else if (tile.stepped) {
        meta.append(
          el("span", "dot", "·"),
          el("span", undefined, quantityLabel(tile.unit ?? "", shownQty)),
        );
      }
    }
    button.append(meta);
  }
  button.append(el("span", "tile-summary", tile.summary));
  if (tile.note) button.append(el("span", "tile-note", tile.note));
  card.append(button);
  appendLimit(card, id);

  if (on && tile.modes && qty !== undefined) card.append(renderModes(id, tile.modes, qty));

  if (on && tile.hourInput && qty !== undefined) {
    const field = el("label", "hour-field");
    field.append(el("span", undefined, "Hours"));
    const input = el("input", "qty");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "0";
    input.max = String(tile.max);
    input.value = String(qty);
    input.dataset.action = "hours";
    input.dataset.id = id;
    input.dataset.focus = `hours-${id}`;
    input.setAttribute("aria-label", `Hours for ${tile.label}`);
    field.append(input);
    card.append(field);
  }

  if (on && tile.stepped && qty !== undefined && !tile.hourInput) {
    card.append(renderStepper(tile, qty));
  }

  if (tile.badge === "planned") {
    card.classList.add("is-planned");
    const cover = el("div", "tile-cover");
    cover.append(el("span", "badge badge-planned", badgeLabel.planned));
    card.append(cover);
  }

  return card;
}

function scoreClass(score: number): string {
  if (score >= 90) return "is-good";
  if (score >= 50) return "is-mid";
  return "is-poor";
}

function renderTotals(result: Quote): HTMLElement {
  const section = el("section", "rail totals");
  section.setAttribute("aria-label", "Hours");
  const head = el("div", "totals-head");
  head.append(el("h2", "parcel-label", result.label));
  if (result.savedHours > 0 && result.parcel) {
    const percent = Math.round(result.discountRate * 100);
    head.append(el("span", "totals-off", `${percent}% off`));
  }
  section.append(head);
  const price = el("div", "totals-price");
  price.append(el("span", "total-label", "Item price"));
  if (result.savedHours > 0) {
    price.append(el("span", "totals-open", `${formatHours(result.packageOpenHours)}h`));
    price.append(el("span", "totals-save", `saves ${formatHours(result.savedHours)}h`));
  }
  price.append(el("span", "totals-now", `${formatHours(result.packageHours)}h`));
  section.append(price);
  section.append(totalLine("Content", result.contentHours, false));
  section.append(totalLine("Total", result.hours, true));
  return section;
}

function totalLine(label: string, hours: number, sum: boolean): HTMLElement {
  const line = el("div", sum ? "total-row is-sum" : "total-row");
  const value = el("span", "total-value", `${formatHours(hours)}h`);
  if (sum) value.ariaLive = "polite";
  line.append(el("span", "total-label", label), value);
  return line;
}

function renderFold(title: string, focus: string): HTMLDetailsElement {
  const details = el("details", "rail rail-fold");
  details.open = true;
  const summary = el("summary", undefined, title);
  summary.dataset.focus = focus;
  details.append(summary);
  return details;
}

function renderEdition(result: Quote): HTMLElement {
  const section = el("section", "rail edition");
  const blurb = result.parcel?.blurb ?? "Each piece on its own, without the package rate.";
  section.append(el("p", "facts-note", blurb));
  const tiers = el("div", "tier-row");
  tiers.append(productLine("content", "Content Hub", result.edition, editionLabel[result.edition]));
  for (const hub of result.hubs) {
    tiers.append(
      productLine(hubIcon(hub.id), hubName[hub.id], hub.edition, editionLabel[hub.edition]),
    );
  }
  section.append(tiers);
  if (result.editionReasons.length > 0) {
    const list = el("ul", "reasons");
    for (const reason of result.editionReasons) list.append(el("li", undefined, reason));
    section.append(list);
  }
  if (result.usualEditionWarning) section.append(el("p", "warning", result.usualEditionWarning));
  return section;
}

function renderDetails(result: Quote): HTMLElement {
  const fold = renderFold("Details", "fold-details");
  fold.dataset.quoteLabel = result.label;
  fold.dataset.quoteHours = String(result.hours);
  fold.dataset.quoteEdition = result.edition;
  fold.dataset.quoteShape = result.shape;

  if (result.parcel) {
    const allowance =
      result.parcel.maxExtras === 1 ? "1 extra option" : `${result.parcel.maxExtras} extra options`;
    fold.append(
      el(
        "p",
        "rule",
        `${result.extraCount} of ${allowance}. Extras stay at item price. The ${result.parcel.label} rate still covers the package.`,
      ),
    );
  } else {
    fold.append(el("p", "rule", "No package matches this set, so each piece is at item price."));
  }

  const pages =
    result.selection.websitePages > starterPageCap
      ? "More than 30 website pages"
      : "30 website pages or fewer";
  fold.append(el("p", "counts", pages));

  const facts = el("section", "facts");
  facts.append(el("h3", undefined, "Included with this edition"));
  facts.append(el("p", "facts-note", "These come with the licence. They do not add build hours."));
  const factList = el("ul");
  for (const fact of editionFacts[result.edition]) factList.append(el("li", undefined, fact));
  facts.append(factList);
  fold.append(facts);

  if (result.restore) fold.append(el("p", "restore", restoreCopy(result)));
  fold.append(renderBreakdown(result));

  const notes = el("ul", "assumptions");
  for (const note of result.assumptions) notes.append(el("li", undefined, note));
  fold.append(notes);

  const print = el("button", "print");
  print.type = "button";
  print.dataset.action = "print";
  print.dataset.focus = "print";
  print.textContent = "Print this set";
  fold.append(print);
  return fold;
}

function renderRail(result: Quote): HTMLElement {
  const stack = el("div", "rail-stack");
  stack.append(
    renderTotals(result),
    renderEdition(result),
    renderSpeed(result),
    renderDetails(result),
  );
  return stack;
}

function gauge(label: string, score: number): HTMLElement {
  const wrap = el("div", `gauge ${scoreClass(score)}`);
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${label} ${score}`);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 36 36");
  svg.setAttribute("aria-hidden", "true");
  const radius = 15.5;
  const length = 2 * Math.PI * radius;
  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("class", "gauge-track");
  track.setAttribute("cx", "18");
  track.setAttribute("cy", "18");
  track.setAttribute("r", String(radius));
  const value = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  value.setAttribute("class", "gauge-value");
  value.setAttribute("cx", "18");
  value.setAttribute("cy", "18");
  value.setAttribute("r", String(radius));
  value.setAttribute("stroke-dasharray", `${(score / 100) * length} ${length}`);
  value.setAttribute("transform", "rotate(-90 18 18)");
  svg.append(track, value);
  wrap.append(svg, el("span", "gauge-num", String(score)), el("span", "gauge-label", label));
  return wrap;
}

function renderSpeed(result: Quote): HTMLElement {
  const section = renderFold("PageSpeed", "fold-speed");
  section.append(
    el(
      "p",
      "facts-note",
      "Performance, accessibility, SEO, and security from the build. Not a live Lighthouse run.",
    ),
  );
  const scores = el("div", "speed-scores");
  const items: { label: string; score: number }[] = [
    { label: "Mobile", score: result.pageSpeed.mobile },
    { label: "Desktop", score: result.pageSpeed.desktop },
    { label: "Accessibility", score: result.pageSpeed.accessibility },
    { label: "SEO", score: result.pageSpeed.seo },
    { label: "Security", score: result.pageSpeed.security },
  ];
  for (const item of items) scores.append(gauge(item.label, item.score));
  section.append(scores);
  const notes = el("ul", "reasons");
  for (const note of result.pageSpeed.notes) notes.append(el("li", undefined, note));
  section.append(notes);
  const cover = el("div", "speed-cover");
  cover.append(el("span", "badge badge-planned", badgeLabel.planned));
  section.append(cover);
  return section;
}

function renderBreakdown(result: Quote): HTMLElement {
  const details = el("details", "breakdown");
  details.open = true;
  details.append(el("summary", undefined, "Hours"));
  const list = el("ul", "lines");
  for (const line of result.lines) {
    if (line.bucket === "content") continue;
    if (line.openHours === 0 && line.id !== "foundation") continue;
    const row = el("li", line.extra ? "line is-extra" : "line");
    let name = line.label;
    if (line.mode) name = `${line.label} · ${line.mode}`;
    else if (line.unit && line.unit !== "hours")
      name = `${line.label} · ${quantityLabel(line.unit, line.qty)}`;
    row.append(el("span", undefined, name));
    row.append(el("span", "line-hours", `${formatHours(line.openHours)}h`));
    list.append(row);
  }
  if (result.savedHours > 0 && result.parcel) {
    const cut = el("li", "line is-cut");
    const percent = Math.round(result.discountRate * 100);
    cut.append(el("span", undefined, `${result.parcel.label} ${percent}% on the package`));
    cut.append(el("span", "line-hours", `−${formatHours(result.savedHours)}h`));
    list.append(cut);
  }
  const packaged = el("li", "line");
  packaged.append(el("span", undefined, "Package"));
  packaged.append(el("span", "line-hours", `${formatHours(result.packageHours)}h`));
  list.append(packaged);
  if (result.contentHours > 0) {
    const content = el("li", "line");
    content.append(el("span", undefined, "Content"));
    content.append(el("span", "line-hours", `${formatHours(result.contentHours)}h`));
    list.append(content);
  }
  const total = el("li", "line is-total");
  total.append(el("span", undefined, "Total"));
  total.append(el("span", "line-hours", `${formatHours(result.hours)}h`));
  list.append(total);
  details.append(list);
  return details;
}

function shapeName(result: Quote): string {
  return result.parcel?.label ?? "Custom";
}

function switchMessage(
  current: Selection,
  next: Selection,
  tileId: string,
  dir: "up" | "down" | "other",
): string {
  const from = quote(current);
  const to = quote(next);
  let lead = `This leaves ${shapeName(from)}`;
  const band = from.parcel?.items.find((item) => item.tileId === tileId);
  if (band && dir !== "other") {
    const piece = getTile(tileId);
    const edge = dir === "up" ? band.max : band.min;
    const amount = piece.unit ? quantityLabel(piece.unit, edge) : String(edge);
    lead =
      dir === "up"
        ? `${shapeName(from)} holds ${amount}`
        : `${shapeName(from)} starts at ${amount}`;
  }
  return `${lead}. Click again to switch this set to ${shapeName(to)}.`;
}

function copyText(value: string): Promise<void> {
  const legacy = () => {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("copy failed");
  };
  if (!navigator.clipboard || !window.isSecureContext) return Promise.resolve().then(legacy);
  return navigator.clipboard.writeText(value).catch(() => legacy());
}

function gate(key: string, next: Selection, message: string): void {
  if (quote(selection).shape === quote(next).shape) {
    commit(next);
    return;
  }
  if (pending?.key === key) {
    commit(pending.next);
    return;
  }
  pending = { key, message, next };
  draw();
}

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button");
  if (!(button instanceof HTMLButtonElement)) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === "reset") {
    commit(selectionForShape("lite"));
    return;
  }
  if (action === "share") {
    void copyText(location.href).then(
      () => {
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = "Share";
        }, 1600);
      },
      () => {
        button.textContent = "Copy failed";
        window.setTimeout(() => {
          button.textContent = "Share";
        }, 1600);
      },
    );
    return;
  }
  if (action === "pages-over") {
    const pages =
      selection.websitePages > starterPageCap ? defaultWebsitePages : starterPageCap + 1;
    commit(setWebsitePages(selection, pages));
    return;
  }
  if (action === "print") {
    window.print();
    return;
  }
  if (action === "shape" && id && isShapeId(id)) {
    commit(selectionForShape(id, selection.websitePages, selection.blogSetupMode));
    return;
  }
  if (action === "pages") {
    const next =
      button.dataset.dir === "inc" ? selection.websitePages + 1 : selection.websitePages - 1;
    commit(setWebsitePages(selection, next));
    return;
  }
  if (action === "mode" && id) {
    const level = Number(button.dataset.qty);
    if (!Number.isFinite(level)) return;
    const next = setQuantity(selection, id, level);
    gate(`mode:${id}:${level}`, next, switchMessage(selection, next, id, "other"));
    return;
  }
  if (action === "blog-mode" && button.dataset.qty && isBlogSetupMode(button.dataset.qty)) {
    commit(setBlogSetupMode(selection, button.dataset.qty));
    return;
  }
  if (action === "tile" && id) {
    const turningOn = selection.tiles[id] === undefined;
    const next = setTile(selection, id, turningOn);
    gate(
      `tile:${id}:${turningOn ? "on" : "off"}`,
      next,
      switchMessage(selection, next, id, "other"),
    );
    return;
  }
  if ((action === "dec" || action === "inc") && id) {
    const qty = selection.tiles[id];
    if (qty === undefined) return;
    const step = getTile(id).step;
    const nextQty = qty + (action === "inc" ? step : -step);
    const next = stepQuantity(selection, id, nextQty);
    const dir = action === "inc" ? "up" : "down";
    gate(`step:${id}:${nextQty}`, next, switchMessage(selection, next, id, dir));
  }
});

app.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const qty = Number(input.value);
  if (!Number.isFinite(qty)) return;
  if (input.dataset.action === "pages") {
    commit(setWebsitePages(selection, qty));
    return;
  }
  const id = input.dataset.id;
  if (!id) return;
  if (input.dataset.action === "hours") {
    commit(setQuantity(selection, id, qty));
    return;
  }
  if (input.dataset.action === "qty") {
    const current = selection.tiles[id] ?? qty;
    const next = stepQuantity(selection, id, qty);
    if (qty === current) {
      commit(next);
      return;
    }
    const dir = qty > current ? "up" : "down";
    gate(`step:${id}:${qty}`, next, switchMessage(selection, next, id, dir));
  }
});

window.addEventListener("hashchange", () => {
  const decoded = decodeSelection(location.hash);
  if (!decoded) return;
  pending = null;
  selection = decoded;
  draw();
});

commit(selection);
