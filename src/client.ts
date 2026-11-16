/* The client: draws the page on every change, moves items between the columns, and runs the page's own
   actions: Copy hours, Share link, and Reset with ten seconds to undo. */
/* First: a preview puts the calculations page's files in use before anything reads them */
import "./preview.ts";
import { getTile, isPart } from "./catalog.ts";
import { bindActions, commit, hoursText, setRedraw, store, syncOrder } from "./controls.ts";
import { fitHeads, type PageState, render } from "./estimator.ts";
import { decodeSelection, encodeSelection, quote, selectionForShape } from "./quote.ts";

const root = document.querySelector("#app");
if (!(root instanceof HTMLElement)) throw new Error("Missing #app");
const app: HTMLElement = root;

const calm = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Copy hours and Share link say "Copied" in place for a moment ---------- */

const said = new Map<string, string>();

function confirm(key: string, text: string): void {
  said.set(key, text);
  draw();
  window.setTimeout(() => {
    if (said.get(key) !== text) return;
    said.delete(key);
    draw();
  }, 1600);
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
  if (!navigator.clipboard) return Promise.resolve().then(legacy);
  return navigator.clipboard.writeText(value).catch(() => legacy());
}

function copyAction(key: string, value: string, done: string): void {
  void copyText(value).then(
    () => confirm(key, done),
    () => confirm(key, "Copy failed"),
  );
}

/* ---------- Reset, with ten seconds to undo ---------- */

type Saved = { hash: string; order: string[]; open: string[] };
let undo: Saved | null = null;

/** The starting estimate as the address writes it. While it shows, Reset has nothing to do. */
const start = encodeSelection(quote(selectionForShape("essential")).selection);

function focusOn(key: string, reveal = false): void {
  app.querySelector<HTMLElement>(`[data-focus="${key}"]`)?.focus({ preventScroll: !reveal });
}

/* ---------- Copy hours waits for hours you meant to enter ---------- */

/** An item whose hours are entered (Content, Page migration, Custom integration…) in the estimate
    with none: a copy now would leave it out without a word. One with design hours entered too needs
    one of the two. */
function emptyEntries(): string[] {
  const tiles = store.selection.tiles;
  /* Parts whose hours are entered count too: Member area, and the Product catalogue's Custom
     option */
  const parts = Object.keys(tiles).filter((id) => isPart(id) && getTile(id).hourInput);
  return [...store.order, ...parts].filter((id) => {
    const tile = getTile(id);
    return tile.hourInput && !tiles[id] && !(tile.designInput && tiles[tile.designInput]);
  });
}

/** After a refused copy the cards say so, until each has hours or is taken out. */
let marked = false;
let warning: string | null = null;

const listed = (names: string[]) =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** What the warning calls a place for hours: the catalogue's custom hours are its Custom option. */
const entryName = (id: string) =>
  id === "catalogue-custom" ? "the Product catalogue's Custom option" : getTile(id).label;

/** Copy hours and Hours breakdown ask first. With an item still at 0 they say which, mark it, and
    put you in its hours field; `then` ends the warning with what you were about to do. */
function hoursReady(then: string): boolean {
  const empty = emptyEntries();
  if (!empty.length) return true;
  marked = true;
  const text = `Add hours to ${listed(empty.map(entryName))}, or take ${
    empty.length === 1 ? "it" : "them"
  } out of the estimate, then ${then}.`;
  warning = text;
  draw();
  focusOn(`hours-${empty[0]}`, true);
  window.setTimeout(() => {
    if (warning !== text) return;
    warning = null;
    draw();
  }, 6000);
  return false;
}

function copyHours(): void {
  if (hoursReady("copy")) copyAction("copy", hoursText(quote(store.selection)), "Copied");
}

function reset(): void {
  const saved: Saved = { hash: location.hash, order: [...store.order], open: [...store.open] };
  undo = saved;
  store.open.clear();
  commit(selectionForShape("essential"));
  /* Reset is disabled now, so the next thing to reach is Undo */
  focusOn("undo");
  window.setTimeout(() => {
    if (undo !== saved) return;
    undo = null;
    draw();
  }, 10000);
}

function undoReset(): void {
  const saved = undo;
  undo = null;
  const selection = saved && decodeSelection(saved.hash);
  if (!saved || !selection) {
    draw();
    return;
  }
  store.order = saved.order;
  store.open = new Set(saved.open);
  commit(selection);
  focusOn("act-reset");
}

const state: PageState = {
  said,
  get canUndo() {
    return undo !== null;
  },
  get canReset() {
    return encodeSelection(quote(store.selection).selection) !== start;
  },
  get missing() {
    return new Set(marked ? emptyEntries() : []);
  },
  get warning() {
    return warning;
  },
  copyHours,
  hoursReady,
  /* The estimate, without ?preview: a link holds the estimate, not the files it is priced with */
  shareLink: () =>
    copyAction("share", `${location.origin}${location.pathname}${location.hash}`, "Link copied"),
  reset,
  undoReset,
};

/* A row that is one switch (a shelf item, a part of an item) answers a press anywhere on it, except on
   the controls inside it. The press goes to the row's own button, so the app's action handles it. */
app.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const line = target?.closest<HTMLElement>("[data-press]");
  if (!target || !line?.dataset.press) return;
  if (target.closest("button, input, a, label, .stepper, .modes, .unit")) return;
  const button = line.querySelector<HTMLButtonElement>(line.dataset.press);
  if (button && !button.disabled) button.click();
});

/* Any other press ends the chance to undo */
app.addEventListener(
  "click",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (undo && target && !target.closest(".toast, .ab.warn")) undo = null;
  },
  true,
);

/* ---------- Motion ----------
   An item that goes into the estimate: its blue spine draws down first, then the card's content
   slides in. One that comes out: its card slides out towards the shelf from where it stood, and its row
   on the shelf slides in. The rows that stay glide to their new places, and reduced motion turns it
   all off. */

const ease = "cubic-bezier(0.2, 0, 0, 1)";
type Place = { lane: string; box: DOMRect };
type Copy = { node: HTMLElement; box: DOMRect };

function places(): Map<string, Place> {
  const out = new Map<string, Place>();
  for (const node of document.querySelectorAll<HTMLElement>("[data-key]")) {
    out.set(node.dataset.key ?? "", {
      lane: node.dataset.lane ?? "",
      box: node.getBoundingClientRect(),
    });
  }
  return out;
}

/** Copies of the cards in the estimate, taken before a redraw, so one that leaves can be seen leaving. */
function cards(): Map<string, Copy> {
  const out = new Map<string, Copy>();
  for (const node of document.querySelectorAll<HTMLElement>('[data-lane="on"]')) {
    const copy = node.cloneNode(true);
    if (copy instanceof HTMLElement) {
      out.set(node.dataset.key ?? "", { node: copy, box: node.getBoundingClientRect() });
    }
  }
  return out;
}

function arrive(node: HTMLElement): void {
  if (node.dataset.lane !== "on") {
    node.animate(
      [
        { opacity: 0, transform: "translateX(-14px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 260, delay: 120, easing: ease, fill: "backwards" },
    );
    return;
  }
  node.querySelector(".spine")?.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
    duration: 220,
    easing: ease,
  });
  for (const part of node.children) {
    if (part.classList.contains("spine")) continue;
    part.animate(
      [
        { opacity: 0, transform: "translateX(-12px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 260, delay: 160, easing: ease, fill: "backwards" },
    );
  }
}

/** A card that left the estimate: its copy stays where it stood for a moment and slides out. */
function depart(copy: Copy | undefined): void {
  if (!copy) return;
  /* The copy is only a picture: nothing in it can be found, focused or pressed */
  for (const node of [copy.node, ...copy.node.querySelectorAll("*")]) {
    for (const name of ["data-key", "data-lane", "data-focus", "data-action", "data-press", "id"]) {
      node.removeAttribute(name);
    }
  }
  copy.node.inert = true;
  const ghost = document.createElement("div");
  ghost.className = "ghost";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${copy.box.left}px`,
    top: `${copy.box.top}px`,
    width: `${copy.box.width}px`,
    zIndex: "5",
    pointerEvents: "none",
  });
  ghost.append(copy.node);
  document.body.append(ghost);
  const run = ghost.animate(
    [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateX(40px)" },
    ],
    { duration: 240, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
  );
  run.finished.then(
    () => ghost.remove(),
    () => ghost.remove(),
  );
}

function move(before: Map<string, Place>, leaving: Map<string, Copy> | null): void {
  if (!leaving) return;
  const keyed = [...document.querySelectorAll<HTMLElement>("[data-key]")];
  /* When a card leaves, it goes first and the rows close the gap after it, so the two never overlap */
  const departing = keyed.some(
    (node) => before.get(node.dataset.key ?? "")?.lane === "on" && node.dataset.lane !== "on",
  );
  for (const node of keyed) {
    const old = before.get(node.dataset.key ?? "");
    if (!old) continue;
    if (old.lane !== node.dataset.lane) {
      arrive(node);
      if (old.lane === "on") depart(leaving.get(node.dataset.key ?? ""));
      continue;
    }
    /* Rows that stay in their column glide to their new place */
    const dy = old.box.top - node.getBoundingClientRect().top;
    if (Math.abs(dy) >= 1 && node.dataset.lane !== "blocked") {
      node.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
        duration: 200,
        delay: departing && node.dataset.lane === "on" ? 180 : 0,
        easing: ease,
        fill: "backwards",
      });
    }
  }
}

/** The estimate scrolls only when a new item would otherwise land out of sight. */
function reveal(id: string | null): void {
  if (!id) return;
  const node = document.querySelector<HTMLElement>(
    `[data-key="${CSS.escape(id)}"][data-lane="on"]`,
  );
  const column = document.querySelector<HTMLElement>('[data-lane="on-column"]');
  if (!node || !column || column.scrollHeight <= column.clientHeight) return;
  if (getComputedStyle(column).overflowY === "visible") return;
  const box = node.getBoundingClientRect();
  const view = column.getBoundingClientRect();
  if (box.bottom <= view.bottom && box.top >= view.top) return;
  column.scrollTo({
    top: column.scrollTop + box.bottom - view.bottom + 12,
    behavior: calm() ? "smooth" : "auto",
  });
}

/* ---------- Drawing ---------- */

function draw(): void {
  /* Every card that was missing hours has them now, or is gone: nothing left to warn about */
  if (marked && !emptyEntries().length) {
    marked = false;
    warning = null;
  }
  const focus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.focus
      : undefined;
  const scroll = new Map<string, number>();
  for (const node of document.querySelectorAll<HTMLElement>("[data-keep-scroll]")) {
    scroll.set(node.dataset.keepScroll ?? "", node.scrollTop);
  }
  const pageTop = document.scrollingElement?.scrollTop ?? 0;
  const before = places();
  /* No copies under reduced motion: then nothing moves */
  const leaving = calm() ? cards() : null;
  const fresh = store.reveal;
  store.reveal = null;
  const result = quote(store.selection);
  app.dataset.quoteHours = String(result.hours);
  app.dataset.quoteLabel = result.label;
  app.dataset.quoteEdition = result.edition;
  app.replaceChildren(render(result, state));
  fitHeads(app);
  for (const node of document.querySelectorAll<HTMLElement>("[data-keep-scroll]")) {
    node.scrollTop = scroll.get(node.dataset.keepScroll ?? "") ?? 0;
  }
  if (document.scrollingElement) document.scrollingElement.scrollTop = pageTop;
  if (focus) {
    const next = document.querySelector(`[data-focus="${CSS.escape(focus)}"]`);
    if (next instanceof HTMLElement) next.focus({ preventScroll: true });
  }
  move(before, leaving);
  reveal(fresh);
}

setRedraw(draw);
bindActions(app);
/* The heads' labels show where they fit: look again when the room or the fonts change */
window.addEventListener("resize", () => fitHeads(app));
void document.fonts?.ready.then(() => fitHeads(app));

window.addEventListener("hashchange", () => {
  const decoded = decodeSelection(location.hash);
  if (!decoded) return;
  store.selection = decoded;
  undo = null;
  syncOrder();
  draw();
});

commit(decodeSelection(location.hash) ?? selectionForShape("essential"));
