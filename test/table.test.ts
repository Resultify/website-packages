/* The files (src/estimator.csv, rules.csv, link-codes.csv), drafts of them, and the short link. No
   browser needed. */
import { describe, expect, test } from "bun:test";
import {
  buildCatalog,
  catalogueSources,
  getTile,
  modeLabel,
  tiles,
  withCatalog,
} from "../src/catalog.ts";
import { blockedShelfIds, laneIds } from "../src/controls.ts";
import { packLink, unpackLink } from "../src/link.ts";
import {
  decodeSelection,
  encodeSelection,
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setTile,
  setWebsitePages,
} from "../src/quote.ts";
import scenarioText from "../src/scenarios.csv" with { type: "text" };
import {
  applyCells,
  type Cells,
  columns,
  liveCodesText,
  liveRulesText,
  liveText,
  parseCodes,
  parseCsv,
  parseRules,
  parseTable,
  type Row,
  type Rules,
  serializeCodes,
  serializeRules,
  serializeTable,
  withCodes,
} from "../src/table.ts";

const rows = parseTable(liveText);
const rules = parseRules(liveRulesText);
const codes = parseCodes(liveCodesText);
const essential = () => selectionForShape("essential");
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
  "build-design": hours,
  "build-custom": hours,
});

/** The estimate used across these tests: landing templates, system templates and 50h of content. */
const example = "BBkE_0kABIMIAwgCMg";

describe("the files", () => {
  test("are written exactly as they are read, so a change to one cell changes one line", () => {
    expect(serializeTable(rows)).toBe(liveText);
    expect(serializeRules(rules)).toBe(liveRulesText);
    expect(serializeCodes(codes)).toBe(liveCodesText);
  });

  test("quoted cells keep their commas, quotes and line breaks", () => {
    expect(parseCsv('a,"b, ""c""\nd",e\n\nf')).toEqual([["a", 'b, "c"\nd', "e"], ["f"]]);
    const odd = rows.map((item) => ({ ...item }));
    (odd[0] as Row).note = 'One, "two"\nthree';
    expect(parseTable(serializeTable(odd))[0]?.note).toBe('One, "two"\nthree');
  });

  test("every item has its own code, and every option its own number", () => {
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

  test("the estimates on the calculations page are links the app reads", () => {
    const links = parseCsv(scenarioText).slice(1);
    expect(links.length).toBeGreaterThan(0);
    for (const [name, link] of links) {
      expect(name).toBeTruthy();
      expect(decodeSelection(link ?? "")).not.toBeNull();
    }
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

describe("a draft", () => {
  test("prices an estimate with its own cells, and leaves the published files as they were", () => {
    expect(quote(essential()).hours).toBe(78);
    /* Sections with AI design: 4h each becomes 5h, for 8 sections */
    const draft = drafted({ "sections build-ai": "5" });
    expect(withCatalog(draft, () => quote(essential()).hours)).toBe(86);
    expect(quote(essential()).hours).toBe(78);
  });

  test("build hours follow the design choice of the estimate: no design takes Custom's", () => {
    const draft = drafted({ "sections build-custom": "6" });
    const custom = setTile(essential(), "custom-design", true);
    const none = setTile(essential(), "ai-design", false);
    withCatalog(draft, () => {
      const line = (selection: Selection) =>
        quote(selection).lines.find((item) => item.id === "sections")?.openHours;
      expect(line(essential())).toBe(32);
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
    expect(quote(two).shape).toBe("growth");
    expect(quote(two).hours).toBe(78 + 14);
    withCatalog(drafted({}, { "languages-growth-from": "3", "languages-second": "10" }), () => {
      expect(quote(two).shape).toBe("essential");
      expect(quote(two).hours).toBe(78 + 10);
    });
  });

  test("feedback rounds and variants come from the rules", () => {
    const rounds = setQuantity(essential(), "ai-feedback", 3);
    expect(quote(rounds).hours).toBe(78 + 2 * 3);
    expect(withCatalog(drafted({}, { "ai-feedback-each": "5" }), () => quote(rounds).hours)).toBe(
      78 + 2 * 5,
    );
    const variants = setQuantity(essential(), "ai-design", 3);
    /* One extra variant: half of the 18h of AI design, rounded up */
    expect(quote(variants).hours).toBe(78 + 9);
    expect(
      withCatalog(drafted({}, { "ai-variant-percent": "100" }), () => quote(variants).hours),
    ).toBe(78 + 18);
  });

  test("changes the hours of one option only", () => {
    const advanced = setQuantity(essential(), "menu", 2);
    const draft = drafted({ "menu·Advanced build-ai": "14" });
    expect(withCatalog(draft, () => quote(advanced).hours)).toBe(quote(advanced).hours + 2);
    expect(withCatalog(draft, () => quote(essential()).hours)).toBe(78);
  });

  test("a cell or rule the app cannot take is an error that names it", () => {
    expect(() => drafted({ "sections build-ai": "abc" })).toThrow(
      "Sections: build-ai must be a number",
    );
    expect(() => drafted({ "menu·Advanced package": "big" })).toThrow(
      "Menu, Advanced: package must be",
    );
    expect(() => drafted({ "menu·Advanced package": "growth from 2" })).toThrow('no "from"');
    expect(() => drafted({ "sections start": "50" })).toThrow(
      "Sections: start 50 is outside 1 to 40",
    );
    expect(() => drafted({ "sections status": "hidden" })).toThrow("always shown");
    expect(() => drafted({}, { "ai-feedback-each": "x" })).toThrow("Rule ai-feedback-each");
    expect(() => parseRules("rule,value\nnope,1\n")).toThrow("no rule called nope");
  });

  test("a new row is a new item on the shelf: its hours, design hours and package work at once", () => {
    const events = row({
      id: "events",
      item: "Events calendar",
      place: "shelf",
      ...allBuild("12"),
      "design-custom": "4",
      "design-ai": "1",
      package: "growth",
    });
    const added = catalog([...rows, events]);
    const highest = Math.max(...codes.map((entry) => entry.code));
    expect(added.byId.get("events")?.code).toBe(highest + 1);
    expect(added.codes.find((entry) => entry.id === "events")?.code).toBe(highest + 1);
    withCatalog(added, () => {
      const priced = quote(setTile(essential(), "events", true));
      expect(priced.lines.find((line) => line.id === "events")?.openHours).toBe(12);
      expect(priced.lines.find((line) => line.id === "ai-events")?.openHours).toBe(1);
      expect(priced.hours).toBe(78 + 12 + 1);
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
    expect(laneIds).toContain("system");
    expect(blockedShelfIds).toEqual([
      "crm-section",
      "crm-custom-section",
      "external-forms",
      "membership",
    ]);
    withCatalog(drafted({ "system status": "hidden", "hubdb status": "soon" }), () => {
      expect(getTile("system").hidden).toBe(true);
      expect(getTile("hubdb").disabled).toBe(true);
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
      expect(quote(decodeSelection(link) as Selection).hours).toBe(78);
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
    /* Forms + external data: HubDB live, External API still coming */
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
    /* The shelf in the estimator: its items in the table's order, then the Blog and the Product
       catalogue, then content */
    expect(laneIds).toEqual([
      "landing-templates",
      "search",
      "custom-forms",
      "system",
      "hubdb",
      "blog-setups",
      "product-catalogue",
      "content-hours",
      "migrate-pages",
      "migrate-posts",
    ]);
    /* Content: its hours are content hours, wherever the row is */
    withCatalog(drafted({ "landing-templates type": "content" }), () => {
      expect(getTile("landing-templates").bucket).toBe("content");
      const priced = quote(setTile(essential(), "landing-templates", true));
      expect(priced.contentHours).toBe(3);
      expect(priced.hours).toBe(78 + 3 + 1);
    });
    expect(() => drafted({ "templates place": "shelf" })).toThrow("place must be basics");
    expect(() =>
      drafted({ "search·Simple place": "basics", "search·Advanced place": "basics" }),
    ).toThrow("place cannot be basics");
    expect(() => drafted({ "hubdb place": "garden" })).toThrow("place must be one of");
    expect(() => drafted({ "blog-recent type": "content" })).toThrow("items of the shelf only");
    expect(() => drafted({ "hubdb type": "words" })).toThrow(
      "type must be empty (build) or content",
    );
  });

  test("the Product catalogue's sources come from the table: HubDB with its options, the rest to come", () => {
    const names = (list: readonly { source?: string }[]) => list.map((item) => item.source);
    expect(getTile("product-catalogue").label).toBe("Product catalogue");
    expect(getTile("product-catalogue").source).toBe("HubDB");
    withCatalog(drafted({}), () =>
      expect(names(catalogueSources())).toEqual(["HubDB", "CRM Object", "Custom Object"]),
    );
    withCatalog(drafted({ "catalogue-objects status": "hidden" }), () =>
      expect(names(catalogueSources())).toEqual(["HubDB", "CRM Object"]),
    );
    /* A source to come has nothing to offer yet, so it cannot be live */
    expect(() => drafted({ "catalogue-crm status": "" })).toThrow("status must be soon or hidden");
    /* Its reasons name the catalogue, not the source */
    expect(quote(setTile(essential(), "product-catalogue", true)).packageReasons).toEqual([
      "Product catalogue → Platform",
    ]);
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
  test("these links keep meaning these estimates: a change here breaks links already sent", () => {
    expect(encodeSelection(essential())).toBe("BBkC_wGDAAMIAg");
    const priced = quote(decodeSelection(example) as Selection);
    expect(priced.hours).toBe(139);
    expect(priced.selection.tiles).toEqual({
      templates: 3,
      sections: 8,
      menu: 1,
      languages: 1,
      header: 1,
      footer: 1,
      setup: 1,
      "ai-design": 2,
      "ai-feedback": 1,
      "landing-templates": 1,
      system: 1,
      "content-hours": 50,
    });
    expect(encodeSelection(priced.selection)).toBe(example);
  });

  test("is short: 14 letters for the starting estimate, under 50 with everything at its highest", () => {
    expect(encodeSelection(essential()).length).toBe(14);
    const all: Record<string, number> = {};
    for (const tile of tiles) {
      if (!tile.disabled && tile.id !== "custom-design") all[tile.id] = tile.max;
    }
    all["product-catalogue"] = 5;
    const most = quote({ startingPoint: "cms-react", websitePages: 200, tiles: all }).selection;
    expect(Object.keys(most.tiles).length).toBeGreaterThan(24);
    expect(encodeSelection(most).length).toBeLessThan(50);
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

  test("anything else is not a link", () => {
    for (const text of [
      "",
      "#",
      "hello",
      "#s=cms-react&w=25&b=same&t=templates.3",
      example.slice(0, -1),
      example.slice(0, -3),
      `${example}AA`,
      `C${example.slice(1)}`,
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

  test("the bytes hold any code and number, and nothing after them", () => {
    const packed = {
      mode: 3,
      pages: 200,
      entries: [
        [255, 400],
        [1, 1],
        [9, 0],
        [64, 70000],
      ] as const,
    };
    expect(unpackLink(packLink(packed))).toEqual({
      mode: 3,
      pages: 200,
      entries: [
        [1, 1],
        [9, 0],
        [64, 70000],
        [255, 400],
      ],
    });
    expect(unpackLink(packLink({ mode: 0, pages: 25, entries: [] }))).toEqual({
      mode: 0,
      pages: 25,
      entries: [],
    });
  });

  test("has no highest code, and stays short when an estimate has a few high ones", () => {
    const low = {
      mode: 0,
      pages: 25,
      entries: [
        [1, 3],
        [2, 8],
        [3, 1],
        [8, 2],
      ] as [number, number][],
    };
    /* Low codes: a bit for each, as every link so far */
    expect(packLink(low).startsWith("BB")).toBe(true);
    for (const high of [256, 1000, 70000]) {
      const packed = { ...low, entries: [...low.entries, [high, 2]] as [number, number][] };
      const text = packLink(packed);
      expect(unpackLink(text)).toEqual(packed);
      /* The codes as steps instead of a bit for every code up to the highest */
      expect(text.length).toBeLessThan(24);
    }
    /* A thousand tasks, all in */
    const all = Array.from({ length: 1000 }, (_, index) => [index + 1, 1] as [number, number]);
    expect(unpackLink(packLink({ mode: 1, pages: 3, entries: all }))?.entries).toEqual(all);
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
    expect(entry("blog-list-count")?.code).toBe(20);
    /* A renamed option is a new one: links with the old name fall back to the first option */
    const renamed = applyCells(rows, { "menu·Advanced option": "Mega" });
    const built = catalog(renamed);
    expect(built.byId.get("menu")?.modes?.map((mode) => mode.value)).toEqual([1, 3]);
  });
});
