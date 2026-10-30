import {
  badgeLabel,
  defaultWebsitePages,
  type Edition,
  editionLabel,
  getTile,
  groups,
  type HubId,
  hubName,
  inclusionNote,
  inclusionPopovers,
  inclusionsFor,
  isAlwaysOn,
  shapeChoices,
  starterPageCap,
  type Tile,
  tileHours,
  tilesInGroup,
} from "./catalog.ts";
import { type ProductIconId, productIconPaths } from "./product-icons.ts";
import {
  decodeSelection,
  encodeSelection,
  formatHours,
  type HourLine,
  type Quote,
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setTile,
  setWebsitePages,
  stepQuantity,
} from "./quote.ts";

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) throw new Error("Missing #app");

let selection: Selection = decodeSelection(location.hash) ?? selectionForShape("essential");
let includedOpen = true;

function commit(next: Selection): void {
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
  if (qty === 1 && unit.endsWith("s")) return `1 ${unit.slice(0, -1)}`;
  return `${qty} ${unit}`;
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

function cornerTier(edition: Edition, text: string): HTMLElement {
  const badge = tierPill(edition, text);
  badge.classList.add("badge", "is-sm", "is-tr", "is-corner");
  return badge;
}

function hourBadge(hours: string, bucket: "design" | "implementation" | "content"): HTMLElement {
  const kind = bucket === "design" ? "is-design" : bucket === "content" ? "is-content" : "is-build";
  return el("span", `badge is-lg is-br is-hours is-corner ${kind}`, hours);
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
  const title = el("p", "nav-title");
  title.append(el("span", undefined, "Website packages"), el("span", "nav-beta", "Beta"));
  brand.append(resultifyLogo(), title);
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
  const copy = copyHoursButton("nav-btn", "copy-hours-nav");
  const json = el("button", "nav-btn");
  json.type = "button";
  json.disabled = true;
  json.textContent = "JSON";
  const save = el("button", "nav-btn");
  save.type = "button";
  save.disabled = true;
  save.textContent = "Save";
  const login = el("button", "nav-btn");
  login.type = "button";
  login.disabled = true;
  login.textContent = "Login";
  tools.append(reset, share, copy, json, save, login);
  header.append(brand, tools);
  return header;
}

function renderLayout(result: Quote): HTMLElement {
  const layout = el("div", "layout");
  const side = el("div", "side");
  side.append(renderShapes(result), renderSpeed(result));
  layout.append(side, renderBoard(result), renderRail(result));
  return layout;
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
  const wrap = el("span", on ? "nav-btn page-cap is-on" : "nav-btn page-cap");
  const button = el("button", "page-cap-toggle");
  button.type = "button";
  button.dataset.action = "pages-over";
  button.dataset.focus = "pages-over";
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.textContent = "30+ pages";
  const info = el("button", "page-cap-info");
  info.type = "button";
  info.setAttribute("aria-label", "About 30+ pages");
  info.setAttribute("aria-describedby", "page-cap-note");
  info.append(infoMark());
  const note = el("div", "info-note", "More than 30 website pages needs Professional.");
  note.id = "page-cap-note";
  bindClickPopover(info, note);
  wrap.append(button, info, note);
  return wrap;
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
  nav.setAttribute("aria-label", "Project package");
  for (const shape of shapeChoices) {
    const on = result.shape === shape.id;
    const card = el("div", on ? "shape is-on" : "shape");
    card.dataset.id = shape.id;
    if (on) card.setAttribute("aria-current", "true");
    card.append(el("span", "shape-name", shape.label), el("p", "shape-line", shape.customer));
    nav.append(card);
  }
  return nav;
}

function renderBoard(result: Quote): HTMLElement {
  const board = el("div", "board");
  const blogIds = new Set([
    "blog-list",
    "blog-post",
    "blog-setups",
    "blog-list-count",
    "blog-post-count",
    "blog-recent",
  ]);
  const catalogueIds = new Set([
    "product-catalogue",
    "catalogue-crm",
    "catalogue-objects",
    "favorite-products",
    "related-products",
  ]);
  for (const group of groups) {
    const section = el("section", `group is-${group.layout} is-${group.id}`);
    if (group.label) section.append(el("h2", undefined, group.label));
    if (group.note) section.append(el("p", "group-note", group.note));
    const grid = el("div", `tiles is-${group.layout}`);
    let blogPlaced = false;
    let cataloguePlaced = false;
    for (const item of tilesInGroup(group.id)) {
      if (blogIds.has(item.id)) {
        if (!blogPlaced) {
          grid.append(renderBlog(result));
          blogPlaced = true;
        }
        continue;
      }
      if (catalogueIds.has(item.id)) {
        if (!cataloguePlaced) {
          grid.append(renderCatalogue(result));
          cataloguePlaced = true;
        }
        continue;
      }
      if (item.id === "ai-design") {
        grid.append(renderAiDesignTile(result));
        continue;
      }
      if (item.id === "custom-design") {
        grid.append(renderDesignTile(result));
        continue;
      }
      grid.append(renderTile(result, item.id));
    }
    section.append(grid);
    board.append(section);
  }
  return board;
}

function stepClass(): string {
  return "step";
}

function renderStepper(tile: Tile, qty: number): HTMLElement {
  const step = tile.step;
  const stepper = el("div", "stepper");
  const dec = el("button", stepClass());
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
  const inc = el("button", stepClass());
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

function renderModeButton(
  id: string,
  label: string,
  level: number,
  qty: number,
): HTMLButtonElement {
  const modeButton = el("button", level === qty ? "mode is-on" : "mode");
  modeButton.type = "button";
  modeButton.dataset.action = "mode";
  modeButton.dataset.id = id;
  modeButton.dataset.qty = String(level);
  modeButton.dataset.focus = `mode-${id}-${level}`;
  modeButton.setAttribute("aria-pressed", level === qty ? "true" : "false");
  modeButton.textContent = label;
  return modeButton;
}

function renderModes(id: string, modes: readonly { label: string }[], qty: number): HTMLElement {
  const wrap = el("div", "modes");
  for (const [index, mode] of modes.entries()) {
    wrap.append(renderModeButton(id, mode.label, index + 1, qty));
  }
  return wrap;
}

function renderCatalogueComplexity(
  id: string,
  modes: readonly { label: string; hours: number; detail?: string; group?: string }[],
  qty: number,
): HTMLElement {
  const block = el("div", "complexity");
  const choices = el("div", "complexity-choices");
  let index = 0;
  while (index < modes.length) {
    const mode = modes[index];
    if (!mode) break;
    if (!mode.group) {
      choices.append(renderModeButton(id, mode.label, index + 1, qty));
      index += 1;
      continue;
    }
    const groupName = mode.group;
    const group = el("div", "mode-group");
    group.append(el("p", "mode-kicker", groupName));
    const row = el("div", "modes");
    while (index < modes.length && modes[index]?.group === groupName) {
      const grouped = modes[index];
      if (grouped) row.append(renderModeButton(id, grouped.label, index + 1, qty));
      index += 1;
    }
    group.append(row);
    choices.append(group);
  }
  block.append(choices);
  const selected = modes[qty - 1];
  if (selected?.detail) block.append(el("p", "tile-summary", selected.detail));
  return block;
}

function renderBlogPart(result: Quote, id: string, countId: string, setups: number): HTMLElement {
  const tile = getTile(id);
  const modeQty = result.selection.tiles[id] ?? 1;
  const count = result.selection.tiles[countId] ?? 1;
  const part = el("div", "blog-part is-on");
  const head = el("div", "tile-button");
  const top = el("span", "tile-top");
  top.append(el("span", "tile-name", tile.label));
  const line = result.lines.find((item) => item.id === id);
  head.append(top);
  head.append(el("span", "tile-summary", tile.modes?.[modeQty - 1]?.detail ?? tile.summary));
  part.append(head);
  if (line) part.append(hourBadge(`${formatHours(line.openHours)}h`, tile.bucket));
  if (tile.modes) part.append(renderModes(id, tile.modes, modeQty));
  if (setups > 1) part.append(renderStepper(getTile(countId), count));
  return part;
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
  button.append(el("span", "tile-summary", setups.summary));
  card.append(button);
  const hours = result.lines.find((item) => item.id === "blog-setups")?.openHours ?? 0;
  if (on && hours > 0) card.append(hourBadge(`${formatHours(hours)}h`, setups.bucket));
  if (on && qty !== undefined) card.append(renderStepper(setups, qty));
  const parts = el("div", on ? "blog-parts" : "blog-parts is-off");
  if (on && qty !== undefined) {
    parts.append(
      renderBlogPart(result, "blog-list", "blog-list-count", qty),
      renderBlogPart(result, "blog-post", "blog-post-count", qty),
    );
  }
  card.append(parts);
  if (on) card.append(renderTile(result, "blog-recent"));
  return card;
}

function catalogueTotal(result: Quote): number {
  const ids = ["product-catalogue", "favorite-products", "related-products"] as const;
  return ids.reduce((sum, id) => {
    const line = result.lines.find((item) => item.id === id);
    return sum + (line?.openHours ?? 0);
  }, 0);
}

function renderCatalogue(result: Quote): HTMLElement {
  const on = result.selection.tiles["product-catalogue"] !== undefined;
  const card = el("article", on ? "blog-set catalogue-set is-on" : "blog-set catalogue-set");
  const button = el("button", "tile-button");
  button.type = "button";
  button.dataset.action = "tile";
  button.dataset.id = "product-catalogue";
  button.dataset.focus = "tile-product-catalogue";
  button.setAttribute("aria-pressed", on ? "true" : "false");
  const catalogue = getTile("product-catalogue");
  const top = el("span", "tile-top");
  top.append(el("span", "seat"), el("span", "tile-name", "Product catalogue"));
  button.append(top);
  card.append(button);
  if (on) {
    const total = catalogueTotal(result);
    if (total > 0) card.append(hourBadge(`${formatHours(total)}h`, catalogue.bucket));
  }
  card.append(el("p", "tile-name", "Source"));
  const sources = el("div", "source-list");
  const hubdbWrap = el("div", "source-live");
  const hubdb = el("button", on ? "mode is-on" : "mode");
  hubdb.type = "button";
  hubdb.dataset.action = "tile-on";
  hubdb.dataset.id = "product-catalogue";
  hubdb.dataset.focus = "source-hubdb";
  hubdb.setAttribute("aria-pressed", on ? "true" : "false");
  hubdb.textContent = "HubDB";
  hubdbWrap.append(hubdb, cornerTier("professional", "Pro"));
  sources.append(hubdbWrap);
  sources.append(
    renderPlannedSource("CRM Object", "professional", "Pro"),
    renderPlannedSource("Custom Object", "enterprise", "Ent"),
  );
  card.append(sources);
  const level = result.selection.tiles["product-catalogue"];
  if (on && catalogue.modes && level !== undefined) {
    card.append(el("p", "tile-name", "Complexity"));
    card.append(renderCatalogueComplexity("product-catalogue", catalogue.modes, level));
  }
  if (on) {
    const addons = el("div", "blog-parts");
    addons.append(renderTile(result, "favorite-products"));
    if (level !== 1) addons.append(renderTile(result, "related-products"));
    card.append(addons);
  }
  return card;
}

function renderPlannedSource(label: string, edition: Edition, mark: string): HTMLElement {
  const item = el("div", "source-choice is-planned");
  item.append(el("span", "source-choice-name", label));
  const cover = el("div", "tile-cover");
  cover.append(el("span", "badge badge-planned is-md is-bl is-corner", badgeLabel.planned));
  item.append(cover, cornerTier(edition, mark));
  return item;
}

function renderDesignTile(result: Quote): HTMLElement {
  const tile = getTile("custom-design");
  const on = result.selection.tiles["custom-design"] !== undefined;
  const card = el("article", on ? "design-card tile is-on" : "design-card tile");
  const button = el("button", "tile-button");
  button.type = "button";
  button.dataset.action = "tile";
  button.dataset.id = "custom-design";
  button.dataset.focus = "tile-custom-design";
  button.setAttribute("aria-pressed", on ? "true" : "false");
  const top = el("span", "tile-top");
  top.append(el("span", "seat"), el("span", "tile-name", tile.label));
  button.append(top);
  card.append(button, el("p", "design-lead", tile.summary), renderDesignRates());
  if (on) {
    const foot = el("div", "design-foot");
    foot.append(renderFeedback(result, "design-feedback"));
    card.append(foot);
  }
  card.append(hourBadge(`${formatHours(on ? designHoursFor(result, "design-") : 0)}h`, "design"));
  return card;
}

function renderLabeledStepper(label: string, tile: Tile, qty: number): HTMLElement {
  const row = el("div", "design-feedback-row");
  row.append(el("span", "design-feedback-label", label), renderStepper(tile, qty));
  return row;
}

function renderFeedback(result: Quote, id: string): HTMLElement {
  const tile = getTile(id);
  const qty = result.selection.tiles[id] ?? tile.initial;
  const wrap = el("div", "design-feedback");
  wrap.append(
    renderLabeledStepper("Feedback", tile, qty),
    el("p", "design-feedback-note", tile.summary),
  );
  return wrap;
}

function designHoursFor(result: Quote, prefix: string): number {
  return result.lines.reduce((sum, line) => {
    if (!line.id.startsWith(prefix)) return sum;
    return sum + line.openHours;
  }, 0);
}

function renderAiDesignTile(result: Quote): HTMLElement {
  const tile = getTile("ai-design");
  const qty = result.selection.tiles["ai-design"];
  const on = qty !== undefined;
  const card = el("article", on ? "design-card tile is-on" : "design-card tile");
  const button = el("button", "tile-button");
  button.type = "button";
  button.dataset.action = "tile";
  button.dataset.id = "ai-design";
  button.dataset.focus = "tile-ai-design";
  button.setAttribute("aria-pressed", on ? "true" : "false");
  const top = el("span", "tile-top");
  top.append(el("span", "seat"), el("span", "tile-name", tile.label));
  button.append(top);
  card.append(button, el("p", "design-lead", tile.summary));
  if (on && qty !== undefined) {
    const foot = el("div", "design-foot");
    foot.append(renderLabeledStepper("Variants", tile, qty), renderFeedback(result, "ai-feedback"));
    card.append(foot);
  }
  const hours = on ? designHoursFor(result, "ai-") : previewAiHours(result);
  const badge = hourBadge(`${formatHours(hours)}h`, "design");
  if (!on) badge.classList.add("is-idle");
  card.append(badge);
  return card;
}

function previewAiHours(result: Quote): number {
  const without = { ...result.selection, tiles: { ...result.selection.tiles } };
  delete without.tiles["ai-design"];
  const priced = quote({ ...without, tiles: { ...without.tiles, "ai-design": 2 } });
  return designHoursFor(priced, "ai-");
}

const designRates = [
  "2h each page template",
  "2h each landing page",
  "3h each section",
  "2h or 8h menu",
  "2h global header",
  "3h global footer",
  "4h custom forms",
  "3h or 6h search",
  "5h custom system templates",
  "4h setup and launch",
  "4h or 6h each blog list",
  "4h or 6h each blog post",
  "3h recent posts",
  "3h each HubDB section",
  "16h, 10h, 18h, or 28h product catalogue",
  "3h each favorite products",
  "3h related products",
  "6h each extra feedback round",
];

function renderDesignRates(): HTMLElement {
  const wrap = el("span", "design-pop");
  const btn = el("button", "design-pop-btn");
  btn.type = "button";
  btn.textContent = "Design hours";
  const panel = el("div", "design-pop-panel");
  const facts = el("ul", "design-facts");
  for (const fact of designRates) facts.append(el("li", undefined, fact));
  panel.append(facts);
  bindClickPopover(btn, panel);
  wrap.append(btn, panel);
  return wrap;
}

function bindClickPopover(trigger: HTMLElement, panel: HTMLElement): void {
  panel.popover = "manual";
  trigger.setAttribute("aria-expanded", "false");
  const place = () => {
    const box = trigger.getBoundingClientRect();
    const width = panel.getBoundingClientRect().width || 240;
    const left = Math.min(box.left, window.innerWidth - width - 8);
    panel.style.right = "auto";
    panel.style.left = `${Math.max(8, left)}px`;
    panel.style.maxHeight = "none";
    const needed = panel.scrollHeight;
    const below = window.innerHeight - box.bottom - 12;
    const above = box.top - 12;
    const openUp = needed > below && above > below;
    panel.style.maxHeight = `${Math.min(360, Math.max(120, openUp ? above : below))}px`;
    if (openUp) {
      panel.style.top = "auto";
      panel.style.bottom = `${window.innerHeight - box.top + 6}px`;
      return;
    }
    panel.style.bottom = "auto";
    panel.style.top = `${box.bottom + 6}px`;
  };
  const close = () => {
    if (panel.matches(":popover-open")) panel.hidePopover();
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onDoc, true);
  };
  const onDoc = (event: Event) => {
    if (!panel.isConnected) {
      document.removeEventListener("click", onDoc, true);
      return;
    }
    const target = event.target;
    if (target instanceof Node && (trigger.contains(target) || panel.contains(target))) return;
    close();
  };
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (panel.matches(":popover-open")) {
      close();
      return;
    }
    panel.showPopover();
    place();
    trigger.setAttribute("aria-expanded", "true");
    window.setTimeout(() => document.addEventListener("click", onDoc, true), 0);
  });
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

function blockedTile(result: Quote, id: string): boolean {
  if (id === "blog-recent") return result.selection.tiles["blog-setups"] === undefined;
  if (id === "favorite-products" || id === "related-products") {
    return result.selection.tiles["product-catalogue"] === undefined;
  }
  return false;
}

function renderTile(result: Quote, id: string): HTMLElement {
  const line = result.lines.find((item) => item.id === id);
  const qty = result.selection.tiles[id];
  const on = qty !== undefined;
  const tile = getTile(id);
  const locked = isAlwaysOn(id);
  const blocked = blockedTile(result, id);
  const card = el("article", on ? "tile is-on" : "tile");
  if (tile.disabled || blocked) card.classList.add("is-disabled");
  if (locked) card.classList.add("is-locked");

  const button = locked ? el("div", "tile-button") : el("button", "tile-button");
  if (button instanceof HTMLButtonElement) {
    button.type = "button";
    button.dataset.action = "tile";
    button.disabled = tile.disabled === true || blocked;
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }
  button.dataset.id = id;
  button.dataset.focus = `tile-${id}`;

  const top = el("span", "tile-top");
  top.append(el("span", "seat"));
  top.append(el("span", "tile-name", tile.label));
  const cornerMark = tile.mark === "Pro" || tile.mark === "Ent";
  if (tile.mark && !cornerMark) {
    const flags = el("span", "tile-flags");
    flags.append(markBadge(tile.mark));
    top.append(flags);
  }
  button.append(top);

  const shownQty = on ? (qty ?? tile.initial) : tile.initial;
  const shownHours = on && line ? line.openHours : tileHours(tile, shownQty);
  const includedLanguage = tile.id === "languages" && shownQty === 1 && shownHours === 0;
  let hoursLabel: string | null = null;
  if (!tile.disabled && !includedLanguage) {
    const meta = el("span", "tile-meta");
    if (tile.hourInput) {
      if (on) hoursLabel = `${formatHours(shownQty)}h`;
      else meta.append(el("span", undefined, "Set the hours"));
    } else if (on && tile.id === "blog-setups" && shownQty === 1 && shownHours === 0) {
      meta.append(el("span", undefined, "Included"));
    } else if (shownHours > 0) {
      hoursLabel = `${formatHours(shownHours)}h`;
      if (on && tile.stepped) {
        meta.append(el("span", undefined, quantityLabel(tile.unit ?? "", shownQty)));
      }
    }
    if (meta.childNodes.length > 0) button.append(meta);
  }
  const summary = tile.modes?.[shownQty - 1]?.detail ?? tile.summary;
  if (summary) button.append(el("span", "tile-summary", summary));
  if (tile.note) button.append(el("span", "tile-note", tile.note));
  card.append(button);
  if (hoursLabel) {
    const badge = hourBadge(hoursLabel, tile.bucket);
    if (!on) badge.classList.add("is-idle");
    card.append(badge);
  }
  if (cornerMark && tile.mark) {
    card.append(cornerTier(tile.mark === "Ent" ? "enterprise" : "professional", tile.mark));
  }

  if (on && !blocked && tile.modes && qty !== undefined)
    card.append(renderModes(id, tile.modes, qty));

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

  if (on && !blocked && tile.stepped && qty !== undefined && !tile.hourInput) {
    card.append(renderStepper(tile, qty));
  }

  if (tile.badge === "planned") {
    card.classList.add("is-planned");
    const cover = el("div", "tile-cover");
    cover.append(el("span", "badge badge-planned is-md is-bl is-corner", badgeLabel.planned));
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
  section.dataset.shape = result.shape;
  section.setAttribute("aria-label", "Hours");
  const banner = el("div", "totals-banner");
  banner.append(el("h2", "parcel-label", result.label));
  const body = el("div", "totals-body");
  const parts = [
    { key: "design", label: "Design", hours: result.designHours },
    { key: "build", label: "Implementation", hours: result.implementationHours },
    { key: "content", label: "Content", hours: result.contentHours },
  ] as const;
  for (const part of parts) body.append(totalLine(part.label, part.hours, part.key));
  body.append(totalsBar(parts));
  body.append(totalLine("Total", result.hours));
  section.append(banner, body);
  return section;
}

function totalsBar(parts: readonly { key: string; hours: number }[]): HTMLElement {
  const track = el("div", "totals-bar");
  for (const part of parts) {
    if (part.hours <= 0) continue;
    const segment = el("span", `totals-seg is-${part.key}`);
    segment.style.flexGrow = String(part.hours);
    track.append(segment);
  }
  return track;
}

function totalLine(label: string, hours: number, key?: string): HTMLElement {
  const line = el("div", key ? `total-row is-${key}` : "total-row is-sum");
  const value = el("span", "total-value", `${formatHours(hours)}h`);
  if (!key) value.ariaLive = "polite";
  if (key) {
    const name = el("span", "total-name");
    name.append(el("span", "totals-dot"), el("span", "total-label", label));
    line.append(name, value);
  } else {
    line.append(el("span", "total-label", label), value);
  }
  return line;
}

function renderDetails(result: Quote): HTMLElement {
  const section = el("section", "rail");
  section.dataset.quoteLabel = result.label;
  section.dataset.quoteHours = String(result.hours);
  section.dataset.quoteEdition = result.edition;
  section.dataset.quoteShape = result.shape;

  const facts = el("details", "facts");
  facts.open = includedOpen;
  facts.addEventListener("toggle", () => {
    includedOpen = facts.open;
  });
  facts.append(el("summary", undefined, "Always included"));
  facts.append(el("p", "facts-note", inclusionNote(result.edition)));
  appendInclusions(facts, result);
  section.append(facts);

  section.append(renderBreakdown(result));
  return section;
}

function renderEdition(result: Quote): HTMLElement {
  const section = el("section", "rail edition");
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

function appendInclusions(parent: HTMLElement, result: Quote): void {
  const list = el("ul", "included-list");
  for (const item of inclusionsFor(result.shape)) list.append(renderInclusionItem(item));
  parent.append(list);
}

function renderInclusionItem(label: string): HTMLElement {
  const item = el("li");
  const note = inclusionPopovers[label];
  if (note === undefined) {
    item.textContent = label;
    return item;
  }
  const button = el("button", "included-pop-btn");
  button.type = "button";
  button.textContent = label;
  const panel = el("div", "included-pop-panel");
  if (note.text) panel.append(el("p", "included-pop-copy", note.text));
  if (note.items) {
    panel.classList.add("is-list");
    const variants = el("ul", "included-pop-list");
    for (const variant of note.items) variants.append(el("li", undefined, variant));
    panel.append(variants);
  }
  const demoHref = note.demo;
  if (typeof demoHref === "string") {
    const demo = el("a", "included-demo");
    demo.textContent = "Demo";
    demo.href = demoHref;
    demo.target = "_blank";
    demo.rel = "noopener noreferrer";
    panel.append(demo);
  } else if (demoHref) {
    const demo = el("button", "included-demo");
    demo.type = "button";
    demo.textContent = "Demo";
    panel.append(demo);
  }
  bindClickPopover(button, panel);
  item.append(button, panel);
  return item;
}

function renderRail(result: Quote): HTMLElement {
  const stack = el("div", "rail-stack");
  stack.append(renderTotals(result), renderEdition(result), renderDetails(result));
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
  const section = el("section", "speed");
  section.setAttribute("aria-label", "PageSpeed Insights");
  section.append(el("h2", undefined, "PageSpeed Insights"));
  const top = el("div", "speed-row");
  top.append(gauge("Mobile", result.pageSpeed.mobile), gauge("Desktop", result.pageSpeed.desktop));
  const bottom = el("div", "speed-row");
  bottom.append(
    gauge("Accessibility", result.pageSpeed.accessibility),
    gauge("SEO", result.pageSpeed.seo),
    gauge("Security", result.pageSpeed.security),
  );
  section.append(top, bottom);
  section.append(
    el("div", "speed-cover"),
    el("span", "badge badge-planned is-md is-bl is-corner", badgeLabel.planned),
  );
  return section;
}

function lineName(line: HourLine): string {
  if (line.mode && line.unit && line.unit !== "hours") {
    return `${line.label} · ${line.mode} · ${quantityLabel(line.unit, line.qty)}`;
  }
  if (line.mode) return `${line.label} · ${line.mode}`;
  if (line.unit && line.unit !== "hours") {
    return `${line.label} · ${quantityLabel(line.unit, line.qty)}`;
  }
  return line.label;
}

const breakdownGroups = [
  { key: "design", bucket: "design", label: "Design", total: "designHours" },
  { key: "build", bucket: "implementation", label: "Implementation", total: "implementationHours" },
  { key: "content", bucket: "content", label: "Content", total: "contentHours" },
] as const;

function groupRows(result: Quote, bucket: HourLine["bucket"]): HourLine[] {
  return result.lines.filter((line) => line.bucket === bucket && line.openHours > 0);
}

function hoursText(result: Quote): string {
  const out = [`Hours: ${result.label}`];
  for (const group of breakdownGroups) {
    const rows = groupRows(result, group.bucket);
    if (rows.length === 0) continue;
    out.push(`- ${group.label}: ${formatHours(result[group.total])}h`);
    const onlyRepeatsGroup = rows.length === 1 && rows[0]?.label === group.label;
    if (onlyRepeatsGroup) continue;
    for (const line of rows) out.push(`  - ${lineName(line)}: ${formatHours(line.openHours)}h`);
  }
  out.push(`- Total: ${formatHours(result.hours)}h`);
  return out.join("\n");
}

function copyHoursButton(className: string, focus: string): HTMLButtonElement {
  const button = el("button", className);
  button.type = "button";
  button.dataset.action = "copy-hours";
  button.dataset.focus = focus;
  button.textContent = "Copy";
  return button;
}

function renderBreakdown(result: Quote): HTMLElement {
  const details = el("details", "breakdown");
  details.open = true;
  details.append(el("summary", undefined, "Hours"));
  const list = el("ul", "lines");
  for (const group of breakdownGroups) {
    const rows = groupRows(result, group.bucket);
    if (rows.length === 0) continue;
    const head = el("li", `line-head is-${group.key}`);
    head.append(el("span", "totals-dot"), el("span", undefined, group.label));
    list.append(head);
    for (const line of rows) {
      const row = el("li", line.extra ? "line is-extra" : "line");
      row.append(el("span", undefined, lineName(line)));
      row.append(el("span", "line-hours", `${formatHours(line.openHours)}h`));
      list.append(row);
    }
  }
  const total = el("li", "line is-total");
  total.append(el("span", undefined, "Total"));
  total.append(el("span", "line-hours", `${formatHours(result.hours)}h`));
  list.append(total);
  details.append(list, copyHoursButton("copy-hours", "copy-hours-rail"));
  return details;
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

function copyWithFeedback(button: HTMLButtonElement, value: string): void {
  const label = button.textContent;
  const flash = (text: string) => {
    button.textContent = text;
    window.setTimeout(() => {
      button.textContent = label;
    }, 1600);
  };
  void copyText(value).then(
    () => flash("Copied"),
    () => flash("Copy failed"),
  );
}

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button");
  if (!(button instanceof HTMLButtonElement)) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === "reset") {
    commit(selectionForShape("essential"));
    return;
  }
  if (action === "share") {
    copyWithFeedback(button, location.href);
    return;
  }
  if (action === "copy-hours") {
    copyWithFeedback(button, hoursText(quote(selection)));
    return;
  }
  if (action === "pages-over") {
    const pages =
      selection.websitePages > starterPageCap ? defaultWebsitePages : starterPageCap + 1;
    commit(setWebsitePages(selection, pages));
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
    commit(setQuantity(selection, id, level));
    return;
  }
  if (action === "tile" && id) {
    const turningOn = selection.tiles[id] === undefined;
    commit(setTile(selection, id, turningOn));
    return;
  }
  if (action === "tile-on" && id) {
    if (selection.tiles[id] === undefined) commit(setTile(selection, id, true));
    return;
  }
  if ((action === "dec" || action === "inc") && id) {
    const qty = selection.tiles[id];
    if (qty === undefined) return;
    const step = getTile(id).step;
    const nextQty = qty + (action === "inc" ? step : -step);
    commit(stepQuantity(selection, id, nextQty));
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
  if (input.dataset.action === "qty") commit(stepQuantity(selection, id, qty));
});

window.addEventListener("hashchange", () => {
  const decoded = decodeSelection(location.hash);
  if (!decoded) return;
  selection = decoded;
  draw();
});

commit(selection);
