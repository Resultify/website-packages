import { describe, expect, test } from "bun:test";
import { packageName } from "../src/catalog.ts";
import {
  decodeSelection,
  encodeSelection,
  quote,
  selectionForShape,
  setQuantity,
  setTile,
  setWebsitePages,
} from "../src/quote.ts";

const essential = () => selectionForShape("essential");

describe("Essential", () => {
  test("starts at 100h with custom design on and the blog off", () => {
    const priced = quote(essential());

    expect(priced.label).toBe(packageName.essential);
    expect(priced.shape).toBe("essential");
    expect(priced.foundationHours).toBe(0);
    expect(priced.lines.find((line) => line.id === "foundation")).toBeUndefined();
    expect(priced.selection.websitePages).toBe(25);
    expect(priced.designHours).toBe(45);
    expect(priced.implementationHours).toBe(55);
    expect(priced.contentHours).toBe(0);
    expect(priced.hours).toBe(100);
    expect(priced.savedHours).toBe(0);
    expect(priced.edition).toBe("starter");
    expect(priced.lines.find((line) => line.id === "templates")?.openHours).toBe(6);
    expect(priced.lines.find((line) => line.id === "design-templates")?.openHours).toBe(9);
    expect(priced.lines.find((line) => line.id === "blog-list")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "design-blog-list")).toBeUndefined();
    expect(priced.selection.tiles["blog-setups"]).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "forms")?.openHours).toBe(2);
    expect(priced.lines.find((line) => line.id === "launch")?.openHours).toBe(6);
    expect(priced.lines.find((line) => line.id === "blog-recent")).toBeUndefined();
    expect(priced.selection.tiles["ai-design"]).toBeUndefined();
    expect(priced.selection.tiles["custom-design"]).toBe(1);
  });

  test("page count does not add build hours", () => {
    const priced = quote(setWebsitePages(essential(), 31));
    expect(priced.hours).toBe(100);
    expect(priced.edition).toBe("professional");
    expect(priced.editionReasons).toContain("31 website pages need Content Hub Professional");
    expect(priced.usualEditionWarning).toContain("Essential is usually Content Hub Starter");
  });

  test("turning custom design off removes design hours and leaves the build", () => {
    const priced = quote(setTile(essential(), "custom-design", false));
    expect(priced.shape).toBe("essential");
    expect(priced.designHours).toBe(0);
    expect(priced.implementationHours).toBe(55);
    expect(priced.hours).toBe(55);
    expect(priced.lines.find((line) => line.id === "design-base")).toBeUndefined();
  });
});

describe("package from options", () => {
  test("three templates stay Essential and four move to Growth", () => {
    expect(quote(setQuantity(essential(), "templates", 3)).shape).toBe("essential");
    const four = quote(setQuantity(essential(), "templates", 4));
    expect(four.shape).toBe("growth");
    expect(four.lines.find((line) => line.id === "templates")?.openHours).toBe(8);
    expect(four.lines.find((line) => line.id === "design-templates")?.openHours).toBe(12);
  });

  test("ten sections stay Essential and eleven move to Growth", () => {
    expect(quote(setQuantity(essential(), "sections", 10)).shape).toBe("essential");
    expect(quote(setQuantity(essential(), "sections", 11)).shape).toBe("growth");
  });

  test("an advanced menu, search, or recent posts needs Growth", () => {
    expect(quote(setQuantity(essential(), "menu", 2)).shape).toBe("growth");
    expect(quote(setTile(essential(), "search", true)).shape).toBe("essential");
    expect(quote(setQuantity(setTile(essential(), "search", true), "search", 2)).shape).toBe(
      "growth",
    );
    const withBlog = quote(setTile(essential(), "blog-setups", true));
    const simple = quote(setTile(withBlog.selection, "blog-recent", true));
    const advanced = quote(setQuantity(simple.selection, "blog-recent", 2));
    expect(simple.shape).toBe("essential");
    expect(simple.lines.find((line) => line.id === "blog-recent")?.openHours).toBe(4);
    expect(simple.lines.find((line) => line.id === "design-recent")?.openHours).toBe(4);
    expect(advanced.shape).toBe("growth");
    expect(advanced.lines.find((line) => line.id === "blog-recent")?.openHours).toBe(4);
    expect(advanced.lines.find((line) => line.id === "design-recent")?.openHours).toBe(4);
  });

  test("always-on items cannot be removed", () => {
    const priced = quote(setTile(essential(), "system", false));
    expect(priced.selection.tiles.system).toBe(1);
    expect(priced.shape).toBe("essential");
    const withoutForms = quote(setTile(essential(), "forms", false));
    expect(withoutForms.selection.tiles.forms).toBeUndefined();
    expect(withoutForms.lines.find((line) => line.id === "forms")).toBeUndefined();
  });

  test("CTAs stay on Essential and custom forms or HubDB move to Growth", () => {
    expect(quote(setTile(essential(), "ctas", true)).shape).toBe("essential");
    expect(
      quote(setTile(essential(), "ctas", true)).lines.find((line) => line.id === "ctas")?.openHours,
    ).toBe(1);
    const forms = quote(setTile(essential(), "custom-forms", true));
    expect(forms.shape).toBe("growth");
    expect(forms.lines.find((line) => line.id === "custom-forms")?.openHours).toBe(6);
    const two = quote(setQuantity(forms.selection, "custom-forms", 2));
    expect(two.lines.find((line) => line.id === "custom-forms")?.openHours).toBe(8);
    const hubdb = quote(setTile(essential(), "hubdb", true));
    expect(hubdb.shape).toBe("growth");
    expect(hubdb.lines.find((line) => line.id === "hubdb")?.openHours).toBe(10);
  });

  test("a product catalogue needs Platform", () => {
    const catalogue = quote(setTile(essential(), "product-catalogue", true));
    expect(catalogue.shape).toBe("platform");
    expect(catalogue.selection.tiles.hubdb).toBeUndefined();
    expect(catalogue.selection.tiles["product-catalogue"]).toBe(2);
    expect(catalogue.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(16);
    const moduleBased = quote(setQuantity(catalogue.selection, "product-catalogue", 1));
    expect(moduleBased.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(28);
    const filtered = quote(setQuantity(catalogue.selection, "product-catalogue", 3));
    expect(filtered.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(28);
    const multi = quote(setQuantity(catalogue.selection, "product-catalogue", 4));
    expect(multi.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(48);

    const favorites = quote(
      setQuantity(setTile(catalogue.selection, "favorite-products", true), "favorite-products", 2),
    );
    expect(favorites.lines.find((line) => line.id === "favorite-products")?.openHours).toBe(12);
    expect(
      quote(setTile(essential(), "favorite-products", true)).selection.tiles["favorite-products"],
    ).toBeUndefined();

    const related = quote(setTile(catalogue.selection, "related-products", true));
    expect(related.lines.find((line) => line.id === "related-products")?.openHours).toBe(6);
    expect(
      quote(setQuantity(related.selection, "product-catalogue", 1)).selection.tiles[
        "related-products"
      ],
    ).toBeUndefined();
    expect(
      quote(setTile(moduleBased.selection, "related-products", true)).selection.tiles[
        "related-products"
      ],
    ).toBeUndefined();
  });
});

describe("blog, languages, and content", () => {
  test("the second language is 20h and needs Growth", () => {
    const two = quote(setQuantity(essential(), "languages", 2));
    const three = quote(setQuantity(essential(), "languages", 3));
    expect(two.shape).toBe("growth");
    expect(two.lines.find((line) => line.id === "languages")?.openHours).toBe(20);
    expect(three.lines.find((line) => line.id === "languages")?.openHours).toBe(25);
  });

  test("one blog includes one simple list and post, and a second blog needs Growth", () => {
    const priced = quote(setQuantity(essential(), "blog-setups", 2));
    expect(priced.shape).toBe("growth");
    expect(priced.edition).toBe("professional");
    expect(priced.lines.find((line) => line.id === "blog-setups")?.openHours).toBe(0);
    expect(priced.selection.tiles["blog-list-count"]).toBe(1);
    expect(priced.selection.tiles["blog-post-count"]).toBe(1);
    expect(priced.lines.find((line) => line.id === "blog-list")?.openHours).toBe(4);

    const advanced = quote(setQuantity(priced.selection, "blog-list", 2));
    expect(advanced.lines.find((line) => line.id === "blog-list")?.openHours).toBe(8);
    expect(advanced.lines.find((line) => line.id === "design-blog-list")?.openHours).toBe(6);
    const twoLists = quote(setQuantity(advanced.selection, "blog-list-count", 2));
    expect(twoLists.lines.find((line) => line.id === "blog-list")?.openHours).toBe(16);
    expect(twoLists.lines.find((line) => line.id === "design-blog-list")?.openHours).toBe(12);
  });

  test("turning the blog off removes its templates and recent posts", () => {
    const withRecent = setTile(setTile(essential(), "blog-setups", true), "blog-recent", true);
    const off = quote(setTile(withRecent, "blog-setups", false));
    expect(off.selection.tiles["blog-setups"]).toBeUndefined();
    expect(off.selection.tiles["blog-list"]).toBeUndefined();
    expect(off.selection.tiles["blog-post"]).toBeUndefined();
    expect(off.selection.tiles["blog-recent"]).toBeUndefined();
    expect(off.lines.find((line) => line.id === "design-blog-list")).toBeUndefined();
    expect(
      quote(setTile(off.selection, "blog-recent", true)).selection.tiles["blog-recent"],
    ).toBeUndefined();
  });

  test("additional redirects are not in the build yet", () => {
    const priced = quote(setTile(essential(), "redirects", true));
    expect(priced.selection.tiles.redirects).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "redirects")).toBeUndefined();
    expect(priced.implementationHours).toBe(55);
  });

  test("content hours stay out of the build", () => {
    const content = quote(
      setQuantity(setTile(essential(), "content-hours", true), "content-hours", 10),
    );
    expect(content.shape).toBe("essential");
    expect(content.designHours).toBe(45);
    expect(content.implementationHours).toBe(55);
    expect(content.contentHours).toBe(10);
    expect(content.hours).toBe(110);
  });

  test("a planned tile cannot be added", () => {
    const priced = quote(setTile(essential(), "event-catalogue", true));
    expect(priced.selection.tiles["event-catalogue"]).toBeUndefined();
    expect(priced.hours).toBe(100);
    expect(
      quote(setTile(essential(), "ai-design", true)).selection.tiles["ai-design"],
    ).toBeUndefined();
    expect(
      quote(setTile(essential(), "catalogue-objects", true)).selection.tiles["catalogue-objects"],
    ).toBeUndefined();
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
