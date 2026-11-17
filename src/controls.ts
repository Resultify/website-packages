/* State, actions and the controls of the page. Hours and rules come only from quote.ts. */
import {
  catalogueId,
  defaultWebsitePages,
  designChoices,
  editionLabel,
  getTile,
  inclusionPopovers,
  inclusionsFor,
  isReady,
  packageName,
  partsOf,
  projectName,
  type ShapeId,
  shapeChoices,
  shelfSource,
  shelfTiles,
  sourceTiles,
  starterPageCap,
  type Tile,
  tiles,
} from "./catalog.ts";
import {
  designOf,
  encodeSelection,
  managementLineId,
  formatHours,
  type HourLine,
  isIn,
  packageRules,
  type Quote,
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setSource,
  setTile,
  setWebsitePages,
  stepQuantity,
} from "./quote.ts";

export const store = {
  selection: selectionForShape("essential") as Selection,
  open: new Set<string>(),
  /** Enabled items, oldest first. */
  order: [] as string[],
  /** Just enabled: scroll it into view if the middle column has to. */
  reveal: null as string | null,
};

let redraw: () => void = () => {};
export function setRedraw(fn: () => void): void {
  redraw = fn;
}

/** The middle column keeps the order items were enabled in. */
export function syncOrder(): void {
  const tiles = store.selection.tiles;
  store.order = store.order.filter((id) => isIn(tiles, id));
  for (const id of laneIds) {
    if (isIn(tiles, id) && !store.order.includes(id)) store.order.push(id);
  }
}

export function commit(next: Selection): void {
  store.selection = quote(next).selection;
  const hash = `#${encodeSelection(store.selection)}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
  syncOrder();
  redraw();
}

/* DOM helpers */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function btn(
  className: string,
  text: string,
  data: Record<string, string> = {},
): HTMLButtonElement {
  const node = el("button", className, text);
  node.type = "button";
  for (const [key, value] of Object.entries(data)) node.dataset[key] = value;
  if (data.action && !data.focus) node.dataset.focus = `${data.action}-${data.id ?? ""}`;
  return node;
}

export function hoursLabel(hours: number): string {
  return `${formatHours(hours)}h`;
}

export function lineHours(result: Quote, id: string): number {
  return result.lines.find((line) => line.id === id)?.openHours ?? 0;
}

/* The design hours of items: each design line says its item. Feedback rounds and variants belong to
   no item and stay in the Design block. */
export function designFor(result: Quote, ...ids: string[]): number {
  return result.lines
    .filter((line) => line.bucket === "design")
    .filter((line) => line.item !== undefined && ids.includes(line.item))
    .reduce((sum, line) => sum + line.openHours, 0);
}

/* Controls */

export function stepper(tile: Tile, qty: number, locked = false): HTMLElement {
  const wrap = el("div", locked ? "stepper is-locked" : "stepper");
  const noun = tile.unit ?? tile.label;
  const dec = btn("step-btn", "−", { action: "dec", id: tile.id, focus: `dec-${tile.id}` });
  dec.disabled = locked || qty - tile.step < tile.min;
  dec.setAttribute("aria-label", `Fewer ${noun}`);
  const input = el("input", "qty");
  input.id = `qty-${tile.id}`;
  input.type = "number";
  input.inputMode = "numeric";
  input.min = String(tile.min);
  input.max = String(tile.max);
  input.step = String(tile.step);
  input.value = String(qty);
  input.disabled = locked;
  input.dataset.action = "qty";
  input.dataset.id = tile.id;
  input.dataset.focus = `qty-${tile.id}`;
  input.setAttribute("aria-label", noun);
  const inc = btn("step-btn", "+", { action: "inc", id: tile.id, focus: `inc-${tile.id}` });
  inc.disabled = locked || qty + tile.step > tile.max;
  inc.setAttribute("aria-label", `More ${noun}`);
  wrap.append(dec, input, inc);
  return wrap;
}

function modeButton(
  id: string,
  label: string,
  level: number,
  qty: number,
  soon = false,
): HTMLButtonElement {
  const node = btn(level === qty ? "mode is-on" : "mode", label, {
    action: "mode",
    id,
    qty: String(level),
    focus: `mode-${id}-${level}`,
  });
  node.setAttribute("aria-pressed", level === qty ? "true" : "false");
  /* Coming soon: shown, and its reason with it, but it cannot be chosen */
  if (soon) {
    node.disabled = true;
    node.title = "In development";
  }
  return node;
}

export function modes(
  id: string,
  list: readonly { label: string; disabled?: boolean }[],
  qty: number,
): HTMLElement {
  const wrap = el("div", "modes");
  list.forEach((mode, index) => {
    wrap.append(modeButton(id, mode.label, index + 1, qty, mode.disabled));
  });
  return wrap;
}

export function hoursInput(id: string, label: string, value: number, max: number): HTMLElement {
  const input = el("input", "qty is-solo");
  input.id = `hours-${id}`;
  input.type = "number";
  input.inputMode = "numeric";
  input.min = "0";
  input.max = String(max);
  input.value = String(value);
  input.dataset.action = "hours";
  input.dataset.id = id;
  input.dataset.focus = `hours-${id}`;
  input.setAttribute("aria-label", label);
  return input;
}

/** The rule that moves the package, in a few words. Laid out even when hidden, so the row never moves. */
export function ruleFor(id: string, result: Quote): { text: string; on: boolean } | undefined {
  const rule = packageRules.find((item) => item.tileId === id);
  if (!rule || fromStart(rule)) return undefined;
  const name = packageName[rule.package];
  const mode = getTile(id).modes?.[rule.at - 1];
  /* An option coming soon cannot be chosen, so it moves nothing yet */
  if (mode?.disabled) return undefined;
  const rank = (shape: string) => shapeChoices.findIndex((item) => item.id === shape);
  return {
    text: `${mode ? mode.label : `${rule.at}+`} → ${name}`,
    on: rank(result.shape) < rank(rule.package),
  };
}

export function pagesControl(result: Quote): HTMLElement {
  const over = result.selection.websitePages > starterPageCap;
  const wrap = el("div", "modes");
  for (const [label, value] of [
    [`Up to ${starterPageCap}`, false],
    [`${starterPageCap}+`, true],
  ] as const) {
    const node = btn(value === over ? "mode is-on" : "mode", label, {
      action: "pages-over",
      over: value ? "1" : "0",
      focus: `pages-${value ? "over" : "under"}`,
    });
    node.setAttribute("aria-pressed", value === over ? "true" : "false");
    wrap.append(node);
  }
  return wrap;
}

/** In every estimate as they are: the header and footer, and setup and launch. They fold into one
    row of the site basics. */
export const fixedIds = ["header", "footer", "setup"] as const;

/** The site basics whose hours are Project (the kick-off and training, by their type in the table),
    and project management. They fold into a row of their own. */
export function projectIds(): string[] {
  return [
    ...tiles
      .filter((item) => item.place === "basics" && item.bucket === "project")
      .map((item) => item.id),
    managementLineId,
  ];
}

export function fixedHours(result: Quote): number {
  return fixedIds.reduce((sum, id) => sum + lineHours(result, id), 0);
}

/* Design */

export function designChoice(result: Quote, id: string, label: string): HTMLElement {
  const value = id;
  const on = result.selection.tiles[id] !== undefined;
  const wrap = el("label", on ? "choice is-on" : "choice");
  const input = el("input");
  input.id = `design-${value}`;
  input.type = "radio";
  input.name = "design";
  input.value = value;
  input.checked = on;
  input.dataset.action = "design";
  input.dataset.focus = `design-${value}`;
  wrap.append(input, el("span", "choice-name", label));
  return wrap;
}

/** Parts of the Design block and of the Blog, Product catalogue and Memberships cards: never items
    of their own. The catalogue's sources other than HubDB too: the catalogue is on the shelf as
    HubDB. */
export const partIds: readonly string[] = [
  ...designChoices.flatMap((choice) => [
    choice.id,
    ...(choice.feedbackId ? [choice.feedbackId] : []),
  ]),
  ...Object.values(partsOf).flat(),
  ...sourceTiles()
    .slice(1)
    .map((item) => item.id),
];

/** The shelf of the catalog in use, in the table's order (the order of each item's first row, the
    Blog's, the Product catalogue's and Memberships' too, wherever they are among the shelf's):
    laneIds          everything that moves between the estimate and the shelf
    blockedShelfIds  items that are coming soon (status soon in the table). They show locked at
                     the end of their group, so nobody forgets them, but cannot be added */
export function shelfLanes(): { laneIds: string[]; blockedShelfIds: string[] } {
  const onShelf = shelfTiles();
  return {
    laneIds: onShelf.filter(isReady).map((tile) => tile.id),
    blockedShelfIds: onShelf.filter((tile) => !isReady(tile)).map((tile) => tile.id),
  };
}

/** The page's shelf, from the files it was built with. */
export const {
  laneIds,
  blockedShelfIds,
}: { laneIds: readonly string[]; blockedShelfIds: readonly string[] } = shelfLanes();

/** A package rule that holds as soon as the item is in: from its first option, or from the least
    it can be (0 for hours entered, such as Custom integration). */
function fromStart(rule: { tileId: string; at: number }): boolean {
  return rule.at <= Math.max(1, getTile(rule.tileId).min);
}

/** Fixed groups for the shelf: what the item needs in itself, whatever the current package is.
    The Product catalogue needs what the source it comes with needs. */
export function shelfGroupOf(id: string): "Any package" | "Needs Growth" | "Needs Platform" {
  const own = id === catalogueId ? (shelfSource()?.id ?? id) : id;
  const rule = packageRules.find((item) => item.tileId === own && fromStart(item));
  if (rule?.package === "platform") return "Needs Platform";
  if (rule?.package === "growth") return "Needs Growth";
  return "Any package";
}

/* Popovers */

export function popover(label: string, content: Node[], className = "pop-btn"): HTMLElement {
  const wrap = el("span", "pop");
  const trigger = btn(className, label);
  trigger.dataset.focus = `pop-${label}`;
  const panel = el("div", "pop-panel");
  panel.append(...content);
  bindPopover(trigger, panel);
  wrap.append(trigger, panel);
  return wrap;
}

function bindPopover(trigger: HTMLElement, panel: HTMLElement): void {
  panel.popover = "manual";
  trigger.setAttribute("aria-expanded", "false");
  const place = () => {
    const box = trigger.getBoundingClientRect();
    const width = panel.getBoundingClientRect().width || 300;
    panel.style.right = "auto";
    panel.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - width - 8))}px`;
    panel.style.maxHeight = "none";
    const needed = panel.scrollHeight;
    const below = window.innerHeight - box.bottom - 12;
    const above = box.top - 12;
    const up = needed > below && above > below;
    panel.style.maxHeight = `${Math.min(460, Math.max(120, up ? above : below))}px`;
    if (up) {
      panel.style.top = "auto";
      panel.style.bottom = `${window.innerHeight - box.top + 6}px`;
    } else {
      panel.style.bottom = "auto";
      panel.style.top = `${box.bottom + 6}px`;
    }
  };
  const close = () => {
    if (panel.matches(":popover-open")) panel.hidePopover();
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onDoc, true);
    document.removeEventListener("keydown", onKey);
  };
  /* A manual popover gets no Escape from the browser: it closes here, back to its button */
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const open = panel.isConnected && panel.matches(":popover-open");
    close();
    if (!open) return;
    event.preventDefault();
    trigger.focus();
  };
  const onDoc = (event: Event) => {
    /* A redraw took it away: drop both document listeners, the click and the Escape one */
    if (!panel.isConnected) {
      close();
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
    document.addEventListener("keydown", onKey);
  });
}

/* Package and tier */

const rankOf = (shape: string) => shapeChoices.findIndex((item) => item.id === shape);
const reasonOnly = (text: string) => text.split(" → ")[0] ?? text;

function popHead(title: string, status: string): HTMLElement {
  const head = el("div", "pop-head");
  head.append(el("strong", "pop-title", title), el("span", "pop-status", status));
  return head;
}

function popList(title: string, lines: string[]): Node[] {
  if (lines.length === 0) return [];
  const list = el("ul", "pop-list");
  for (const line of lines) list.append(el("li", undefined, line));
  return [el("h3", "pop-sub", title), list];
}

/** What a package is and, on the estimate's own one, what puts the estimate there. */
export function packagePop(result: Quote, shape: ShapeId): Node[] {
  const me = rankOf(shape);
  const current = rankOf(result.shape);
  const label = shapeChoices[me]?.label ?? "";
  const status =
    me === current
      ? "This estimate"
      : me < current
        ? "Too small for this estimate"
        : "More than this estimate needs";
  const out: Node[] = [popHead(label, status)];
  const customer = shapeChoices[me]?.customer;
  if (customer) out.push(el("p", "pop-copy", customer));
  if (me === current) {
    const reasons = result.packageReasons.map(reasonOnly);
    out.push(
      ...popList(
        "Why this package",
        reasons.length > 0 ? reasons : ["Nothing selected needs more than Essential"],
      ),
    );
  }
  return out;
}

/** The estimate's tier and what puts it there. */
export function tierPop(result: Quote): Node[] {
  const out: Node[] = [popHead(editionLabel[result.edition], "This estimate")];
  /* The generic line would only repeat the list below, unless this tier is above the package's usual one. */
  if (result.edition === "starter" || result.usualEditionWarning)
    out.push(el("p", "pop-copy", tierLine(result)));
  if (result.edition !== "starter") {
    const reasons = result.editionReasons.map((text) =>
      text.replace(/\s+needs?\s+Content Hub \w+\.?$/, ""),
    );
    out.push(...popList("Why this tier", reasons));
  }
  return out;
}

export function tierLine(result: Quote): string {
  if (result.usualEditionWarning) return "More than this package usually needs.";
  if (result.edition === "starter") return "Removes HubSpot branding.";
  return "Needed for this estimate.";
}

export function includedList(result: Quote): HTMLElement {
  const list = el("ul", "pop-list");
  for (const label of inclusionsFor(result.shape)) {
    const item = el("li");
    const note = inclusionPopovers[label];
    if (!note) {
      item.textContent = label;
      list.append(item);
      continue;
    }
    const content: Node[] = [];
    if (note.text) content.push(el("p", "pop-copy", note.text));
    if (note.items) {
      const sub = el("ul", "pop-list");
      for (const variant of note.items) sub.append(el("li", undefined, variant));
      content.push(sub);
    }
    if (typeof note.demo === "string") {
      const demo = el("a", "pop-link", "Open demo");
      demo.href = note.demo;
      demo.target = "_blank";
      demo.rel = "noopener noreferrer";
      content.push(demo);
    }
    item.append(popover(label, content, "link"));
    list.append(item);
  }
  return list;
}

export function includedCount(result: Quote): number {
  return inclusionsFor(result.shape).length;
}

function quantityLabel(unit: string, qty: number): string {
  if (qty === 1 && unit.endsWith("s")) return `1 ${unit.slice(0, -1)}`;
  return `${qty} ${unit}`;
}

/** A line's name: what it is, its option, and how many, with the included ones when it has more. */
export function lineName(line: HourLine): string {
  const parts = [line.label];
  if (line.mode) parts.push(line.mode);
  if (line.unit && line.unit !== "hours") {
    const count = quantityLabel(line.unit, line.qty);
    const extra = line.included === undefined ? 0 : line.qty - line.included;
    parts.push(extra > 0 ? `${count} (${line.included} included, ${extra} extra)` : count);
  }
  return parts.join(" · ");
}

/* label is for the copied text, heading for the page: the same words, Build as everywhere on it */
export const breakdownGroups = [
  { key: "design", bucket: "design", label: "Design", heading: "Design", total: "designHours" },
  {
    key: "build",
    bucket: "implementation",
    label: "Build",
    heading: "Build",
    total: "implementationHours",
  },
  {
    key: "content",
    bucket: "content",
    label: "Content",
    heading: "Content",
    total: "contentHours",
  },
  {
    key: "project",
    bucket: "project",
    label: projectName,
    heading: projectName,
    total: "projectHours",
  },
] as const;

/** The lines a group lists: those with hours, and those that are included (feedback rounds,
    variants, languages), so the hours say how many of them the estimate has. */
export function groupRows(result: Quote, bucket: HourLine["bucket"]): HourLine[] {
  return result.lines.filter(
    (line) => line.bucket === bucket && (line.openHours > 0 || line.included !== undefined),
  );
}

/** A line of the hours: its hours, "included", or none (a note). */
export type SummaryLine = { name: string; hours: number | "included" | null };
export type SummaryGroup = {
  key: (typeof breakdownGroups)[number]["key"];
  /** In the copied text */
  label: string;
  /** On the page */
  heading: string;
  hours: number;
  lines: SummaryLine[];
};
/** What Copy hours and Hours breakdown say, the one as text and the other on the page: the package
    and tier, then Design (always, with the design chosen), Build, Content and Project with each
    line, and the total. */
export type HoursSummary = { title: string; groups: SummaryGroup[]; total: number };

export function hoursSummary(result: Quote): HoursSummary {
  const design = designOf(result.selection);
  const groups: SummaryGroup[] = [];
  for (const group of breakdownGroups) {
    const rows = groupRows(result, group.bucket);
    if (rows.length === 0 && group.key !== "design") continue;
    let lines: SummaryLine[] = rows.map((line) => ({
      name: lineName(line),
      hours: line.openHours === 0 && line.included !== undefined ? "included" : line.openHours,
    }));
    /* One line named as its group says nothing more */
    if (rows.length === 1 && rows[0]?.label === group.label) lines = [];
    /* No design: the client provides the site's. Design hours entered for an item (Custom
       integration) are still charged, so their lines stay under the note */
    if (group.key === "design" && design.kind === "none") {
      lines = [{ name: "Provided by the client", hours: null }, ...lines];
    }
    const named = (name: string) => (group.key === "design" ? `${name} (${design.label})` : name);
    groups.push({
      key: group.key,
      label: named(group.label),
      heading: named(group.heading),
      hours: result[group.total],
      lines,
    });
  }
  return {
    title: `${result.label} package · Content Hub ${editionLabel[result.edition]}`,
    groups,
    total: result.hours,
  };
}

const lineValue = (hours: SummaryLine["hours"]) =>
  hours === null ? "" : hours === "included" ? "included" : hoursLabel(hours);

export function hoursText(result: Quote): string {
  const summary = hoursSummary(result);
  const out = [summary.title];
  for (const group of summary.groups) {
    out.push(`- ${group.label}: ${hoursLabel(group.hours)}`);
    for (const line of group.lines) {
      out.push(`  - ${line.name}${line.hours === null ? "" : `: ${lineValue(line.hours)}`}`);
    }
  }
  out.push(`- Total: ${hoursLabel(summary.total)}`);
  return out.join("\n");
}

export function breakdownList(result: Quote): HTMLElement {
  const summary = hoursSummary(result);
  const list = el("ul", "lines");
  list.append(el("li", "line-title", summary.title));
  for (const group of summary.groups) {
    const head = el("li", "line-head");
    head.append(
      el("span", undefined, group.heading),
      el("span", "line-hours", hoursLabel(group.hours)),
    );
    list.append(head);
    for (const line of group.lines) {
      const li = el("li", line.hours === "included" ? "line is-included" : "line");
      li.append(el("span", undefined, line.name), el("span", "line-hours", lineValue(line.hours)));
      list.append(li);
    }
  }
  const total = el("li", "line is-total");
  total.append(el("span", undefined, "Total"), el("span", "line-hours", hoursLabel(summary.total)));
  list.append(total);
  return list;
}

/* Actions */

export function bindActions(app: HTMLElement): void {
  app.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (!(button instanceof HTMLButtonElement)) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    const selection = store.selection;
    if (action === "pages-over") {
      const over = button.dataset.over === "1";
      if (over === selection.websitePages > starterPageCap) return;
      commit(setWebsitePages(selection, over ? starterPageCap + 1 : defaultWebsitePages));
    } else if (action === "mode" && id) {
      const level = Number(button.dataset.qty);
      if (Number.isFinite(level)) commit(setQuantity(selection, id, level));
    } else if (action === "source" && id) {
      commit(setSource(selection, id));
    } else if (action === "tile" && id) {
      const turningOn = !isIn(selection.tiles, id);
      if (turningOn && laneIds.includes(id)) store.reveal = id;
      commit(setTile(selection, id, turningOn));
    } else if ((action === "dec" || action === "inc") && id) {
      /* A count of templates at one is not in the estimate: one is the template the blogs share */
      const qty = selection.tiles[id] ?? (getTile(id).counts ? 1 : undefined);
      if (qty === undefined) return;
      const step = getTile(id).step;
      commit(stepQuantity(selection, id, qty + (action === "inc" ? step : -step)));
    }
  });
  app.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const selection = store.selection;
    if (input.dataset.action === "design") {
      /* A design takes the place of the one before it */
      commit(setTile(selection, input.value, true));
      return;
    }
    const qty = Number(input.value);
    const id = input.dataset.id;
    if (!Number.isFinite(qty) || !id) return;
    if (input.dataset.action === "hours") commit(setQuantity(selection, id, qty));
    if (input.dataset.action === "qty") commit(stepQuantity(selection, id, qty));
  });
}
