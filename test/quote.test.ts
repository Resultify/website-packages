import { describe, expect, test } from "bun:test";
import { parcels } from "../src/catalog.ts";
import {
  decodeSelection,
  encodeSelection,
  quote,
  selectionForShape,
  setQuantity,
  setTile,
  setWebsitePages,
  stepQuantity,
} from "../src/quote.ts";

const lite = () => selectionForShape("lite");

describe("Lite", () => {
  test("discounts 132 open hours to 66 and stays on Starter at 25 pages", () => {
    const priced = quote(lite());

    expect(priced.label).toBe("Lite");
    expect(priced.shape).toBe("lite");
    expect(priced.foundationHours).toBe(56);
    expect(priced.selection.websitePages).toBe(25);
    expect(priced.openHours).toBe(132);
    expect(priced.hours).toBe(66);
    expect(priced.savedHours).toBe(66);
    expect(priced.designHours).toBe(0);
    expect(priced.contentHours).toBe(0);
    expect(priced.implementationHours).toBe(66);
    expect(priced.lines.find((line) => line.id === "blog-recent")?.mode).toBe("Simple");
    expect(priced.edition).toBe("starter");
    expect(priced.usualEditionWarning).toBeNull();
    expect(priced.lines.find((line) => line.id === "blog-list")?.mode).toBe("Simple");
    expect(priced.lines.find((line) => line.id === "blog-list")?.extra).toBe(false);
    expect(priced.lines.find((line) => line.id === "blog-post")?.extra).toBe(false);
    expect(priced.lines.find((line) => line.id === "blog-setups")?.extra).toBe(false);
    expect(priced.lines.find((line) => line.id === "header")?.extra).toBe(false);
    expect(priced.lines.find((line) => line.id === "footer")?.extra).toBe(false);
    expect(priced.lines.find((line) => line.id === "setup")?.openHours).toBe(12);
    expect(priced.lines.find((line) => line.id === "setup")?.extra).toBe(false);
  });

  test("page count does not add build hours", () => {
    const priced = quote(setWebsitePages(lite(), 31));
    expect(priced.openHours).toBe(132);
    expect(priced.hours).toBe(66);
    expect(priced.edition).toBe("professional");
    expect(priced.editionReasons).toContain("31 website pages need Content Hub Professional");
    expect(priced.usualEditionWarning).toContain("Lite is usually Content Hub Starter");
  });
});

describe("bands and extras", () => {
  test("Lite is 50% off, Growth is 35% off, and Platform is 20% off", () => {
    expect(parcels.map((parcel) => [parcel.id, parcel.discount])).toEqual([
      ["lite", 0.5],
      ["growth", 0.35],
      ["platform", 0.2],
    ]);
    for (const parcel of parcels) {
      const priced = quote(selectionForShape(parcel.id));
      expect(priced.savedHours).toBe(Math.round(priced.openHours * parcel.discount * 100) / 100);
      expect(priced.extraCount).toBe(0);
    }
  });

  test("templates are 3h and sections are 3h inside the Lite band", () => {
    const three = quote(setQuantity(lite(), "templates", 3));
    const sections = quote(setQuantity(lite(), "sections", 12));
    expect(three.shape).toBe("lite");
    expect(three.lines.find((line) => line.id === "templates")?.openHours).toBe(9);
    expect(sections.shape).toBe("lite");
    expect(sections.lines.find((line) => line.id === "sections")?.openHours).toBe(36);
  });

  test("five templates leave Lite", () => {
    const priced = quote(setQuantity(lite(), "templates", 5));
    expect(priced.shape).toBe("custom");
    expect(
      priced.restore?.missing.some((piece) => piece.tileId === "templates" && piece.need === 4),
    ).toBe(true);
  });

  test("stepping past a band prepares the next package", () => {
    const atFour = setQuantity(lite(), "templates", 4);
    const growth = quote(stepQuantity(atFour, "templates", 5));
    expect(growth.shape).toBe("growth");
    expect(growth.selection.tiles.templates).toBe(5);
    expect(growth.selection.websitePages).toBe(25);

    const atEdge = setQuantity(selectionForShape("growth"), "templates", 6);
    const platform = quote(stepQuantity(atEdge, "templates", 7));
    expect(platform.shape).toBe("platform");
    expect(platform.selection.tiles.templates).toBe(7);

    const custom = quote(stepQuantity(selectionForShape("platform"), "templates", 13));
    expect(custom.shape).toBe("custom");
    expect(custom.selection.tiles.templates).toBe(13);
  });

  test("Lite allows one extra at item price", () => {
    const priced = quote(setTile(lite(), "search", true));
    expect(priced.label).toBe("Lite + 1");
    expect(priced.hours).toBe(72);
    expect(priced.savedHours).toBe(66);
  });

  test("a second extra drops the Lite rate", () => {
    const priced = quote(setTile(setTile(lite(), "search", true), "landing-templates", true));
    expect(priced.shape).toBe("custom");
    expect(priced.hours).toBe(141);
    expect(priced.restore?.trim.map((piece) => piece.tileId)).toContain("search");
  });

  test("Growth allows three extras and Platform allows four", () => {
    const growth = selectionForShape("growth");
    let selected = growth;
    for (const id of ["ctas", "video", "landing-templates"] as const) {
      selected = setTile(selected, id, true);
    }
    expect(quote(selected).label).toBe("Growth + 3");
    expect(quote(setTile(selected, "custom-forms", true)).shape).toBe("custom");

    const platform = selectionForShape("platform");
    expect(quote(platform).edition).toBe("professional");
    expect(quote(platform).parcel?.maxExtras).toBe(4);
    let wide = platform;
    for (const id of ["ctas", "video", "landing-templates", "custom-forms"] as const) {
      wide = setTile(wide, id, true);
    }
    expect(quote(wide).label).toBe("Platform + 4");
  });

  test("removing a package piece drops the rate", () => {
    const priced = quote(setTile(lite(), "system", false));
    expect(priced.shape).toBe("custom");
    expect(priced.hours).toBe(130);
    expect(priced.restore?.missing.map((piece) => piece.tileId)).toEqual(["system"]);
    expect(priced.restore?.savedHours).toBe(64);
  });
});

describe("blog, languages, redirects, and add-ons", () => {
  test("the second language is 20h and each next one is 5h", () => {
    const two = quote(setQuantity(lite(), "languages", 2));
    const three = quote(setQuantity(lite(), "languages", 3));
    expect(two.shape).toBe("lite");
    expect(two.lines.find((line) => line.id === "languages")?.openHours).toBe(20);
    expect(three.lines.find((line) => line.id === "languages")?.openHours).toBe(25);
  });

  test("Lite holds one blog and a second blog needs Professional", () => {
    const priced = quote(setQuantity(lite(), "blog-setups", 2));
    expect(priced.shape).toBe("custom");
    expect(priced.edition).toBe("professional");
    expect(priced.lines.find((line) => line.id === "blog-setups")?.openHours).toBe(2);
    expect(priced.editionReasons).toContain("2 blogs need Content Hub Professional");
  });

  test("serverless hours are whatever is entered, and a domain is 5h", () => {
    const empty = quote(setTile(lite(), "serverless", true));
    expect(empty.label).toBe("Lite + 1");
    expect(empty.hours).toBe(66);
    expect(empty.edition).toBe("enterprise");
    const filled = quote(setQuantity(empty.selection, "serverless", 12));
    expect(filled.hours).toBe(78);

    const domain = quote(setTile(lite(), "domains", true));
    expect(domain.hours).toBe(71);
    expect(domain.editionReasons).toContain("A second root domain needs Content Hub Enterprise");
  });

  test("the first 100 redirects are 6h and the next 100 are 2h", () => {
    const first = quote(setTile(lite(), "redirects", true));
    const next = quote(setQuantity(first.selection, "redirects", 200));
    expect(first.lines.find((line) => line.id === "redirects")?.openHours).toBe(6);
    expect(next.lines.find((line) => line.id === "redirects")?.openHours).toBe(8);
  });

  test("the second custom form adds 4h", () => {
    const one = quote(setTile(lite(), "custom-forms", true));
    const two = quote(setQuantity(one.selection, "custom-forms", 2));
    expect(one.lines.find((line) => line.id === "custom-forms")?.openHours).toBe(8);
    expect(two.lines.find((line) => line.id === "custom-forms")?.openHours).toBe(12);
  });

  test("a planned tile cannot be added", () => {
    const priced = quote(setTile(lite(), "meetings", true));
    expect(priced.selection.tiles.meetings).toBeUndefined();
    expect(priced.hours).toBe(66);
  });
});

describe("dependencies", () => {
  test("a product catalogue brings HubDB and fits Platform", () => {
    const selected = setTile(selectionForShape("growth"), "product-catalogue", true);
    const priced = quote(selected);
    expect(selected.tiles.hubdb).toBe(1);
    expect(priced.shape).toBe("platform");
    expect(priced.lines.find((line) => line.id === "product-catalogue")?.extra).toBe(false);
    expect(priced.lines.find((line) => line.id === "product-catalogue")?.mode).toBe("Basic");
  });

  test("a planned tile cannot be added", () => {
    const priced = quote(setTile(lite(), "external-forms", true));
    expect(priced.selection.tiles["external-forms"]).toBeUndefined();
    expect(priced.hours).toBe(66);
  });

  test("turning HubDB off also turns off the catalogue", () => {
    const selected = setTile(
      setTile(selectionForShape("growth"), "product-catalogue", true),
      "hubdb",
      false,
    );
    expect(selected.tiles.hubdb).toBeUndefined();
    expect(selected.tiles["product-catalogue"]).toBeUndefined();
  });
});

describe("design and content", () => {
  test("design is discounted with the package and content stays full", () => {
    const ai = quote(setTile(lite(), "ai-design", true));
    expect(ai.shape).toBe("lite");
    expect(ai.extraCount).toBe(0);
    expect(ai.designHours).toBe(20);
    expect(ai.packageOpenHours).toBe(152);
    expect(ai.packageHours).toBe(76);
    expect(ai.hours).toBe(76);

    const custom = quote(setTile(ai.selection, "custom-design", true));
    expect(custom.selection.tiles["ai-design"]).toBeUndefined();
    expect(custom.designHours).toBe(30);
    expect(custom.packageHours).toBe(81);
    expect(custom.hours).toBe(81);

    const content = quote(setQuantity(setTile(lite(), "content-hours", true), "content-hours", 10));
    expect(content.shape).toBe("lite");
    expect(content.extraCount).toBe(0);
    expect(content.packageHours).toBe(66);
    expect(content.contentHours).toBe(10);
    expect(content.hours).toBe(76);
  });
});

describe("links", () => {
  test("a link round-trips the selection", () => {
    const selected = selectionForShape("platform", 40);
    expect(decodeSelection(`#${encodeSelection(selected)}`)).toEqual(selected);
    expect(decodeSelection("")).toBeNull();
    expect(decodeSelection("#s=nimbly-lite&w=25&b=same&t=")).toBeNull();
  });
});
