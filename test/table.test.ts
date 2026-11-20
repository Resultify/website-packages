/* The catalog the files make (src/hours.csv, config.ts), drafts of them, and the short link. No
   browser needed. "The files" reads src/; the rest prices with the frozen copy in test/fixtures, so
   a change of the hours in src/ changes none of the numbers here. */
import { describe, expect, test } from "bun:test";
import {
  buildCatalog,
  catalogueSources,
  designChoices,
  getTile,
  modeLabel,
  partsOf,
  sourceTiles,
  tierMark,
  tiles,
  withCatalog,
} from "../src/catalog.ts";
import { lineName, ruleFor, shelfGroupOf, shelfLanes } from "../src/controls.ts";
import { packLink, unpackLink } from "../src/link.ts";
import {
  aiVariantCost,
  decodeSelection,
  encodeSelection,
  type HourLine,
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setSource,
  setTile,
  setWebsitePages,
} from "../src/quote.ts";
import { config } from "../src/config.ts";
import {
  columns,
  liveHoursText,
  parseHours,
  type Row,
  type Rules,
  rowsFrom,
  rulesFrom,
  withCodes,
} from "../src/table.ts";

import { codes, fixtureConfig, rows, rules, useFixture } from "./fixture.ts";

useFixture();

/** The files in src/, as the app is built with them. */
const live = {
  rows: rowsFrom(parseHours(liveHoursText), config),
  rules: rulesFrom(config),
  codes: config.linkCodes,
};

/** Cells to change, by "id column", or "id·option column" on a row with an option:
    { "sections build-ai": "6", "menu·Advanced option": "Mega" }. */
type Cells = Record<string, string>;
function applyCells(table: readonly Row[], cells: Cells): Row[] {
  return table.map((item) => {
    const key = item.option ? `${item.id}·${item.option}` : item.id;
    const next = { ...item };
    for (const column of columns) {
      const value = cells[`${key} ${column}`];
      if (value !== undefined) next[column] = value.trim();
    }
    return next;
  });
}
const liveCatalog = () => buildCatalog(live.rows, live.rules, live.codes);
/** The starting estimate: Nimbly design. */
const essential = () => selectionForShape("essential");
/** The starting estimate with AI generated design. */
const ai = () => setTile(essential(), "ai-design", true);
const catalog = (table: readonly Row[], changed: Partial<Rules> = {}) =>
  buildCatalog(table, { ...rules, ...changed }, codes);
const drafted = (cells: Cells, changed: Partial<Rules> = {}) =>
  catalog(applyCells(rows, cells), changed);
const row = (cells: Partial<Row>): Row => ({
  ...(Object.fromEntries(columns.map((column) => [column, ""])) as Row),
  ...cells,
});
const allBuild = (hours: string) => ({
  "build-ai": hours,
  "build-nimbly": hours,
  "build-custom": hours,
});

/** The estimate used across these tests: the starting estimate with AI generated design, landing
    templates, system templates and 50h of content. */
const example = "-FMRqQVcGc";
/** The options every source of the Product catalogue has. */
const catalogueOptions = [
  "Module based",
  "Dynamic pages: Simple",
  "Dynamic pages: Filtered",
  "Dynamic pages: Multi-level",
  "Custom",
];

describe("the files", () => {
  test("every item has its own code, and every option its own number", () => {
    const { tiles } = liveCatalog();
    const numbers = tiles.map((tile) => tile.code);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const tile of tiles) {
      const values = (tile.modes ?? []).map((mode) => mode.value);
      expect(new Set(values).size).toBe(values.length);
      expect(values.every((value) => value > 0)).toBe(true);
    }
  });

  test("a note shows the build hours where it says {build}, and the rules write their own", () => {
    expect(getTile("templates").summary).toBe("{build}h each to build");
    expect(getTile("languages").summary).toBe("One included, 2nd is 14h, then 6h each");
    expect(getTile("ai-feedback").summary).toBe("1 included, then 3h each");
    withCatalog(drafted({}, { "languages-second": "16", "ai-feedback-each": "4" }), () => {
      expect(getTile("languages").summary).toBe("One included, 2nd is 16h, then 6h each");
      expect(getTile("ai-feedback").summary).toBe("1 included, then 4h each");
    });
  });

  test("every item and option in src/ can be priced with every design, and an estimate's hours add up", () => {
    withCatalog(liveCatalog(), () => {
      for (const choice of designChoices) {
        const start = quote(setTile(essential(), choice.id, true));
        expect(start.selection.tiles[choice.id]).toBeDefined();
        for (const tile of tiles) {
          if (tile.hidden || tile.disabled || tile.place === "design") continue;
          const levels = tile.modes
            ? tile.modes.map((_, index) => index + 1)
            : [tile.min, tile.max];
          for (const level of levels) {
            const priced = quote(
              setQuantity(setTile(start.selection, tile.id, true), tile.id, level),
            );
            for (const line of priced.lines) expect(line.openHours).toBeGreaterThanOrEqual(0);
            expect(priced.hours).toBeCloseTo(
              priced.designHours +
                priced.implementationHours +
                priced.contentHours +
                priced.projectHours,
            );
            /* With no design, no design hours */
            if (choice.kind === "none") expect(priced.designHours).toBe(0);
            expect(decodeSelection(encodeSelection(priced.selection))).toEqual(priced.selection);
          }
        }
      }
    });
  });

  test("an option written as Group: Option sits under that heading", () => {
    const modes = getTile("product-catalogue").modes ?? [];
    expect(modes.map((mode) => [mode.group ?? "", mode.label])).toEqual([
      ["", "Module based"],
      ["Dynamic pages", "Simple"],
      ["Dynamic pages", "Filtered"],
      ["Dynamic pages", "Multi-level"],
      ["", "Custom"],
    ]);
  });
});

describe("an item of the shelf, on its own", () => {
  /* Every item and option live, those coming soon too: an item made live in config.ts must behave
     as the others do */
  const everyLive = (table: readonly Row[]) =>
    table.map((item) => (item.status === "soon" ? { ...item, status: "" } : item));
  const catalogs = {
    "the files in src/": () => buildCatalog(everyLive(live.rows), live.rules, live.codes),
    "the frozen files": () => buildCatalog(everyLive(rows), rules, codes),
  };
  /** What an item may bring with it: its own parts, the hours entered with it, and for the Product
      catalogue its sources. */
  const ownOf = (id: string): Set<string> => {
    const own = new Set([id, ...(partsOf[id] ?? [])]);
    if (id === "product-catalogue") for (const item of sourceTiles()) own.add(item.id);
    for (const item of [...own]) {
      const entered = getTile(item).designInput;
      if (entered) own.add(entered);
    }
    return own;
  };
  /** Each way an item can be in: each option, or its least and its most. */
  const levelsOf = (id: string) => {
    const tile = getTile(id);
    return tile.modes ? tile.modes.map((_, index) => index + 1) : [tile.min, tile.max];
  };
  const changed = (before: Record<string, number>, after: Record<string, number>) =>
    [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
      (id) => before[id] !== after[id],
    );

  for (const [name, make] of Object.entries(catalogs)) {
    test(`with ${name}, adding one brings only it and its own parts, and taking it out takes only those`, () => {
      withCatalog(make(), () => {
        const { laneIds } = shelfLanes();
        expect(laneIds).toContain("external-forms");
        const start = quote(essential()).selection;
        for (const id of laneIds) {
          for (const level of levelsOf(id)) {
            const added = quote(setQuantity(setTile(start, id, true), id, level)).selection;
            const own = ownOf(id);
            /* Nothing else comes in, or changes */
            expect(changed(start.tiles, added.tiles).filter((other) => !own.has(other))).toEqual(
              [],
            );
            /* And out again, the estimate is as it was */
            expect(quote(setTile(added, id, false)).selection.tiles).toEqual(start.tiles);
          }
        }
      });
    });

    test(`with ${name} and everything in, taking one out takes only it and its own parts`, () => {
      withCatalog(make(), () => {
        const { laneIds } = shelfLanes();
        const all = laneIds.reduce((selection, id) => setTile(selection, id, true), essential());
        const full = quote(all).selection;
        for (const id of laneIds) expect(Object.keys(full.tiles)).toContain(id);
        for (const id of laneIds) {
          const without = quote(setTile(full, id, false)).selection;
          const own = ownOf(id);
          expect(changed(full.tiles, without.tiles).filter((other) => !own.has(other))).toEqual([]);
        }
      });
    });
  }
});

describe("a draft", () => {
  test("prices an estimate with its own cells, and leaves the published files as they were", () => {
    expect(quote(essential()).hours).toBe(124);
    /* Sections with Nimbly design: 4h each becomes 5h, for 8 sections. Project management grows
       with them: 15% of 41h + 68h, 16.35, so 17h; with the kick-off and training, 75h */
    const draft = drafted({ "sections build-nimbly": "5" });
    expect(withCatalog(draft, () => quote(essential()).hours)).toBe(41 + 75 + 17);
    expect(quote(essential()).hours).toBe(124);
  });

  test("build hours follow the design choice of the estimate: no design takes Custom's", () => {
    const draft = drafted({
      "sections build-ai": "3",
      "sections build-nimbly": "5",
      "sections build-custom": "6",
    });
    const custom = setTile(essential(), "custom-design", true);
    const none = setTile(essential(), "no-design", true);
    withCatalog(draft, () => {
      const line = (selection: Selection) =>
        quote(selection).lines.find((item) => item.id === "sections")?.openHours;
      expect(line(ai())).toBe(24);
      expect(line(essential())).toBe(40);
      expect(line(custom)).toBe(48);
      expect(line(none)).toBe(48);
    });
  });

  test("moves a package rule and a tier with their cells, and the rules with theirs", () => {
    const four = setQuantity(essential(), "templates", 4);
    expect(quote(four).shape).toBe("essential");
    expect(
      withCatalog(drafted({ "templates package": "growth from 4" }), () => quote(four).shape),
    ).toBe("growth");
    const hubdb = setTile(essential(), "hubdb", true);
    expect(quote(hubdb).edition).toBe("professional");
    expect(withCatalog(drafted({ "hubdb tier": "" }), () => quote(hubdb).edition)).toBe("starter");
    const pages = setWebsitePages(essential(), 31);
    expect(quote(pages).edition).toBe("professional");
    expect(
      withCatalog(drafted({}, { "pages-professional-from": "41" }), () => quote(pages).edition),
    ).toBe("starter");
    const two = setQuantity(essential(), "languages", 2);
    const languages = () => quote(two).lines.find((line) => line.id === "languages")?.openHours;
    expect(quote(two).shape).toBe("growth");
    expect(languages()).toBe(14);
    withCatalog(drafted({}, { "languages-growth-from": "3", "languages-second": "10" }), () => {
      expect(quote(two).shape).toBe("essential");
      expect(languages()).toBe(10);
    });
  });

  test("feedback rounds, variants and project management come from the rules", () => {
    const hours = (selection: Selection, id: string) =>
      quote(selection).lines.find((line) => line.id === id)?.openHours;
    /* 4 rounds: 1 included, 3 extra */
    const rounds = setQuantity(ai(), "ai-feedback", 4);
    expect(hours(rounds, "ai-feedback")).toBe(3 * 3);
    expect(
      withCatalog(drafted({}, { "ai-feedback-each": "5" }), () => hours(rounds, "ai-feedback")),
    ).toBe(3 * 5);
    const nimbly = setQuantity(essential(), "nimbly-feedback", 3);
    expect(hours(nimbly, "nimbly-feedback")).toBe(2 * 3);
    expect(
      withCatalog(drafted({}, { "nimbly-feedback-included": "3" }), () =>
        hours(nimbly, "nimbly-feedback"),
      ),
    ).toBe(0);
    const variants = setQuantity(ai(), "ai-design", 3);
    /* One extra variant: half of the 18h of AI design, rounded up */
    expect(hours(variants, "ai-variants")).toBe(9);
    expect(
      withCatalog(drafted({}, { "ai-variant-percent": "100" }), () =>
        hours(variants, "ai-variants"),
      ),
    ).toBe(18);
    /* Project management: 15% of 101h is 15.15, so 16h; 10% is 10.1, so 11h, whatever the design */
    expect(hours(essential(), "project-management")).toBe(16);
    withCatalog(drafted({}, { "pm-percent": "10" }), () => {
      expect(hours(essential(), "project-management")).toBe(11);
      for (const choice of designChoices) {
        const priced = quote(setTile(essential(), choice.id, true));
        expect(priced.lines.find((line) => line.id === "project-management")?.mode).toStartWith(
          "10% of ",
        );
      }
    });
    expect(() => drafted({}, { "pm-percent": "" })).toThrow("Rule pm-percent");
    /* With no design, the share of Custom's design hours it counts too: 50%, or 0 for none of it */
    const none = setTile(essential(), "no-design", true);
    expect(hours(none, "project-management")).toBe(13);
    withCatalog(drafted({}, { "pm-none-design-percent": "100" }), () => {
      /* 15% of 60h + 41h is 15.15, so 16h: as much as with Custom */
      expect(hours(none, "project-management")).toBe(16);
    });
    withCatalog(drafted({}, { "pm-none-design-percent": "0" }), () => {
      expect(quote(none).lines.find((line) => line.id === "project-management")).toMatchObject({
        mode: "15% of 60h",
        openHours: 9,
      });
    });
    expect(() => drafted({}, { "pm-none-design-percent": "" })).toThrow(
      "Rule pm-none-design-percent must be a whole number",
    );
  });

  test("the package a design needs comes from the rules: Custom and None need Growth", () => {
    const shape = (id: string) => quote(setTile(essential(), id, true)).shape;
    expect(shape("nimbly-design")).toBe("essential");
    expect(shape("ai-design")).toBe("essential");
    expect(shape("custom-design")).toBe("growth");
    expect(shape("no-design")).toBe("growth");
    expect(quote(setTile(essential(), "no-design", true)).packageReasons).toEqual([
      "No design → Growth",
    ]);
    withCatalog(drafted({}, { "custom-package": "", "nimbly-package": "platform" }), () => {
      expect(shape("custom-design")).toBe("essential");
      expect(quote(essential()).shape).toBe("platform");
      expect(quote(essential()).packageReasons).toEqual(["Nimbly design → Platform"]);
    });
    expect(() => drafted({}, { "none-package": "big" })).toThrow(
      "Rule none-package must be growth, platform or empty",
    );
  });

  test("an AI variant's cost shown is the cost charged, also with design hours entered for an item named AI …", () => {
    const entered = row({
      id: "ai-integration",
      item: "AI integration",
      place: "shelf",
      unit: "build and design hours",
      max: "100",
      note: "A connection to an AI service",
    });
    withCatalog(catalog([...rows, entered]), () => {
      const on = setTile(ai(), "ai-integration", true);
      const priced = quote(
        setQuantity(setQuantity(on, "ai-integration-design", 40), "ai-design", 3),
      );
      const variants = priced.lines.find((line) => line.id === "ai-variants");
      /* One extra variant: half of the 18h of AI design; the 40h entered are not a share of it */
      expect(variants?.openHours).toBe(9);
      expect(aiVariantCost(priced)).toBe(9);
    });
  });

  test("a count of the Blog's templates goes as high as the blogs can", () => {
    withCatalog(drafted({ "blog-setups max": "150" }), () => {
      expect(getTile("blog-list-count").max).toBe(150);
      expect(getTile("blog-recent-count").max).toBe(150);
      const blogs = setQuantity(setTile(essential(), "blog-setups", true), "blog-setups", 150);
      const counted = setQuantity(blogs, "blog-list-count", 150);
      expect(quote(counted).selection.tiles["blog-list-count"]).toBe(150);
    });
  });

  test("at least one feedback round and one AI variant are included: a link writes them from 1", () => {
    expect(() => drafted({}, { "ai-feedback-included": "0" })).toThrow(
      "AI feedback: 0 rounds included must be 1 to 10",
    );
    expect(() => drafted({}, { "custom-feedback-included": "0" })).toThrow("must be 1 to 10");
    expect(() => drafted({}, { "ai-variants-included": "0" })).toThrow(
      "0 variants included must be 1 to 10",
    );
    expect(() => drafted({}, { "nimbly-feedback-included": "11" })).toThrow("must be 1 to 10");
  });

  test("changes the hours of one option only", () => {
    const advanced = setQuantity(essential(), "menu", 2);
    const draft = drafted({ "menu·Advanced build-nimbly": "14" });
    const menu = (selection: Selection) =>
      quote(selection).lines.find((line) => line.id === "menu")?.openHours;
    expect(menu(advanced)).toBe(12);
    expect(withCatalog(draft, () => menu(advanced))).toBe(14);
    expect(withCatalog(draft, () => quote(essential()).hours)).toBe(124);
  });

  test("a cell or rule the app cannot take is an error that names it", () => {
    expect(() => drafted({ "sections build-ai": "abc" })).toThrow(
      "Sections: build-ai must be a whole number",
    );
    /* Hours and rules are whole numbers, so every line and total is exact */
    expect(() => drafted({ "sections design-ai": "2.5" })).toThrow(
      'Sections: design-ai must be a whole number, 0 or more. It is "2.5"',
    );
    expect(() => drafted({}, { "pm-percent": "12.5" })).toThrow(
      "Rule pm-percent must be a whole number",
    );
    /* The estimate's own lines: an item with one of their ids would show as that line */
    for (const [id, item] of [
      ["project-management", "Project management"],
      ["ai-variants", "AI variants"],
    ]) {
      const own = row({ id, item, place: "shelf", ...allBuild("7"), note: "An item" });
      expect(() => catalog([...rows, own])).toThrow(
        `${item}: ${id} cannot be an id: it is a line the estimate makes`,
      );
    }
    /* Website pages: a new estimate starts under the cap, and both sides of it can be chosen */
    expect(() => drafted({}, { "pages-professional-from": "20" })).toThrow(
      "Rule pages-professional-from 20 must be 26 to 200: above pages-start, up to pages-max",
    );
    expect(() => drafted({}, { "pages-professional-from": "25" })).toThrow("must be 26 to 200");
    expect(() => drafted({}, { "pages-professional-from": "201" })).toThrow("must be 26 to 200");
    expect(() => drafted({}, { "pages-professional-from": "26" })).not.toThrow();
    expect(() => drafted({}, { "languages-each": "6.5" })).toThrow(
      "Rule languages-each must be a whole number",
    );
    /* An option's name has no | */
    expect(() => drafted({ "menu·Advanced option": "Advanced | Mega" })).toThrow(
      'an option name cannot have "|"',
    );
    expect(() => drafted({ "menu·Advanced package": "big" })).toThrow(
      "Menu, Advanced: package must be",
    );
    expect(() => drafted({ "menu·Advanced package": "growth from 2" })).toThrow('no "from"');
    expect(() => drafted({ "sections start": "50" })).toThrow(
      "Sections: start 50 is outside 1 to 40",
    );
    expect(() => drafted({ "sections status": "hidden" })).toThrow("always shown");
    /* The options that block a part by their name keep it */
    expect(() => drafted({ "product-catalogue·Module based option": "Module-based" })).toThrow(
      "HubDB: one option must be called Module based: by that name, it blocks Related products",
    );
    expect(() => drafted({ "catalogue-crm·Module based option": "Modules" })).toThrow(
      "CRM Object: one option must be called Module based",
    );
    expect(() => drafted({ "membership·SSO option": "Single sign-on" })).toThrow(
      "Memberships: one option must be called SSO: by that name, it blocks Social sign-in",
    );
    expect(() => drafted({}, { "ai-feedback-each": "x" })).toThrow("Rule ai-feedback-each");
    /* config.ts that loses a rule is refused, whatever the rule. A package rule too: read as empty,
       a valid "any package", it would let Custom design price as Essential */
    const { "custom-package": _lost, ...noPackage } = fixtureConfig.rules;
    expect(() => rulesFrom({ rules: noPackage as typeof fixtureConfig.rules })).toThrow(
      "config.ts has no rule custom-package",
    );
    /* A rule left empty is the catalog's to judge */
    expect(() => drafted({}, { "pm-none-design-percent": "" })).toThrow(
      "Rule pm-none-design-percent must be a whole number",
    );
  });

  test("a new row is a new item on the shelf: its hours, design hours and package work at once", () => {
    const events = row({
      id: "events",
      item: "Events calendar",
      place: "shelf",
      ...allBuild("12"),
      "design-ai": "1",
      "design-nimbly": "4",
      "design-custom": "4",
      package: "growth",
    });
    const added = catalog([...rows, events]);
    const highest = Math.max(...codes.map((entry) => entry.code));
    expect(added.byId.get("events")?.code).toBe(highest + 1);
    expect(added.codes.find((entry) => entry.id === "events")?.code).toBe(highest + 1);
    withCatalog(added, () => {
      const priced = quote(setTile(essential(), "events", true));
      expect(priced.lines.find((line) => line.id === "events")?.openHours).toBe(12);
      expect(priced.lines.find((line) => line.id === "nimbly-events")?.openHours).toBe(4);
      /* 41h + 4h of design, 60h + 12h of build: 15% of 117h is 17.55, so 18h; the kick-off and
         training, 7h */
      expect(priced.hours).toBe(45 + 72 + 7 + 18);
      expect(priced.packageReasons).toEqual(["Events calendar → Growth"]);
      const link = encodeSelection(priced.selection);
      expect(decodeSelection(link)?.tiles.events).toBe(1);
    });
    expect(() => getTile("events")).toThrow();
    /* The published files have no such code: a link with it opens without it */
    const link = withCatalog(added, () => encodeSelection(setTile(essential(), "events", true)));
    expect(decodeSelection(link)?.tiles).not.toHaveProperty("events");
  });

  test("a hidden item is nowhere, and a coming one is on the shelf, locked", () => {
    const { laneIds, blockedShelfIds } = shelfLanes();
    expect(laneIds).toContain("system");
    /* In the table's order */
    expect(blockedShelfIds).toEqual(["external-forms", "crm-section", "crm-custom-section"]);
    withCatalog(drafted({ "system status": "hidden", "hubdb status": "soon" }), () => {
      expect(getTile("system").hidden).toBe(true);
      expect(getTile("hubdb").disabled).toBe(true);
      expect(shelfLanes().laneIds).not.toContain("system");
      expect(shelfLanes().blockedShelfIds).toContain("hubdb");
      /* An estimate that had it loses it */
      expect(quote(setTile(essential(), "system", true)).selection.tiles.system).toBeUndefined();
      expect(quote(decodeSelection(example) as Selection).selection.tiles.system).toBeUndefined();
    });
  });

  test("each option has its own status: a hidden one is left out, a coming one is locked", () => {
    const advanced = setQuantity(essential(), "menu", 2);
    const link = encodeSelection(quote(advanced).selection);
    withCatalog(drafted({ "menu·Advanced status": "hidden" }), () => {
      expect(getTile("menu").modes?.map((mode) => mode.label)).toEqual(["Simple"]);
      /* A link that had it opens with the option the item starts with */
      expect(decodeSelection(link)?.tiles.menu).toBe(1);
      expect(quote(decodeSelection(link) as Selection).hours).toBe(124);
    });
    withCatalog(drafted({ "menu·Advanced status": "soon" }), () => {
      expect(getTile("menu").modes?.map((mode) => [mode.label, !!mode.disabled])).toEqual([
        ["Simple", false],
        ["Advanced", true],
      ]);
      expect(quote(advanced).selection.tiles.menu).toBe(1);
    });
    /* An item that every estimate has keeps one live option */
    expect(() =>
      drafted({ "menu·Simple status": "soon", "menu·Advanced status": "hidden" }),
    ).toThrow("at least one option must be live");
    /* An item of the shelf with all its options coming is coming itself; all hidden, hidden */
    withCatalog(drafted({ "search·Simple status": "soon", "search·Advanced status": "soon" }), () =>
      expect(getTile("search").disabled).toBe(true),
    );
    withCatalog(
      drafted({ "search·Simple status": "hidden", "search·Advanced status": "hidden" }),
      () => expect(getTile("search").hidden).toBe(true),
    );
    /* Forms with external data: HubDB live, External API still coming */
    withCatalog(drafted({ "external-forms·HubDB status": "" }), () => {
      expect(getTile("external-forms").disabled).toBeUndefined();
      expect(getTile("external-forms").modes?.[1]?.disabled).toBe(true);
    });
  });

  test("a row's place is where the estimator shows it, and its type where its hours count", () => {
    expect(getTile("templates").place).toBe("basics");
    expect(getTile("landing-templates").place).toBe("shelf");
    expect(getTile("blog-list").place).toBe("blog");
    expect(getTile("favorite-products").place).toBe("catalogue");
    expect(getTile("membership-groups").place).toBe("membership");
    /* The shelf in the estimator: its items, the Blog, the Product catalogue and Memberships, in
       the table's order (in these files, content after the rest of the shelf, then the Blog) */
    expect(shelfLanes().laneIds).toEqual([
      "landing-templates",
      "search",
      "custom-forms",
      "cookie-banner",
      "system",
      "hubdb",
      "custom-integration",
      "content-hours",
      "migrate-pages",
      "migrate-posts",
      "blog-setups",
      "product-catalogue",
      "membership",
    ]);
    /* Moving a row moves the item on the shelf: the Blog first */
    const blogFirst = [
      ...rows.filter((item) => item.place === "blog"),
      ...rows.filter((item) => item.place !== "blog"),
    ];
    withCatalog(catalog(blogFirst), () => expect(shelfLanes().laneIds[0]).toBe("blog-setups"));
    /* Content: its hours are content hours, wherever the row is */
    withCatalog(drafted({ "landing-templates type": "content" }), () => {
      expect(getTile("landing-templates").bucket).toBe("content");
      const priced = quote(setTile(essential(), "landing-templates", true));
      expect(priced.contentHours).toBe(3);
      /* Its design hours stay design hours; project management counts its content hours: 15% of
         43h + 60h + 3h is 15.9, so 16h. With the kick-off and training, 67h */
      expect(priced.hours).toBe(43 + 67 + 16 + 3);
    });
    expect(() => drafted({ "templates place": "shelf" })).toThrow("place must be basics");
    expect(() =>
      drafted({ "search·Simple place": "basics", "search·Advanced place": "basics" }),
    ).toThrow("place cannot be basics");
    expect(() => drafted({ "hubdb place": "garden" })).toThrow("place must be one of");
    expect(() => drafted({ "blog-recent type": "content" })).toThrow("items of the shelf only");
    expect(() => drafted({ "hubdb type": "words" })).toThrow(
      "type must be empty (build), content or project",
    );
  });

  test("Project: the kick-off and training by their type, and project management, apart from Build", () => {
    expect(getTile("kickoff").bucket).toBe("project");
    expect(getTile("training").bucket).toBe("project");
    const start = quote(essential());
    /* Project management: 15% of 101h of design and build, not of the kick-off and training */
    expect(start.projectHours).toBe(3 + 4 + 16);
    expect(start.implementationHours).toBe(60);
    /* An item of the shelf can be Project; its design hours stay Design */
    withCatalog(drafted({ "landing-templates type": "project" }), () => {
      const priced = quote(setTile(essential(), "landing-templates", true));
      expect(priced.lines.find((line) => line.id === "landing-templates")?.bucket).toBe("project");
      expect(priced.lines.find((line) => line.id === "nimbly-landing-templates")?.bucket).toBe(
        "design",
      );
      expect(priced.implementationHours).toBe(60);
      /* Landing templates 3h joins the kick-off and training: project management is 15% of 43h of
         design and 60h of build, 15.45, so 16h; Project's own hours are not counted */
      expect(priced.projectHours).toBe(3 + 3 + 4 + 16);
      expect(priced.hours).toBe(43 + 60 + 26);
    });
    expect(() => drafted({ "blog-recent type": "project" })).toThrow(
      "site basics and the shelf only",
    );
    /* The site basics have their places on the page: their type is fixed */
    expect(() => drafted({ "header type": "project" })).toThrow(
      "Global header: type is fixed in the site basics: empty (build)",
    );
    expect(() => drafted({ "training type": "" })).toThrow(
      "Training: type is fixed in the site basics: project",
    );
    expect(() => drafted({ "menu·Advanced type": "project" })).toThrow("type is fixed");
    /* The header, footer, setup and kick-off are in once: a link keeps no number for them */
    expect(() => drafted({ "header unit": "variants", "header max": "2" })).toThrow(
      "Global header: unit and option must be empty: it is in every estimate once",
    );
    expect(() => drafted({ "kickoff option": "Short" })).toThrow(
      "Kick-off meeting, Short: unit and option must be empty",
    );
  });

  test("the Product catalogue's sources come from the table, each with the same options", () => {
    const names = (list: readonly { source?: string }[]) => list.map((item) => item.source);
    const options = (id: string) =>
      getTile(id).modes?.map((mode) => (mode.group ? `${mode.group}: ${mode.label}` : mode.label));
    expect(getTile("product-catalogue").label).toBe("Product catalogue (HubDB)");
    expect(getTile("product-catalogue").source).toBe("HubDB");
    expect(names(catalogueSources())).toEqual(["HubDB", "CRM Object", "Custom Object"]);
    expect(options("catalogue-crm")).toEqual(options("product-catalogue"));
    expect(options("catalogue-objects")).toEqual(options("product-catalogue"));
    /* CRM Object and Custom Object: every option coming, so the source is too */
    expect(getTile("catalogue-crm").disabled).toBe(true);
    expect(getTile("catalogue-objects").disabled).toBe(true);
    const hidden = Object.fromEntries(
      (getTile("catalogue-objects").modes ?? []).map((mode) => [
        `catalogue-objects·${mode.group ? `${mode.group}: ${mode.label}` : mode.label} status`,
        "hidden",
      ]),
    );
    withCatalog(drafted(hidden), () =>
      expect(names(catalogueSources())).toEqual(["HubDB", "CRM Object"]),
    );
    /* A source with no options has nothing to offer yet, so it cannot be live */
    const salesforce = row({ id: "catalogue-sf", item: "Salesforce", place: "catalogue" });
    expect(() => catalog([...rows, salesforce])).toThrow("status must be soon or hidden");
    withCatalog(catalog([...rows, { ...salesforce, status: "soon" }]), () =>
      expect(names(catalogueSources())).toEqual([
        "HubDB",
        "CRM Object",
        "Custom Object",
        "Salesforce",
      ]),
    );
    /* Its reasons name the catalogue and its source */
    expect(quote(setTile(essential(), "product-catalogue", true)).packageReasons).toEqual([
      "Product catalogue (HubDB) → Platform",
    ]);
  });

  test("Recent blog posts, Favorite products and Related products have a status of their own", () => {
    const catalogue = setTile(essential(), "product-catalogue", true);
    const both = setTile(setTile(catalogue, "favorite-products", true), "related-products", true);
    const link = encodeSelection(quote(both).selection);
    withCatalog(drafted({ "favorite-products status": "soon" }), () => {
      expect(getTile("favorite-products").disabled).toBe(true);
      /* Locked: it cannot be added, and an estimate that had it loses it */
      expect(
        quote(setTile(catalogue, "favorite-products", true)).selection.tiles,
      ).not.toHaveProperty("favorite-products");
      expect(decodeSelection(link)?.tiles).not.toHaveProperty("favorite-products");
      expect(decodeSelection(link)?.tiles["related-products"]).toBe(1);
    });
    withCatalog(drafted({ "related-products status": "hidden" }), () => {
      expect(getTile("related-products").hidden).toBe(true);
      expect(quote(both).selection.tiles).not.toHaveProperty("related-products");
    });
    withCatalog(drafted({ "blog-recent status": "soon" }), () => {
      const blog = setTile(essential(), "blog-setups", true);
      expect(quote(setTile(blog, "blog-recent", true)).selection.tiles).not.toHaveProperty(
        "blog-recent",
      );
    });
    /* The parts always in their item have none: the Blog's templates have one on each option */
    expect(() => drafted({ "header status": "soon" })).toThrow("This one is always shown");
    expect(() => drafted({ "catalogue-custom status": "soon" })).toThrow(
      "This one is always shown",
    );
  });

  test("the tier badge is the tier of the option or quantity in use, as the estimate's tier is", () => {
    const external = drafted({
      "external-forms·HubDB status": "",
      "external-forms·External API status": "",
    });
    withCatalog(external, () => {
      const forms = getTile("external-forms");
      expect([tierMark(forms, 1), tierMark(forms, 2)]).toEqual(["Pro", "Ent"]);
      /* On the shelf: the option it starts with */
      expect(tierMark(forms)).toBe("Pro");
      const api = quote(
        setQuantity(setTile(essential(), "external-forms", true), "external-forms", 2),
      );
      expect(api.edition).toBe("enterprise");
    });
    /* From a quantity on: Memberships' access groups need Enterprise from 3 */
    const groups = getTile("membership-groups");
    expect([tierMark(groups, 2), tierMark(groups, 3)]).toEqual([undefined, "Ent"]);
    /* Each source of the catalogue has its own */
    expect(tierMark(getTile("product-catalogue"))).toBe("Pro");
    expect(tierMark(getTile("catalogue-objects"))).toBe("Ent");
    /* Every item and option: its badge is the tier the starting estimate needs with it in */
    const mark = {
      free: undefined,
      starter: undefined,
      professional: "Pro",
      enterprise: "Ent",
    } as const;
    for (const tile of tiles) {
      if (tile.hidden || tile.disabled || tile.place === "design" || tile.designOf) continue;
      if (tile.place === "basics") continue;
      const levels = tile.modes ? tile.modes.map((_, index) => index + 1) : [tile.min, tile.max];
      for (const level of levels) {
        const priced = quote(setQuantity(setTile(essential(), tile.id, true), tile.id, level));
        if (priced.selection.tiles[tile.id] !== level) continue;
        expect([tile.id, level, tierMark(tile, level)]).toEqual([
          tile.id,
          level,
          mark[priced.edition],
        ]);
      }
    }
  });

  test("an item that needs a package as soon as it is in sits in that package's shelf group, hours entered too", () => {
    expect(shelfGroupOf("custom-integration")).toBe("Any package");
    withCatalog(drafted({ "custom-integration package": "platform" }), () => {
      expect(shelfGroupOf("custom-integration")).toBe("Needs Platform");
      const priced = quote(setTile(essential(), "custom-integration", true));
      /* In with no hours yet, it needs Platform already, and has no "from" hint */
      expect(priced.shape).toBe("platform");
      expect(ruleFor("custom-integration", priced)).toBeUndefined();
    });
    /* From a quantity on, it stays where it is, with its hint */
    withCatalog(drafted({ "custom-integration package": "platform from 40" }), () => {
      expect(shelfGroupOf("custom-integration")).toBe("Any package");
      expect(ruleFor("custom-integration", quote(essential()))?.text).toBe("40+ → Platform");
    });
    /* From 1 hour too: in with no hours, the price still needs no Platform */
    withCatalog(drafted({ "custom-integration package": "platform from 1" }), () => {
      expect(shelfGroupOf("custom-integration")).toBe("Any package");
      const priced = quote(setTile(essential(), "custom-integration", true));
      expect(priced.shape).toBe("essential");
      expect(ruleFor("custom-integration", priced)?.text).toBe("1+ → Platform");
    });
  });

  test("an item with options sits in the shelf group of the option it starts with", () => {
    /* Search starts with Simple, which needs no package; Advanced needs Growth */
    expect(shelfGroupOf("search")).toBe("Any package");
    withCatalog(drafted({ "search·Advanced start": "1" }), () => {
      expect(shelfGroupOf("search")).toBe("Needs Growth");
      expect(quote(setTile(essential(), "search", true)).shape).toBe("growth");
    });
    /* Simple needs Growth from the start, and Advanced's Platform still shows as the next step */
    withCatalog(
      drafted({ "search·Simple package": "growth", "search·Advanced package": "platform" }),
      () => {
        expect(shelfGroupOf("search")).toBe("Needs Growth");
        const priced = quote(setTile(essential(), "search", true));
        expect(priced.shape).toBe("growth");
        expect(ruleFor("search", priced)).toEqual({ text: "Advanced → Platform", on: true });
      },
    );
    /* HubDB starts with Dynamic pages: Simple: its package, not Module based's, places it */
    withCatalog(drafted({ "product-catalogue·Dynamic pages: Simple package": "growth" }), () => {
      expect(shelfGroupOf("product-catalogue")).toBe("Needs Growth");
      expect(quote(setTile(essential(), "product-catalogue", true)).shape).toBe("growth");
    });
  });

  test("the shelf has the Product catalogue while any of its sources is live; it comes with the first", () => {
    const every = (id: string, status: string) =>
      Object.fromEntries(catalogueOptions.map((option) => [`${id}·${option} status`, status]));
    expect(shelfLanes().laneIds).toContain("product-catalogue");
    withCatalog(
      drafted({ ...every("product-catalogue", "soon"), ...every("catalogue-crm", "") }),
      () => {
        expect(shelfLanes().laneIds).toContain("product-catalogue");
        const added = quote(setTile(essential(), "product-catalogue", true)).selection.tiles;
        expect(added).not.toHaveProperty("product-catalogue");
        expect(added["catalogue-crm"]).toBe(2);
        /* On the shelf it needs what CRM Object, the source it comes with, needs */
        expect(shelfGroupOf("product-catalogue")).toBe("Needs Platform");
      },
    );
    withCatalog(
      drafted({ ...every("product-catalogue", "hidden"), ...every("catalogue-crm", "") }),
      () => expect(shelfGroupOf("product-catalogue")).toBe("Needs Platform"),
    );
    withCatalog(drafted(every("product-catalogue", "soon")), () => {
      expect(shelfLanes().laneIds).not.toContain("product-catalogue");
      expect(shelfLanes().blockedShelfIds).toContain("product-catalogue");
    });
    withCatalog(
      drafted({
        ...every("product-catalogue", "hidden"),
        ...every("catalogue-crm", "hidden"),
        ...every("catalogue-objects", "hidden"),
      }),
      () => {
        expect(shelfLanes().laneIds).not.toContain("product-catalogue");
        expect(shelfLanes().blockedShelfIds).not.toContain("product-catalogue");
      },
    );
  });

  test("a table without an item the page is built around is refused", () => {
    expect(() => catalog(rows.filter((item) => item.id !== "templates"))).toThrow(
      "no templates row",
    );
    expect(() =>
      catalog([...rows, row({ id: "languages", item: "Languages", place: "basics" })]),
    ).toThrow("made from the rules");
  });
});

describe("the short link", () => {
  test("these links mean these estimates: a change here breaks links already sent", () => {
    expect(encodeSelection(essential())).toBe("ONiNI");
    expect(decodeSelection("ONiNI")).toEqual(essential());
    const priced = quote(decodeSelection(example) as Selection);
    /* Design 20h, build 77h, content 50h, the kick-off and training 7h, and project management:
       15% of 147h is 22.05, so 23h */
    expect(priced.hours).toBe(20 + 77 + 50 + 7 + 23);
    expect(priced.selection.tiles).toEqual({
      templates: 3,
      sections: 8,
      menu: 1,
      languages: 1,
      header: 1,
      footer: 1,
      setup: 1,
      kickoff: 1,
      training: 2,
      "ai-design": 2,
      "ai-feedback": 1,
      "landing-templates": 1,
      system: 1,
      "content-hours": 50,
    });
    expect(encodeSelection(priced.selection)).toBe(example);
  });

  test("is short: 5 letters for the starting estimate, under 60 with everything at its highest", () => {
    expect(encodeSelection(essential()).length).toBe(5);
    /* An item adds its code and its number: a few letters */
    expect(encodeSelection(setTile(essential(), "system", true)).length).toBeLessThanOrEqual(7);
    const all: Record<string, number> = {};
    for (const tile of tiles) {
      /* One design: AI generated, with its variants and rounds */
      if (!tile.disabled && !["nimbly-design", "custom-design", "no-design"].includes(tile.id)) {
        all[tile.id] = tile.max;
      }
    }
    all["product-catalogue"] = 5;
    const most = quote({ startingPoint: "cms-react", websitePages: 200, tiles: all }).selection;
    expect(Object.keys(most.tiles).length).toBeGreaterThan(24);
    expect(encodeSelection(most).length).toBeLessThan(60);
    expect(decodeSelection(encodeSelection(most))).toEqual(most);
  });

  test("gives back the estimate it was made from, whatever is in it", () => {
    let seed = 7;
    const random = (below: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return Math.floor((seed / 2 ** 32) * below);
    };
    for (let round = 0; round < 400; round += 1) {
      let selection = setWebsitePages(essential(), 1 + random(200));
      for (let step = random(12); step > 0; step -= 1) {
        const tile = tiles[random(tiles.length)];
        if (!tile) continue;
        selection =
          random(2) === 0
            ? setTile(selection, tile.id, random(4) > 0)
            : setQuantity(selection, tile.id, tile.min + random(tile.max - tile.min + 1));
      }
      const normal = quote(selection).selection;
      expect(decodeSelection(encodeSelection(normal))).toEqual(normal);
    }
  });

  test("is read from a code, a hash or a whole address", () => {
    const want = decodeSelection(example);
    expect(want).not.toBeNull();
    expect(decodeSelection(`#${example}`)).toEqual(want);
    expect(decodeSelection(`https://example.com/packages/#${example}`)).toEqual(want);
    expect(decodeSelection(`https://example.com/packages/calc/?draft#${example}`)).toEqual(want);
  });

  test("a link cut short, mistyped or made up is not a link", () => {
    for (const text of [
      "",
      "#",
      "A",
      "hello",
      "#s=cms-react&w=25&b=same&t=templates.3",
      example.slice(0, -1),
      example.slice(0, -3),
      `${example}A`,
      `${example}AA`,
      `C${example.slice(1)}`,
      /* One letter changed, anywhere */
      ...[...example].map(
        (letter, index) =>
          `${example.slice(0, index)}${letter === "A" ? "B" : "A"}${example.slice(index + 1)}`,
      ),
    ]) {
      expect(decodeSelection(text)).toBeNull();
    }
  });

  test("survives a new limit, a reordered table and a new task", () => {
    const want = quote(decodeSelection(example) as Selection);
    const shuffled = [
      ...applyCells(rows, { "sections max": "60", "content-hours max": "900" }),
    ].reverse();
    /* The modes of a task stay together, and the reversed table still reads */
    const regrouped = [...new Set(shuffled.map((item) => item.id))].flatMap((id) =>
      shuffled.filter((item) => item.id === id),
    );
    const extra = row({ id: "events", item: "Events", place: "shelf", ...allBuild("9") });
    /* A mode is a place among its task’s rows, so compare what is chosen by name */
    const named = (selection: Selection) =>
      Object.fromEntries(
        Object.entries(selection.tiles).map(([id, qty]) => [
          id,
          modeLabel(getTile(id), qty) ?? qty,
        ]),
      );
    const wanted = named(want.selection);
    withCatalog(catalog([extra, ...regrouped]), () => {
      const got = quote(decodeSelection(example) as Selection);
      expect(got.hours).toBe(want.hours);
      expect(named(got.selection)).toEqual(wanted);
    });
  });

  test("a mode keeps its meaning when its rows move", () => {
    const filtered = setQuantity(
      setTile(essential(), "product-catalogue", true),
      "product-catalogue",
      3,
    );
    const link = encodeSelection(quote(filtered).selection);
    const name = (selection: Selection | null) =>
      modeLabel(getTile("product-catalogue"), selection?.tiles["product-catalogue"] ?? 0);
    expect(name(decodeSelection(link))).toBe("Filtered");
    const modes = rows.filter((item) => item.id === "product-catalogue").reverse();
    const moved = rows.flatMap((item) =>
      item.id !== "product-catalogue"
        ? [item]
        : item === rows.find((r) => r.id === item.id)
          ? modes
          : [],
    );
    withCatalog(catalog(moved), () => {
      const decoded = decodeSelection(link);
      expect(decoded?.tiles["product-catalogue"]).toBe(3);
      expect(name(decoded)).toBe("Filtered");
      expect(quote(decoded as Selection).hours).toBe(quote(filtered).hours);
    });
  });

  test("a task that left the table drops out of the links that had it", () => {
    withCatalog(catalog(rows.filter((item) => item.id !== "system")), () => {
      const decoded = decodeSelection(example);
      expect(decoded?.tiles.system).toBeUndefined();
      expect(decoded?.tiles["content-hours"]).toBe(50);
    });
  });

  /** As many fixed numbers as the tests' links have: two, whatever the design. */
  const two = () => 2;

  test("the bits hold the pages, the design, any number from 1, any code, and nothing after them", () => {
    const packed = {
      over: true,
      design: 3,
      fixed: [1, 70000],
      entries: [
        [255, 400],
        [1, 1],
        [9, 2],
        [64, 70000],
      ] as const,
    };
    expect(unpackLink(packLink(packed), two)).toEqual({
      over: true,
      design: 3,
      fixed: [1, 70000],
      entries: [
        [1, 1],
        [9, 2],
        [64, 70000],
        [255, 400],
      ],
    });
    for (const design of [0, 1, 2, 3]) {
      const empty = { over: false, design, fixed: [1, 1], entries: [] };
      expect(unpackLink(packLink(empty), two)).toEqual(empty);
    }
    /* The design says how many fixed numbers follow; a design the app has not is no link */
    const text = packLink({ over: false, design: 2, fixed: [1, 1], entries: [] });
    expect(unpackLink(text, (design) => (design === 2 ? -1 : 2))).toBeNull();
  });

  test("has no highest code, and stays short when an estimate has a few high ones", () => {
    const low = {
      over: false,
      design: 1,
      fixed: [1, 3],
      entries: [
        [1, 3],
        [2, 8],
        [3, 1],
        [8, 2],
      ] as [number, number][],
    };
    const short = packLink(low);
    expect(unpackLink(short, two)).toEqual(low);
    for (const high of [256, 1000, 70000]) {
      const packed = { ...low, entries: [...low.entries, [high, 2]] as [number, number][] };
      const text = packLink(packed);
      expect(unpackLink(text, two)).toEqual(packed);
      /* The codes as steps instead of a bit for every code up to the highest */
      expect(text.length).toBeLessThan(short.length + 8);
    }
    /* A thousand tasks, all in */
    const all = Array.from({ length: 1000 }, (_, index) => [index + 1, 1] as [number, number]);
    expect(
      unpackLink(packLink({ over: false, design: 0, fixed: [1, 1], entries: all }), two)?.entries,
    ).toEqual(all);
  });

  test("leaves out what every estimate has as it is, and writes the usual numbers in a bit", () => {
    /* The header, footer, setup and launch and kick-off are in every estimate, once: no code */
    const start = quote(essential()).selection;
    for (const id of ["header", "footer", "setup", "kickoff"]) {
      const without = { ...start, tiles: { ...start.tiles } };
      delete without.tiles[id];
      expect(encodeSelection(without)).toBe(encodeSelection(start));
    }
    /* Two website pages, as the estimator offers them: up to what Starter takes, or more */
    const over = quote(setWebsitePages(essential(), 31)).selection;
    expect(quote(setWebsitePages(essential(), 120)).selection.websitePages).toBe(31);
    expect(decodeSelection(encodeSelection(over))?.websitePages).toBe(31);
    expect(encodeSelection(over).length).toBe(encodeSelection(start).length);
  });

  test("a new item gets the next code ever given, a new option the next number, and none is reused", () => {
    const highest = Math.max(...codes.map((entry) => entry.code));
    const given = withCodes(codes, [
      { id: "booking", option: "" },
      { id: "menu", option: "Mega" },
      { id: "chat", option: "Basic" },
      { id: "chat", option: "Pro" },
    ]);
    const entry = (id: string) => given.find((item) => item.id === id);
    expect(entry("booking")?.code).toBe(highest + 1);
    expect(entry("menu")?.options).toEqual(["Simple", "Advanced", "Mega"]);
    expect(entry("chat")).toEqual({ id: "chat", code: highest + 2, options: ["Basic", "Pro"] });
    /* Codes already given stay, those of items gone included */
    expect(given.slice(0, codes.length)).toEqual(
      codes.map((item) =>
        item.id === "menu" ? { ...item, options: [...item.options, "Mega"] } : item,
      ),
    );
    const gone = withCodes(
      codes,
      rows
        .filter((item) => item.id !== "system")
        .map((item) => ({ id: item.id, option: item.option })),
    );
    expect(gone.find((item) => item.id === "system")?.code).toBe(
      codes.find((item) => item.id === "system")?.code,
    );
    /* A renamed option is a new one: links with the old name fall back to the first option */
    const renamed = applyCells(rows, { "menu·Advanced option": "Mega" });
    const built = catalog(renamed);
    expect(built.byId.get("menu")?.modes?.map((mode) => mode.value)).toEqual([1, 3]);
  });
});

describe("the Product catalogue from another source", () => {
  /** CRM Object with every option live, and 30h to build Filtered with Nimbly; Custom Object with
      Module based only. */
  const sources = () =>
    drafted({
      ...Object.fromEntries(
        catalogueOptions.map((option) => [`catalogue-crm·${option} status`, ""]),
      ),
      "catalogue-crm·Dynamic pages: Filtered build-nimbly": "30",
      "catalogue-objects·Module based status": "",
    });
  const catalogue = () => setTile(essential(), "product-catalogue", true);
  const filtered = () => setQuantity(catalogue(), "product-catalogue", 3);

  test("switching source keeps the option; the hours, package and tier are the source's", () => {
    withCatalog(sources(), () => {
      const crm = quote(setSource(filtered(), "catalogue-crm"));
      expect(crm.selection.tiles["catalogue-crm"]).toBe(3);
      expect(crm.selection.tiles).not.toHaveProperty("product-catalogue");
      const line = crm.lines.find((item) => item.id === "catalogue-crm");
      expect(line?.openHours).toBe(30);
      expect(lineName(line as HourLine)).toBe("Product catalogue (CRM Object) · Filtered");
      expect(crm.lines.find((item) => item.id === "nimbly-catalogue-crm")?.openHours).toBe(18);
      expect([crm.shape, crm.edition]).toEqual(["platform", "professional"]);
      /* A link keeps the source and its option */
      expect(decodeSelection(encodeSelection(crm.selection))?.tiles["catalogue-crm"]).toBe(3);
      /* Back to HubDB: its own hours */
      const back = quote(setSource(crm.selection, "product-catalogue"));
      expect(back.selection.tiles["product-catalogue"]).toBe(3);
      expect(back.lines.find((item) => item.id === "product-catalogue")?.openHours).toBe(28);
      /* Custom Object has Module based only: it takes the option it can, and Related products
         go, as with Module based from any source */
      const related = setTile(crm.selection, "related-products", true);
      expect(related.tiles["related-products"]).toBe(1);
      const objects = quote(setSource(related, "catalogue-objects"));
      expect(objects.selection.tiles["catalogue-objects"]).toBe(1);
      expect(objects.selection.tiles).not.toHaveProperty("related-products");
      expect(objects.edition).toBe("enterprise");
      expect(
        quote(setTile(objects.selection, "related-products", true)).selection.tiles,
      ).not.toHaveProperty("related-products");
    });
  });

  test("a source with no live option cannot be chosen", () => {
    const crm = setSource(filtered(), "catalogue-crm");
    expect(crm.tiles["product-catalogue"]).toBe(3);
    expect(crm.tiles).not.toHaveProperty("catalogue-crm");
  });

  test("the hours entered for Custom stay with the catalogue when its source changes", () => {
    withCatalog(sources(), () => {
      const custom = setQuantity(
        setQuantity(catalogue(), "product-catalogue", 5),
        "catalogue-custom",
        25,
      );
      const crm = quote(setSource(custom, "catalogue-crm"));
      expect(crm.selection.tiles["catalogue-crm"]).toBe(5);
      expect(crm.lines.find((item) => item.id === "catalogue-custom")?.openHours).toBe(25);
      expect(
        quote(setQuantity(crm.selection, "catalogue-crm", 2)).selection.tiles,
      ).not.toHaveProperty("catalogue-custom");
    });
  });

  test("taking the catalogue out takes its source and its parts; an estimate has one source", () => {
    withCatalog(sources(), () => {
      const crm = setTile(setSource(filtered(), "catalogue-crm"), "favorite-products", true);
      const out = quote(setTile(crm, "product-catalogue", false)).selection.tiles;
      expect(out).not.toHaveProperty("catalogue-crm");
      expect(out).not.toHaveProperty("favorite-products");
      /* A link with two sources keeps the first of the table's */
      const two = { ...crm, tiles: { ...crm.tiles, "product-catalogue": 2 } };
      const kept = quote(two).selection.tiles;
      expect(kept["product-catalogue"]).toBe(2);
      expect(kept).not.toHaveProperty("catalogue-crm");
      expect(kept["favorite-products"]).toBe(1);
    });
  });
});
