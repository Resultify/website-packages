/* The prices of the files in src/, the ones the estimator is built with: the starting estimate with
   each design, the same with extra feedback rounds, variants and languages, and the price of every
   basic with a quantity or options and of everything the shelf offers, with its parts: each
   option, and each quantity at what it starts at and at its most. The pricing tests use the
   frozen files of test/fixtures instead (see fixture.ts), so they test how an estimate is priced;
   these test what it costs.

   A change of hours, a limit, a package or tier an item needs, or a rule in src/, on the
   calculations page too, changes these snapshots: the test fails until the new prices are accepted
   with `bun test --update-snapshots`, and the accepted prices are in the commit, for review. */
import { describe, expect, test } from "bun:test";
import {
  buildCatalog,
  catalogueId,
  designChoices,
  getTile,
  isAlwaysOn,
  partsOf,
  shelfSource,
  type Tile,
  type TileMode,
  tiles,
  withCatalog,
} from "../src/catalog.ts";
import { hoursSummary, hoursText, shelfLanes } from "../src/controls.ts";
import {
  isBlocked,
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setTile,
  sourceIn,
} from "../src/quote.ts";
import {
  liveCodesText,
  liveRulesText,
  liveText,
  parseCodes,
  parseRules,
  parseTable,
  type Row,
} from "../src/table.ts";

/* Left as is, though table.test.ts reads the same files: it keeps the rows and rules apart too */
const live = buildCatalog(
  parseTable(liveText),
  parseRules(liveRulesText),
  parseCodes(liveCodesText),
);

/** The starting estimate with a design. */
const withDesign = (id: string): Selection => setTile(selectionForShape("essential"), id, true);

/** Each design with what it prices. Left as is: the whole text Copy hours puts in a quote, so a
    change of its words is worth a look too. */
function byDesign(price: (design: string) => string): string {
  return designChoices.map((choice) => `## ${choice.label}\n${price(choice.id)}`).join("\n\n");
}

/** One price in the list: its name, the item whose hours it reads, and how the estimate gets it.
    `has` is the quantity an item must have in it; one that doesn't come in fails the test, so a
    price never reads 0 by mistake. */
type Entry = {
  name: string;
  read: string;
  has: [string, number];
  make: (selection: Selection) => Selection;
};

const optionName = (mode: TileMode) => (mode.group ? `${mode.group}: ${mode.label}` : mode.label);

/** An item's prices, brought into the estimate as the estimator does: its owner first (the shelf's
    item), then the item, then its option or quantity. Left as is: the steps are setTile and
    setQuantity, what the shelf and the item's card call. An item with no option to choose, or
    hours entered by hand, has none: its lines leave the snapshot, and the diff shows they went. */
function entriesOf(item: Tile, bring: (selection: Selection) => Selection): Entry[] {
  if (item.hourInput || item.designOf || item.counts || item.disabled || item.hidden) return [];
  const on = (selection: Selection) => setTile(bring(selection), item.id, true);
  if (item.modes) {
    /* An estimate holds an option by its place in the list, from 1; its value is for links */
    return item.modes.flatMap((mode, index): Entry[] =>
      mode.disabled || mode.customHours
        ? []
        : [
            {
              name: `${item.label} · ${optionName(mode)}`,
              read: item.id,
              has: [item.id, index + 1],
              make: (selection) => setQuantity(on(selection), item.id, index + 1),
            },
          ],
    );
  }
  if (item.unit) {
    return [...new Set([item.initial, item.max])].map((qty) => ({
      name: `${item.label} · ${qty} ${item.unit}`,
      read: item.id,
      has: [item.id, qty],
      make: (selection) => setQuantity(on(selection), item.id, qty),
    }));
  }
  return [{ name: item.label, read: item.id, has: [item.id, item.initial], make: on }];
}

/** How a part's item comes into the estimate: as the shelf adds it, or, when the option it starts
    with blocks the part (Related products and Module based, Social sign-in and SSO), with its first
    live option that doesn't. Null when every option blocks the part: it has no price to show. */
function bringFor(id: string, partId: string): ((selection: Selection) => Selection) | null {
  const bring = (selection: Selection) => setTile(selection, id, true);
  const start = bring(selectionForShape("essential"));
  if (!isBlocked(start.tiles, partId)) return bring;
  const ownerId = id === catalogueId ? sourceIn(start.tiles) : id;
  if (ownerId === undefined) return null;
  const at = (getTile(ownerId).modes ?? []).findIndex(
    (mode, index) =>
      !mode.disabled &&
      !mode.customHours &&
      !isBlocked(setQuantity(start, ownerId, index + 1).tiles, partId),
  );
  return at === -1 ? null : (selection) => setQuantity(bring(selection), ownerId, at + 1);
}

/** Every price in the list: the basics with a quantity or options, then what the shelf offers,
    each with its parts. A part an item can have more than one of (the Blog's templates, one for
    each blog) is priced with two of them too. */
function priceList(): Entry[] {
  const list: Entry[] = [];
  for (const item of tiles) {
    const counted = item.modes !== undefined || (item.unit !== undefined && !item.hourInput);
    if (isAlwaysOn(item.id) && item.group !== "design" && counted) {
      list.push(...entriesOf(item, (selection) => selection));
    }
  }
  for (const id of shelfLanes().laneIds) {
    /* The Product catalogue comes with the source the shelf adds */
    const item = id === catalogueId ? shelfSource() : getTile(id);
    if (item) list.push(...entriesOf(item, (selection) => selection));
    for (const partId of partsOf[id] ?? []) {
      const bring = bringFor(id, partId);
      if (!bring) continue;
      const part = getTile(partId);
      list.push(...entriesOf(part, bring));
      const owner = getTile(id);
      const count = part.countedBy;
      /* Two of it only where the item can have two */
      if (count && !part.disabled && !part.hidden && owner.max >= 2 && getTile(count).max >= 2) {
        list.push({
          name: `${part.label} · 2 ${owner.unit}, 2 ${getTile(count).unit}`,
          read: part.id,
          has: [count, 2],
          make: (selection) =>
            setQuantity(setTile(setQuantity(bring(selection), id, 2), part.id, true), count, 2),
        });
      }
    }
  }
  return list;
}

/** The estimate an entry makes. */
function made(entry: Entry, design: string): Selection {
  const selection = entry.make(withDesign(design));
  const [id, qty] = entry.has;
  if (selection.tiles[id] !== qty) throw new Error(`${entry.name}: ${id} is not ${qty}`);
  return selection;
}

/** An item's own hours in an estimate: design, then build, content or project. */
function itemHours(selection: Selection, id: string): string {
  const lines = quote(selection).lines.filter((line) => line.item === id);
  const sum = (design: boolean) =>
    lines
      .filter((line) => (line.bucket === "design") === design)
      .reduce((total, line) => total + line.openHours, 0);
  return `${sum(true)} + ${sum(false)}`;
}

/** The files in src/ with their rows changed, as the calculations page may change them. */
const edited = (change: (row: Row) => Row) =>
  buildCatalog(
    parseTable(liveText).map(change),
    parseRules(liveRulesText),
    parseCodes(liveCodesText),
  );

describe("the price list", () => {
  test("is made from any table the calculations page can save", () => {
    const every = (design: string) => {
      const list = priceList();
      for (const entry of list) made(entry, design);
      return list.map((entry) => entry.name);
    };
    /* The catalogue starts with Module based, which Related products don't go with: they are
       priced with an option they do go with */
    const moduleBased = edited((row) =>
      row.id === catalogueId ? { ...row, start: row.option === "Module based" ? "1" : "" } : row,
    );
    withCatalog(moduleBased, () => expect(every("custom-design")).toContain("Related products"));
    /* One blog at most: nothing with two */
    const oneBlog = edited((row) => (row.id === "blog-setups" ? { ...row, max: "1" } : row));
    withCatalog(oneBlog, () =>
      expect(every("custom-design").filter((name) => name.includes("2 blogs"))).toEqual([]),
    );
  });
});

describe("the prices of the files in src/", () => {
  test("the starting estimate, with each design", () => {
    const text = withCatalog(live, () =>
      byDesign((design) => hoursText(quote(withDesign(design)))),
    );
    expect(text).toMatchSnapshot();
  });

  test("the starting estimate with 3 feedback rounds, 4 AI variants and 3 languages", () => {
    const text = withCatalog(live, () =>
      byDesign((design) => {
        const choice = designChoices.find((item) => item.id === design);
        let selection = withDesign(design);
        if (choice?.feedbackId) selection = setQuantity(selection, choice.feedbackId, 3);
        if (choice?.kind === "ai") selection = setQuantity(selection, design, 4);
        selection = setQuantity(selection, "languages", 3);
        return hoursText(quote(selection));
      }),
    );
    expect(text).toMatchSnapshot();
  });

  test("every basic, item, part and option: its hours with each design, and the package and tier", () => {
    const text = withCatalog(live, () => {
      const starting = designChoices.find((choice) => choice.kind === "nimbly") ?? designChoices[0];
      const lines = [
        `Item · option or quantity: design + build, content or project hours with ${designChoices
          .map((choice) => choice.label)
          .join(", ")}; the package and tier with ${starting?.label}`,
      ];
      for (const entry of priceList()) {
        const prices = designChoices.map((choice) => itemHours(made(entry, choice.id), entry.read));
        const needs = hoursSummary(quote(made(entry, starting?.id ?? ""))).title;
        lines.push(`${entry.name}: ${prices.join(", ")} · ${needs}`);
      }
      return lines.join("\n");
    });
    expect(text).toMatchSnapshot();
  });
});
