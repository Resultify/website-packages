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
  test("starts at 78h with AI design on and custom design off", () => {
    const priced = quote(essential());

    expect(priced.label).toBe(packageName.essential);
    expect(priced.shape).toBe("essential");
    expect(priced.foundationHours).toBe(0);
    expect(priced.lines.find((line) => line.id === "foundation")).toBeUndefined();
    expect(priced.selection.websitePages).toBe(25);
    expect(priced.designHours).toBe(18);
    expect(priced.implementationHours).toBe(60);
    expect(priced.contentHours).toBe(0);
    expect(priced.hours).toBe(78);
    expect(priced.selection.tiles.system).toBeUndefined();
    expect(priced.savedHours).toBe(0);
    expect(priced.edition).toBe("starter");
    expect(priced.lines.find((line) => line.id === "templates")?.openHours).toBe(6);
    expect(priced.lines.find((line) => line.id === "sections")?.openHours).toBe(32);
    expect(priced.lines.find((line) => line.id === "menu")?.openHours).toBe(3);
    expect(priced.lines.find((line) => line.id === "ai-sections")?.openHours).toBe(8);
    expect(priced.lines.find((line) => line.id === "ai-menu")?.openHours).toBe(1);
    expect(priced.lines.find((line) => line.id === "ai-header")?.openHours).toBe(1);
    expect(priced.lines.find((line) => line.id === "ai-footer")?.openHours).toBe(1);
    expect(priced.lines.find((line) => line.id === "ai-setup")?.openHours).toBe(4);
    expect(priced.lines.find((line) => line.id === "design-templates")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "blog-list")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "design-blog-list")).toBeUndefined();
    expect(priced.selection.tiles["blog-setups"]).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "forms")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "setup")?.openHours).toBe(12);
    expect(priced.lines.find((line) => line.id === "launch")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "blog-recent")).toBeUndefined();
    expect(priced.selection.tiles["ai-design"]).toBe(2);
    expect(priced.selection.tiles["ai-feedback"]).toBe(1);
    expect(priced.selection.tiles["design-feedback"]).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "ai-feedback")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "ai-templates")?.openHours).toBe(3);
    expect(priced.selection.tiles["custom-design"]).toBeUndefined();
  });

  test("page count does not add build hours", () => {
    const priced = quote(setWebsitePages(essential(), 31));
    expect(priced.hours).toBe(78);
    expect(priced.edition).toBe("professional");
    expect(priced.editionReasons).toContain("30+ website pages need Content Hub Professional");
    expect(priced.usualEditionWarning).toContain("Essential is usually Content Hub Starter");
  });

  test("AI design and custom design cannot both be on", () => {
    const custom = quote(setTile(essential(), "custom-design", true));
    expect(custom.selection.tiles["custom-design"]).toBe(1);
    expect(custom.selection.tiles["design-feedback"]).toBe(2);
    expect(custom.selection.tiles["ai-design"]).toBeUndefined();
    expect(custom.selection.tiles["ai-feedback"]).toBeUndefined();
    expect(custom.designHours).toBe(41);
    expect(custom.lines.find((line) => line.id === "design-templates")?.openHours).toBe(6);
    const back = quote(setTile(custom.selection, "ai-design", true));
    expect(back.selection.tiles["ai-design"]).toBe(2);
    expect(back.selection.tiles["custom-design"]).toBeUndefined();
    expect(back.designHours).toBe(18);
  });
});

describe("package from options", () => {
  test("four templates stay Essential and five move to Growth", () => {
    expect(quote(setQuantity(essential(), "templates", 3)).shape).toBe("essential");
    expect(quote(setQuantity(essential(), "templates", 4)).shape).toBe("essential");
    const five = quote(setQuantity(essential(), "templates", 5));
    expect(five.shape).toBe("growth");
    expect(five.lines.find((line) => line.id === "templates")?.openHours).toBe(10);
    expect(five.lines.find((line) => line.id === "ai-templates")?.openHours).toBe(5);
  });

  test("ten sections stay Essential and eleven move to Growth", () => {
    expect(quote(setQuantity(essential(), "sections", 10)).shape).toBe("essential");
    expect(quote(setQuantity(essential(), "sections", 11)).shape).toBe("growth");
  });

  test("an advanced menu or search needs Growth", () => {
    expect(quote(essential()).lines.find((line) => line.id === "menu")?.openHours).toBe(3);
    expect(
      quote(setQuantity(essential(), "menu", 2)).lines.find((line) => line.id === "menu")
        ?.openHours,
    ).toBe(12);
    expect(quote(setQuantity(essential(), "menu", 2)).shape).toBe("growth");
    expect(quote(setTile(essential(), "search", true)).shape).toBe("essential");
    expect(quote(setQuantity(setTile(essential(), "search", true), "search", 2)).shape).toBe(
      "growth",
    );
    const recent = quote(setTile(setTile(essential(), "blog-setups", true), "blog-recent", true));
    expect(recent.shape).toBe("essential");
    expect(recent.lines.find((line) => line.id === "blog-recent")?.openHours).toBe(4);
    expect(recent.lines.find((line) => line.id === "ai-recent")?.openHours).toBe(1);
    const advancedMenu = quote(setQuantity(essential(), "menu", 2));
    expect(advancedMenu.lines.find((line) => line.id === "ai-menu")?.openHours).toBe(1);
    const search = quote(setTile(essential(), "search", true));
    expect(search.lines.find((line) => line.id === "ai-search")?.openHours).toBe(1);
    const advancedSearch = quote(setQuantity(search.selection, "search", 2));
    expect(advancedSearch.lines.find((line) => line.id === "ai-search")?.openHours).toBe(1);
  });

  test("always-on items cannot be removed", () => {
    const priced = quote(setTile(essential(), "header", false));
    expect(priced.selection.tiles.header).toBe(1);
    expect(priced.shape).toBe("essential");
    const custom = quote(setTile(essential(), "system", true));
    expect(custom.selection.tiles.system).toBe(1);
    expect(custom.lines.find((line) => line.id === "system")?.openHours).toBe(6);
    expect(custom.lines.find((line) => line.id === "ai-system")?.openHours).toBe(1);
    expect(custom.implementationHours).toBe(66);
    expect(custom.designHours).toBe(19);
    const setup = quote(setTile(essential(), "setup", false));
    expect(setup.selection.tiles.setup).toBe(1);
    expect(setup.lines.find((line) => line.id === "setup")?.openHours).toBe(12);
  });

  test("custom forms or HubDB move to Growth", () => {
    const forms = quote(setTile(essential(), "custom-forms", true));
    expect(forms.shape).toBe("growth");
    expect(forms.lines.find((line) => line.id === "custom-forms")?.openHours).toBe(5);
    expect(forms.lines.find((line) => line.id === "ai-custom-forms")?.openHours).toBe(1);
    expect(forms.selection.tiles["custom-forms"]).toBe(1);
    const hubdb = quote(setTile(essential(), "hubdb", true));
    expect(hubdb.shape).toBe("growth");
    expect(hubdb.lines.find((line) => line.id === "hubdb")?.openHours).toBe(10);
    expect(hubdb.lines.find((line) => line.id === "ai-hubdb")?.openHours).toBe(1);
  });

  test("a product catalogue needs Platform", () => {
    const catalogue = quote(setTile(essential(), "product-catalogue", true));
    expect(catalogue.shape).toBe("platform");
    expect(catalogue.selection.tiles.hubdb).toBeUndefined();
    expect(catalogue.selection.tiles["product-catalogue"]).toBe(2);
    expect(catalogue.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(18);
    expect(catalogue.lines.find((line) => line.id === "ai-catalogue")?.openHours).toBe(4);
    const moduleBased = quote(setQuantity(catalogue.selection, "product-catalogue", 1));
    expect(moduleBased.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(22);
    expect(moduleBased.lines.find((line) => line.id === "ai-catalogue")?.openHours).toBe(6);
    const filtered = quote(setQuantity(catalogue.selection, "product-catalogue", 3));
    expect(filtered.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(28);
    expect(filtered.lines.find((line) => line.id === "ai-catalogue")?.openHours).toBe(6);
    const multi = quote(setQuantity(catalogue.selection, "product-catalogue", 4));
    expect(multi.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(40);
    expect(multi.lines.find((line) => line.id === "ai-catalogue")?.openHours).toBe(10);

    const favorites = quote(
      setQuantity(setTile(catalogue.selection, "favorite-products", true), "favorite-products", 2),
    );
    expect(favorites.lines.find((line) => line.id === "favorite-products")?.openHours).toBe(12);
    expect(favorites.lines.find((line) => line.id === "ai-favorites")?.openHours).toBe(2);
    expect(
      quote(setTile(essential(), "favorite-products", true)).selection.tiles["favorite-products"],
    ).toBeUndefined();

    const related = quote(setTile(catalogue.selection, "related-products", true));
    expect(related.lines.find((line) => line.id === "related-products")?.openHours).toBe(6);
    expect(related.lines.find((line) => line.id === "ai-related")?.openHours).toBe(1);
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
  test("the second language is 14h and needs Growth", () => {
    const two = quote(setQuantity(essential(), "languages", 2));
    const three = quote(setQuantity(essential(), "languages", 3));
    expect(two.shape).toBe("growth");
    expect(two.lines.find((line) => line.id === "languages")?.openHours).toBe(14);
    expect(three.lines.find((line) => line.id === "languages")?.openHours).toBe(20);
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
    expect(advanced.lines.find((line) => line.id === "ai-blog-list")?.openHours).toBe(2);
    const twoLists = quote(setQuantity(advanced.selection, "blog-list-count", 2));
    expect(twoLists.lines.find((line) => line.id === "blog-list")?.openHours).toBe(16);
    expect(twoLists.lines.find((line) => line.id === "ai-blog-list")?.openHours).toBe(4);
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
    expect(priced.implementationHours).toBe(60);
  });

  test("content hours stay out of the build", () => {
    const content = quote(
      setQuantity(setTile(essential(), "content-hours", true), "content-hours", 10),
    );
    expect(content.shape).toBe("essential");
    expect(content.designHours).toBe(18);
    expect(content.implementationHours).toBe(60);
    expect(content.contentHours).toBe(10);
    expect(content.hours).toBe(88);
  });

  test("a planned tile cannot be added", () => {
    const priced = quote(setTile(essential(), "membership", true));
    expect(priced.selection.tiles.membership).toBeUndefined();
    expect(priced.hours).toBe(78);
    const three = quote(setQuantity(essential(), "ai-design", 3));
    expect(three.lines.find((line) => line.id === "ai-templates")?.openHours).toBe(4.5);
    expect(three.designHours).toBe(27);
    const aiFeedback = quote(setQuantity(essential(), "ai-feedback", 2));
    expect(aiFeedback.lines.find((line) => line.id === "ai-feedback")?.openHours).toBe(3);
    expect(aiFeedback.designHours).toBe(21);
    const customOn = quote(setTile(essential(), "custom-design", true));
    const customFeedback = quote(setQuantity(customOn.selection, "design-feedback", 3));
    expect(customFeedback.selection.tiles["ai-design"]).toBeUndefined();
    expect(customFeedback.lines.find((line) => line.id === "design-feedback")?.openHours).toBe(6);
    expect(customFeedback.designHours).toBe(47);
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
