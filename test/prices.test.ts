/* The prices of the files in src/, the ones the estimator is built with: the starting estimate with
   each design, the same with extra feedback rounds, variants and languages, and the price of every
   basic with a quantity or options and of everything the shelf offers, with its parts: each
   option, and each quantity, hours entered too, at what it starts at, at its most and on each side
   of where the package or tier it needs changes; and the website pages, the same way. The pricing
   tests use the frozen files of test/fixtures instead (see fixture.ts), so they test how an
   estimate is priced; these test what it costs.

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
  packageRules,
  pageEdition,
  pageLimits,
  partsOf,
  shelfSource,
  type Tile,
  type TileMode,
  tiles,
  withCatalog,
} from "../src/catalog.ts";
import { hoursSummary, hoursText, shelfLanes } from "../src/controls.ts";
import {
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setTile,
  setWebsitePages,
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

/** One price in the list: its name, the item whose hours it reads (none for the website pages),
    and how the estimate gets it. `has` says whether the estimate holds what the entry is about;
    one that doesn't fails the test, so a price never reads 0 by mistake. */
type Entry = {
  name: string;
  read: string;
  has: (selection: Selection) => boolean;
  make: (selection: Selection) => Selection;
};

/** The estimate holds this quantity of an item: its count, its option's place, or hours entered. */
const holds = (id: string, qty: number) => (selection: Selection) => selection.tiles[id] === qty;

const optionName = (mode: TileMode) => (mode.group ? `${mode.group}: ${mode.label}` : mode.label);

/** What an item needs at a quantity: the tier its rule gives and the packages its rules raise. */
const needsAt = (item: Tile, qty: number) =>
  [
    item.rule.at(qty).edition,
    ...packageRules
      .filter((rule) => rule.tileId === item.id && !rule.exact && rule.at <= qty)
      .map((rule) => rule.package),
  ].join(" ");

/** The quantities worth a price: the start, the most, and the two on each side of a quantity where
    what `key` says changes, so a threshold moved by one changes the list. */
function quantities(min: number, start: number, max: number, key: (qty: number) => string) {
  const list = [start, max];
  for (let qty = min + 1; qty <= max; qty++) {
    if (key(qty) !== key(qty - 1)) list.push(qty - 1, qty);
  }
  return [...new Set(list)].sort((a, b) => a - b);
}

/** An item's prices, brought into the estimate as the estimator does: its owner first (the shelf's
    item), then the item, then its option or quantity. Left as is: the steps are setTile and
    setQuantity, what the shelf and the item's card call. An item with no option to choose has
    none: its lines leave the snapshot, and the diff shows they went. */
function entriesOf(item: Tile, bring: (selection: Selection) => Selection): Entry[] {
  if (item.designOf || item.counts || item.disabled || item.hidden) return [];
  const on = (selection: Selection) => setTile(bring(selection), item.id, true);
  if (item.modes) {
    /* An estimate holds an option by its place in the list, from 1; its value is for links */
    return item.modes.flatMap((mode, index): Entry[] =>
      mode.disabled
        ? []
        : [
            {
              name: `${item.label} · ${optionName(mode)}`,
              read: item.id,
              has: holds(item.id, index + 1),
              make: (selection) => setQuantity(on(selection), item.id, index + 1),
            },
          ],
    );
  }
  if (item.unit) {
    return quantities(item.min, item.initial, item.max, (qty) => needsAt(item, qty)).map((qty) => ({
      name: `${item.label} · ${qty} ${item.unit}`,
      read: item.id,
      has: holds(item.id, qty),
      make: (selection) => setQuantity(on(selection), item.id, qty),
    }));
  }
  return [{ name: item.label, read: item.id, has: holds(item.id, item.initial), make: on }];
}

/** How a part's item comes into the estimate: as the shelf adds it, or, when the option it starts
    with doesn't take the part (Related products and Module based, Social sign-in and SSO, Custom
    catalogue and any option but Custom), with its first live option that does. Null when no
    option takes the part: it has no price to show. */
function bringFor(id: string, partId: string): ((selection: Selection) => Selection) | null {
  const bring = (selection: Selection) => setTile(selection, id, true);
  const start = bring(selectionForShape("essential"));
  const takes = (selection: Selection) =>
    setTile(selection, partId, true).tiles[partId] !== undefined;
  if (takes(start)) return bring;
  const ownerId = id === catalogueId ? sourceIn(start.tiles) : id;
  if (ownerId === undefined) return null;
  const at = (getTile(ownerId).modes ?? []).findIndex(
    (mode, index) => !mode.disabled && takes(setQuantity(start, ownerId, index + 1)),
  );
  return at === -1 ? null : (selection) => setQuantity(bring(selection), ownerId, at + 1);
}

/** The website pages: not an item, so no hours of their own, only the tier they need. An estimate
    holds one of two counts, as the estimator offers them: what Starter takes, or the first that
    needs more, so a moved start or threshold changes the count. */
function pageEntries(): Entry[] {
  const { min, max } = pageLimits();
  const start = selectionForShape("essential");
  const counts = new Set([min, max].map((qty) => setWebsitePages(start, qty).websitePages));
  return [...counts].map((qty) => ({
    name: `Website pages · ${qty} pages, ${pageEdition(qty) ? "more than Starter takes" : "what Starter takes"}`,
    read: "",
    has: (selection) => selection.websitePages === qty,
    make: (selection) => setWebsitePages(selection, qty),
  }));
}

/** Every price in the list: the website pages, the basics with a quantity or options, then what
    the shelf offers, each with its parts. A part an item can have more than one of (the Blog's
    templates, one for each blog) is priced with two of them too. */
function priceList(): Entry[] {
  const list: Entry[] = pageEntries();
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
          has: holds(count, 2),
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
  if (!entry.has(selection)) throw new Error(`${entry.name}: not in the estimate`);
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
        const needs = hoursSummary(quote(made(entry, starting?.id ?? ""))).title;
        if (!entry.read) {
          lines.push(`${entry.name}: ${needs}`);
          continue;
        }
        const prices = designChoices.map((choice) => itemHours(made(entry, choice.id), entry.read));
        lines.push(`${entry.name}: ${prices.join(", ")} · ${needs}`);
      }
      return lines.join("\n");
    });
    expect(text).toMatchSnapshot();
  });
});
