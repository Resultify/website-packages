/* How estimates are priced, with the frozen files in test/fixtures (see fixture.ts). */
import { describe, expect, test } from "bun:test";
import { getTile, packageName } from "../src/catalog.ts";
import { hoursText } from "../src/controls.ts";
import {
  aiVariantCost,
  decodeSelection,
  encodeSelection,
  packageRules,
  type Quote,
  quote,
  selectionForShape,
  setQuantity,
  setTile,
  setWebsitePages,
  stepHours,
} from "../src/quote.ts";
import { useFixture } from "./fixture.ts";

useFixture();

/* The starting estimate, with the files in test/fixtures:
     build    60h  page templates 6, sections 32, menu 3, header 3, footer 4, setup and launch 12
     design   41h  Nimbly
     project  23h  kick-off 3, training 4 (2 sessions), and project management: 15% of the
                   101h of design and build (not of the kick-off and training), rounded up, 16h
     total   124h */

/** The starting estimate: Nimbly design. */
const essential = () => selectionForShape("essential");
/** The starting estimate with AI generated design. */
const ai = () => setTile(essential(), "ai-design", true);
const lineOf = (priced: Quote, id: string) => priced.lines.find((line) => line.id === id);
/** The items' build hours, the kick-off and training with them: Build and Project without project
    management. */
const itemsBuild = (priced: Quote) =>
  priced.implementationHours +
  priced.projectHours -
  (lineOf(priced, "project-management")?.openHours ?? 0);

describe("Essential", () => {
  test("starts at 124h with Nimbly design, one feedback round, kick-off, training and project management", () => {
    const priced = quote(essential());

    expect(priced.label).toBe(packageName.essential);
    expect(priced.shape).toBe("essential");
    expect(priced.foundationHours).toBe(0);
    expect(priced.lines.find((line) => line.id === "foundation")).toBeUndefined();
    expect(priced.selection.websitePages).toBe(25);
    expect(priced.designHours).toBe(41);
    expect(itemsBuild(priced)).toBe(67);
    /* Kick-off, training and project management are Project, not Build */
    expect(priced.implementationHours).toBe(60);
    expect(priced.projectHours).toBe(3 + 4 + 16);
    expect(priced.contentHours).toBe(0);
    expect(priced.hours).toBe(124);
    expect(lineOf(priced, "kickoff")).toMatchObject({ openHours: 3, bucket: "project" });
    expect(lineOf(priced, "training")).toMatchObject({ qty: 2, openHours: 4, bucket: "project" });
    expect(lineOf(priced, "project-management")).toMatchObject({
      mode: "15% of 101h",
      openHours: 16,
      bucket: "project",
    });
    /* Kick-off, training and project management have no design hours */
    for (const id of ["kickoff", "training", "project-management"]) {
      expect(lineOf(priced, `nimbly-${id}`)).toBeUndefined();
    }
    expect(priced.selection.tiles.system).toBeUndefined();
    expect(priced.savedHours).toBe(0);
    expect(priced.edition).toBe("starter");
    expect(priced.lines.find((line) => line.id === "templates")?.openHours).toBe(6);
    expect(priced.lines.find((line) => line.id === "sections")?.openHours).toBe(32);
    expect(priced.lines.find((line) => line.id === "menu")?.openHours).toBe(3);
    expect(priced.lines.find((line) => line.id === "nimbly-sections")?.openHours).toBe(24);
    expect(priced.lines.find((line) => line.id === "nimbly-menu")?.openHours).toBe(2);
    expect(priced.lines.find((line) => line.id === "nimbly-header")?.openHours).toBe(2);
    expect(priced.lines.find((line) => line.id === "nimbly-footer")?.openHours).toBe(3);
    expect(priced.lines.find((line) => line.id === "nimbly-setup")?.openHours).toBe(4);
    expect(priced.lines.find((line) => line.id === "custom-templates")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "blog-list")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "nimbly-blog-list")).toBeUndefined();
    expect(priced.selection.tiles["blog-setups"]).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "forms")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "setup")?.openHours).toBe(12);
    expect(priced.lines.find((line) => line.id === "launch")).toBeUndefined();
    expect(priced.lines.find((line) => line.id === "blog-recent")).toBeUndefined();
    expect(priced.selection.tiles["nimbly-design"]).toBe(1);
    expect(priced.selection.tiles["nimbly-feedback"]).toBe(1);
    /* Its round is a line with no hours, so the hours say it is included */
    expect(priced.lines.find((line) => line.id === "nimbly-feedback")).toMatchObject({
      qty: 1,
      included: 1,
      openHours: 0,
    });
    expect(priced.lines.find((line) => line.id === "nimbly-templates")?.openHours).toBe(6);
    for (const id of ["ai-design", "ai-feedback", "custom-design", "custom-feedback"]) {
      expect(priced.selection.tiles[id]).toBeUndefined();
    }
  });

  test("page count does not add build hours", () => {
    const priced = quote(setWebsitePages(essential(), 31));
    expect(priced.hours).toBe(124);
    expect(priced.edition).toBe("professional");
    expect(priced.editionReasons).toContain("30+ website pages need Content Hub Professional");
    expect(priced.usualEditionWarning).toContain("Essential is usually Content Hub Starter");
  });

  test("one design, always: AI generated, Nimbly, Custom or None, each with its feedback rounds", () => {
    const custom = quote(setTile(essential(), "custom-design", true));
    expect(custom.selection.tiles["custom-design"]).toBe(1);
    expect(custom.selection.tiles["custom-feedback"]).toBe(1);
    expect(custom.selection.tiles["nimbly-design"]).toBeUndefined();
    expect(custom.selection.tiles["nimbly-feedback"]).toBeUndefined();
    expect(custom.designHours).toBe(41);
    expect(custom.lines.find((line) => line.id === "custom-templates")?.openHours).toBe(6);
    /* In these files Nimbly has Custom's hours; project management is 15% with every design, and
       Custom needs Growth */
    expect(custom.designHours).toBe(quote(essential()).designHours);
    expect(itemsBuild(custom)).toBe(67);
    expect(lineOf(custom, "project-management")?.openHours).toBe(16);
    expect(custom.hours).toBe(41 + 67 + 16);
    expect(custom.shape).toBe("growth");
    expect(custom.packageReasons).toEqual(["Custom design → Growth"]);
    const generated = quote(setTile(custom.selection, "ai-design", true));
    expect(generated.selection.tiles["ai-design"]).toBe(2);
    expect(generated.selection.tiles["ai-feedback"]).toBe(1);
    expect(generated.selection.tiles["custom-design"]).toBeUndefined();
    expect(generated.selection.tiles["custom-feedback"]).toBeUndefined();
    expect(generated.designHours).toBe(18);
    /* Sections build at 5h each with AI design; 15% of 18h + 68h, 12.9, so 13h */
    expect(itemsBuild(generated)).toBe(75);
    expect(lineOf(generated, "project-management")?.openHours).toBe(13);
    expect(generated.hours).toBe(18 + 75 + 13);
    expect(generated.shape).toBe("essential");
    expect(generated.lines.find((line) => line.id === "ai-templates")?.openHours).toBe(3);
    const back = quote(setTile(generated.selection, "nimbly-design", true));
    expect(back.selection.tiles["nimbly-design"]).toBe(1);
    expect(back.selection.tiles["nimbly-feedback"]).toBe(1);
    expect(back.selection.tiles["ai-design"]).toBeUndefined();
    expect(back.selection.tiles["ai-feedback"]).toBeUndefined();
    expect(back.hours).toBe(124);
    /* None: no design hours, Custom's build hours, and Growth */
    const none = quote(setTile(essential(), "no-design", true));
    expect(none.selection.tiles["no-design"]).toBe(1);
    expect(none.selection.tiles["nimbly-design"]).toBeUndefined();
    expect(none.selection.tiles["nimbly-feedback"]).toBeUndefined();
    expect(none.designHours).toBe(0);
    expect(itemsBuild(none)).toBe(itemsBuild(custom));
    /* 15% of 60h is 9h */
    expect(lineOf(none, "project-management")?.openHours).toBe(9);
    expect(none.shape).toBe("growth");
    expect(none.packageReasons).toEqual(["No design → Growth"]);
    /* Taking the design out gives the starting one back */
    const out = quote(setTile(generated.selection, "ai-design", false));
    expect(out.selection.tiles["nimbly-design"]).toBe(1);
    expect(out.selection.tiles["ai-design"]).toBeUndefined();
    /* A link with two designs keeps the first of the list */
    const both = quote({
      ...essential(),
      tiles: { ...essential().tiles, "ai-design": 2, "ai-feedback": 1 },
    });
    expect(both.selection.tiles["ai-design"]).toBe(2);
    expect(both.selection.tiles["nimbly-design"]).toBeUndefined();
    expect(both.selection.tiles["nimbly-feedback"]).toBeUndefined();
  });
});

describe("package from options", () => {
  test("four templates stay Essential and five move to Growth", () => {
    expect(quote(setQuantity(essential(), "templates", 3)).shape).toBe("essential");
    expect(quote(setQuantity(essential(), "templates", 4)).shape).toBe("essential");
    const five = quote(setQuantity(essential(), "templates", 5));
    expect(five.shape).toBe("growth");
    expect(five.lines.find((line) => line.id === "templates")?.openHours).toBe(10);
    expect(five.lines.find((line) => line.id === "nimbly-templates")?.openHours).toBe(10);
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
    expect(recent.lines.find((line) => line.id === "nimbly-blog-recent")?.openHours).toBe(3);
    const advancedMenu = quote(setQuantity(essential(), "menu", 2));
    expect(advancedMenu.lines.find((line) => line.id === "nimbly-menu")?.openHours).toBe(8);
    const search = quote(setTile(essential(), "search", true));
    expect(search.lines.find((line) => line.id === "nimbly-search")?.openHours).toBe(3);
    const advancedSearch = quote(setQuantity(search.selection, "search", 2));
    expect(advancedSearch.lines.find((line) => line.id === "nimbly-search")?.openHours).toBe(6);
  });

  test("always-on items cannot be removed", () => {
    for (const id of ["header", "setup", "kickoff", "training"]) {
      const priced = quote(setTile(essential(), id, false));
      expect(priced.selection.tiles[id]).toBe(essential().tiles[id]);
      expect(priced.hours).toBe(124);
    }
    const custom = quote(setTile(essential(), "system", true));
    expect(custom.selection.tiles.system).toBe(1);
    expect(custom.lines.find((line) => line.id === "system")?.openHours).toBe(6);
    expect(custom.lines.find((line) => line.id === "nimbly-system")?.openHours).toBe(5);
    expect(itemsBuild(custom)).toBe(67 + 6);
    expect(custom.designHours).toBe(41 + 5);
    const setup = quote(setTile(essential(), "setup", false));
    expect(setup.selection.tiles.setup).toBe(1);
    expect(setup.lines.find((line) => line.id === "setup")?.openHours).toBe(12);
  });

  test("custom forms or HubDB move to Growth", () => {
    const forms = quote(setTile(essential(), "custom-forms", true));
    expect(forms.shape).toBe("growth");
    expect(forms.lines.find((line) => line.id === "custom-forms")?.openHours).toBe(5);
    expect(forms.lines.find((line) => line.id === "nimbly-custom-forms")?.openHours).toBe(4);
    expect(forms.selection.tiles["custom-forms"]).toBe(1);
    const hubdb = quote(setTile(essential(), "hubdb", true));
    expect(hubdb.shape).toBe("growth");
    expect(hubdb.lines.find((line) => line.id === "hubdb")?.openHours).toBe(10);
    expect(hubdb.lines.find((line) => line.id === "nimbly-hubdb")?.openHours).toBe(3);
  });

  test("a product catalogue needs Platform", () => {
    const catalogue = quote(setTile(essential(), "product-catalogue", true));
    expect(catalogue.shape).toBe("platform");
    expect(catalogue.selection.tiles.hubdb).toBeUndefined();
    expect(catalogue.selection.tiles["product-catalogue"]).toBe(2);
    expect(catalogue.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(18);
    expect(catalogue.lines.find((line) => line.id === "nimbly-product-catalogue")?.openHours).toBe(
      10,
    );
    const moduleBased = quote(setQuantity(catalogue.selection, "product-catalogue", 1));
    expect(moduleBased.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(22);
    expect(
      moduleBased.lines.find((line) => line.id === "nimbly-product-catalogue")?.openHours,
    ).toBe(16);
    const filtered = quote(setQuantity(catalogue.selection, "product-catalogue", 3));
    expect(filtered.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(28);
    expect(filtered.lines.find((line) => line.id === "nimbly-product-catalogue")?.openHours).toBe(
      18,
    );
    const multi = quote(setQuantity(catalogue.selection, "product-catalogue", 4));
    expect(multi.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(40);
    expect(multi.lines.find((line) => line.id === "nimbly-product-catalogue")?.openHours).toBe(28);

    const favorites = quote(
      setQuantity(setTile(catalogue.selection, "favorite-products", true), "favorite-products", 2),
    );
    expect(favorites.lines.find((line) => line.id === "favorite-products")?.openHours).toBe(12);
    expect(favorites.lines.find((line) => line.id === "nimbly-favorite-products")?.openHours).toBe(
      6,
    );
    expect(
      quote(setTile(essential(), "favorite-products", true)).selection.tiles["favorite-products"],
    ).toBeUndefined();

    const related = quote(setTile(catalogue.selection, "related-products", true));
    expect(related.lines.find((line) => line.id === "related-products")?.openHours).toBe(6);
    expect(related.lines.find((line) => line.id === "nimbly-related-products")?.openHours).toBe(3);
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

  test("one blog includes one simple list and post, shared by every blog, and a second blog needs Growth", () => {
    const priced = quote(setQuantity(essential(), "blog-setups", 2));
    expect(priced.shape).toBe("growth");
    expect(priced.edition).toBe("professional");
    expect(priced.lines.find((line) => line.id === "blog-setups")?.openHours).toBe(0);
    expect(priced.lines.find((line) => line.id === "blog-list")?.openHours).toBe(4);

    const advanced = quote(setQuantity(priced.selection, "blog-list", 2));
    expect(advanced.lines.find((line) => line.id === "blog-list")?.openHours).toBe(8);
    expect(advanced.lines.find((line) => line.id === "nimbly-blog-list")?.openHours).toBe(6);
    /* The templates are shared: more blogs add no template hours */
    const many = quote(setQuantity(advanced.selection, "blog-setups", 5));
    expect(many.lines.find((line) => line.id === "blog-list")?.openHours).toBe(8);
  });

  test("with more than one blog, a list or post template can be counted, up to one for each blog, and its hours count once for each", () => {
    const three = quote(setQuantity(setTile(essential(), "blog-setups", true), "blog-setups", 3));
    /* Advanced list templates for two of the three blogs, Simple post templates for each */
    const counted = quote(
      setQuantity(
        setQuantity(setQuantity(three.selection, "blog-list", 2), "blog-list-count", 2),
        "blog-post-count",
        9,
      ),
    );
    expect(counted.selection.tiles["blog-list-count"]).toBe(2);
    expect(counted.selection.tiles["blog-post-count"]).toBe(3);
    expect(lineOf(counted, "blog-list")).toMatchObject({ openHours: 2 * 8, qty: 2 });
    expect(lineOf(counted, "nimbly-blog-list")?.openHours).toBe(2 * 6);
    expect(lineOf(counted, "blog-post")?.openHours).toBe(3 * 4);
    expect(lineOf(counted, "nimbly-blog-post")?.openHours).toBe(3 * 4);
    /* The counts are no lines of their own */
    expect(lineOf(counted, "blog-list-count")).toBeUndefined();
    expect(hoursText(counted)).toContain("  - List template · Advanced · 2 templates: 16h");
    /* A link keeps them */
    expect(decodeSelection(encodeSelection(counted.selection))).toEqual(counted.selection);
    /* Fewer blogs: never more than the blogs; one blog: shared again, and no count */
    const two = quote(setQuantity(counted.selection, "blog-setups", 2));
    expect(two.selection.tiles["blog-post-count"]).toBe(2);
    const one = quote(setQuantity(counted.selection, "blog-setups", 1));
    expect(one.selection.tiles).not.toHaveProperty("blog-list-count");
    expect(one.selection.tiles).not.toHaveProperty("blog-post-count");
    expect(lineOf(one, "blog-list")?.openHours).toBe(8);
    /* One blog: no count can be set */
    const single = quote(setTile(essential(), "blog-setups", true)).selection;
    expect(quote(setQuantity(single, "blog-list-count", 2)).selection.tiles).not.toHaveProperty(
      "blog-list-count",
    );
    /* A count of one is the shared template: no count */
    expect(
      quote(setQuantity(counted.selection, "blog-list-count", 1)).selection.tiles,
    ).not.toHaveProperty("blog-list-count");
  });

  test("with more than one blog, Recent blog posts can be counted too: one version for each blog with its own design", () => {
    const three = setQuantity(setTile(essential(), "blog-setups", true), "blog-setups", 3);
    const recent = setTile(three, "blog-recent", true);
    /* No count while it is out */
    expect(quote(setQuantity(three, "blog-recent-count", 2)).selection.tiles).not.toHaveProperty(
      "blog-recent-count",
    );
    const two = quote(setQuantity(recent, "blog-recent-count", 2));
    const one = quote(recent);
    expect(lineOf(two, "blog-recent")?.openHours).toBe(
      2 * (lineOf(one, "blog-recent")?.openHours ?? 0),
    );
    expect(lineOf(two, "nimbly-blog-recent")?.openHours).toBe(
      2 * (lineOf(one, "nimbly-blog-recent")?.openHours ?? 0),
    );
    expect(hoursText(two)).toContain("  - Recent blog posts · 2 versions: ");
    /* Out with Recent blog posts, out with its count */
    expect(quote(setTile(two.selection, "blog-recent", false)).selection.tiles).not.toHaveProperty(
      "blog-recent-count",
    );
  });

  test("turning the blog off removes its templates and recent posts", () => {
    const withRecent = setTile(setTile(essential(), "blog-setups", true), "blog-recent", true);
    const off = quote(setTile(withRecent, "blog-setups", false));
    expect(off.selection.tiles["blog-setups"]).toBeUndefined();
    expect(off.selection.tiles["blog-list"]).toBeUndefined();
    expect(off.selection.tiles["blog-post"]).toBeUndefined();
    expect(off.selection.tiles["blog-recent"]).toBeUndefined();
    expect(off.lines.find((line) => line.id === "nimbly-blog-list")).toBeUndefined();
    expect(
      quote(setTile(off.selection, "blog-recent", true)).selection.tiles["blog-recent"],
    ).toBeUndefined();
  });

  test("content hours are content, not build; project management counts them too", () => {
    const content = quote(
      setQuantity(setTile(essential(), "content-hours", true), "content-hours", 10),
    );
    expect(content.shape).toBe("essential");
    expect(content.designHours).toBe(41);
    /* 15% of 41h + 60h + 10h, 16.65, so 17h */
    expect(itemsBuild(content)).toBe(67);
    expect(lineOf(content, "project-management")?.openHours).toBe(17);
    expect(content.contentHours).toBe(10);
    expect(content.hours).toBe(41 + 67 + 17 + 10);
  });

  test("page migration and blog import are hours you enter, counted as content", () => {
    const pages = setQuantity(setTile(essential(), "migrate-pages", true), "migrate-pages", 12);
    const both = quote(setQuantity(setTile(pages, "migrate-posts", true), "migrate-posts", 5));
    expect(both.shape).toBe("essential");
    /* 15% of 41h + 60h + 17h, 17.7, so 18h */
    expect(itemsBuild(both)).toBe(67);
    expect(lineOf(both, "project-management")?.openHours).toBe(18);
    expect(both.contentHours).toBe(17);
    expect(stepHours(both, "content")).toBe(17);
    expect(both.hours).toBe(41 + 67 + 18 + 17);
  });

  test("a planned tile cannot be added", () => {
    const priced = quote(setTile(essential(), "crm-section", true));
    expect(priced.selection.tiles["crm-section"]).toBeUndefined();
    expect(priced.hours).toBe(124);
    expect(
      quote(setTile(essential(), "catalogue-objects", true)).selection.tiles["catalogue-objects"],
    ).toBeUndefined();
  });

  test("feedback rounds: one included with every design, then 3h a round with AI generated and Nimbly, 6h with Custom", () => {
    const three = quote(setQuantity(ai(), "ai-design", 3));
    expect(three.lines.find((line) => line.id === "ai-templates")?.openHours).toBe(3);
    expect(three.lines.find((line) => line.id === "ai-variants")?.openHours).toBe(9);
    expect(three.designHours).toBe(27);
    const aiFeedback = quote(setQuantity(ai(), "ai-feedback", 3));
    expect(aiFeedback.lines.find((line) => line.id === "ai-feedback")?.openHours).toBe(2 * 3);
    expect(aiFeedback.designHours).toBe(18 + 6);
    const customOn = quote(setTile(essential(), "custom-design", true));
    const customFeedback = quote(setQuantity(customOn.selection, "custom-feedback", 2));
    expect(customFeedback.selection.tiles["nimbly-design"]).toBeUndefined();
    expect(customFeedback.lines.find((line) => line.id === "custom-feedback")?.openHours).toBe(6);
    expect(customFeedback.designHours).toBe(41 + 6);
    const nimblyFeedback = quote(setQuantity(essential(), "nimbly-feedback", 3));
    expect(nimblyFeedback.lines.find((line) => line.id === "nimbly-feedback")).toMatchObject({
      qty: 3,
      included: 1,
      openHours: 2 * 3,
    });
    expect(nimblyFeedback.designHours).toBe(41 + 6);
  });

  test("project management: 15% of the design, build and content hours, not the kick-off and training, whatever the design, rounded up", () => {
    const share = (selection: ReturnType<typeof essential>) =>
      lineOf(quote(selection), "project-management");
    /* Nimbly: 41h + 60h = 101h, the kick-off and training left out; 15% is 15.15 */
    expect(share(essential())).toMatchObject({ mode: "15% of 101h", openHours: 16 });
    /* AI generated: 18h + 68h = 86h; 15% is 12.9 */
    expect(share(ai())).toMatchObject({ mode: "15% of 86h", openHours: 13 });
    /* Custom: 101h; 15% is 15.15 */
    expect(share(setTile(essential(), "custom-design", true))).toMatchObject({
      mode: "15% of 101h",
      openHours: 16,
    });
    /* None: 60h; 15% is 9 */
    expect(share(setTile(essential(), "no-design", true))).toMatchObject({
      mode: "15% of 60h",
      openHours: 9,
    });
    /* An item adds its share: system templates, 6h + 5h, make 112h, and 15% is 16.8 */
    expect(share(setTile(essential(), "system", true))?.openHours).toBe(17);
    /* A whole share stays whole: 20h is 3h at 15% */
    expect(Math.ceil(Math.round(20 * 15) / 100)).toBe(3);
    /* Extra rounds count, and so does content: 101h + 40h, and 15% of 141h is 21.15 */
    expect(share(setQuantity(essential(), "nimbly-feedback", 3))?.mode).toBe("15% of 107h");
    const content = setQuantity(setTile(essential(), "content-hours", true), "content-hours", 40);
    expect(share(content)).toMatchObject({ mode: "15% of 141h", openHours: 22 });
    /* More training adds no project management */
    expect(share(setQuantity(essential(), "training", 5))).toMatchObject({
      mode: "15% of 101h",
      openHours: 16,
    });
    /* In the site basics, with the kick-off and training */
    expect(stepHours(quote(essential()), "basics")).toBe(67 + 16);
  });

  test("training: 2 sessions of 2h to start, more at 2h each; no design hours", () => {
    const three = quote(setQuantity(essential(), "training", 3));
    expect(lineOf(three, "training")).toMatchObject({ qty: 3, openHours: 6 });
    expect(three.designHours).toBe(41);
  });

  test("Custom cookie banner: 6h of build and 4h of design", () => {
    const banner = quote(setTile(essential(), "cookie-banner", true));
    expect(lineOf(banner, "cookie-banner")?.openHours).toBe(6);
    expect(lineOf(banner, "nimbly-cookie-banner")?.openHours).toBe(4);
    expect(banner.shape).toBe("essential");
  });

  test("Custom integration: build hours and design hours entered, each in a field, kept by the link", () => {
    const on = setTile(essential(), "custom-integration", true);
    expect(on.tiles).toMatchObject({ "custom-integration": 0, "custom-integration-design": 0 });
    const entered = setQuantity(
      setQuantity(on, "custom-integration", 12),
      "custom-integration-design",
      5,
    );
    const priced = quote(entered);
    expect(lineOf(priced, "custom-integration")).toMatchObject({
      openHours: 12,
      bucket: "implementation",
    });
    expect(lineOf(priced, "custom-integration-design")).toMatchObject({
      item: "custom-integration",
      openHours: 5,
      bucket: "design",
    });
    expect(priced.designHours).toBe(41 + 5);
    expect(decodeSelection(encodeSelection(priced.selection))).toEqual(priced.selection);
    /* Its design hours are entered, so they count whatever the design */
    expect(quote(setTile(entered, "no-design", true)).designHours).toBe(5);
    /* They go with it: without it, a link or a quantity cannot keep them */
    const off = quote(setTile(entered, "custom-integration", false)).selection.tiles;
    expect(off["custom-integration-design"]).toBeUndefined();
    expect(
      quote(setQuantity(essential(), "custom-integration-design", 5)).selection.tiles[
        "custom-integration-design"
      ],
    ).toBeUndefined();
  });
});

describe("links", () => {
  test("a link round-trips the selection", () => {
    const selected = selectionForShape("platform", 40);
    expect(decodeSelection(`#${encodeSelection(selected)}`)).toEqual(selected);
    expect(decodeSelection("")).toBeNull();
    /* The address the app wrote before short links is not read any more */
    expect(decodeSelection("#s=cms-react&w=25&b=same&t=templates.3")).toBeNull();
  });
});

describe("package explanations", () => {
  const atRule = (tileId: string, at: number) => {
    if (tileId === "favorite-products" || tileId === "related-products") {
      const catalogue = setQuantity(
        setTile(essential(), "product-catalogue", true),
        "product-catalogue",
        2,
      );
      return setQuantity(setTile(catalogue, tileId, true), tileId, at);
    }
    if (tileId === "blog-list" || tileId === "blog-post") {
      return setQuantity(setTile(essential(), "blog-setups", true), tileId, at);
    }
    return setQuantity(setTile(essential(), tileId, true), tileId, at);
  };

  test("Essential has no reasons", () => {
    expect(quote(essential()).packageReasons).toEqual([]);
  });

  /* What is coming soon cannot be chosen, so its rules move nothing yet */
  const choosable = packageRules.filter((rule) => {
    const tile = getTile(rule.tileId);
    return !tile.disabled && !(rule.exact && tile.modes?.[rule.at - 1]?.disabled);
  });
  test("the rules of what is coming soon are left out", () => {
    expect(choosable.length).toBeGreaterThan(10);
    expect(packageRules.some((rule) => rule.tileId === "catalogue-crm")).toBe(true);
    expect(choosable.some((rule) => rule.tileId === "catalogue-crm")).toBe(false);
  });

  for (const rule of choosable) {
    test(`${rule.tileId} at ${rule.at} gives its reason`, () => {
      const priced = quote(atRule(rule.tileId, rule.at));
      expect(priced.shape).toBe(rule.package);
      expect(priced.packageReasons.some((line) => line.startsWith(rule.reason(rule.at)))).toBe(
        true,
      );
    });
  }

  test("only the reasons for the winning package are listed", () => {
    const both = setTile(setQuantity(essential(), "templates", 6), "product-catalogue", true);
    expect(quote(both).packageReasons).toEqual(["Product catalogue (HubDB) → Platform"]);
  });
});

describe("memberships", () => {
  const members = () => setTile(essential(), "membership", true);

  test("come with Invitation and one access group, and need Professional; 3 access groups need Enterprise", () => {
    const priced = quote(members());
    expect(priced.selection.tiles.membership).toBe(1);
    expect(priced.selection.tiles["membership-groups"]).toBe(1);
    expect(lineOf(priced, "membership")?.mode).toBe("Invitation");
    expect(lineOf(priced, "membership")?.openHours).toBe(8);
    expect(lineOf(priced, "nimbly-membership")?.openHours).toBe(2);
    expect(lineOf(priced, "membership-groups")?.openHours).toBe(2);
    expect(priced.edition).toBe("professional");
    expect(priced.editionReasons).toContain("Memberships needs Content Hub Professional");
    const two = quote(setQuantity(members(), "membership-groups", 2));
    expect([lineOf(two, "membership-groups")?.openHours, two.edition]).toEqual([4, "professional"]);
    const three = quote(setQuantity(members(), "membership-groups", 3));
    expect(three.edition).toBe("enterprise");
    expect(three.editionReasons).toContain("3 access groups need Content Hub Enterprise");
    /* The access groups go only with Memberships */
    expect(quote(setTile(members(), "membership-groups", false)).selection.tiles).toHaveProperty(
      "membership-groups",
    );
    expect(quote(setQuantity(members(), "membership-groups", 0)).selection.tiles).toHaveProperty(
      "membership-groups",
    );
  });

  test("each way to sign in has its own hours: SSO has no design hours, the identity provider has the pages", () => {
    const self = quote(setQuantity(members(), "membership", 2));
    expect([lineOf(self, "membership")?.mode, lineOf(self, "membership")?.openHours]).toEqual([
      "Self-registration",
      12,
    ]);
    expect(lineOf(self, "nimbly-membership")?.openHours).toBe(3);
    const sso = quote(setQuantity(members(), "membership", 3));
    expect([lineOf(sso, "membership")?.mode, lineOf(sso, "membership")?.openHours]).toEqual([
      "SSO",
      16,
    ]);
    expect(lineOf(sso, "nimbly-membership")).toBeUndefined();
  });

  test("Social sign-in needs Enterprise, goes with Memberships, and not with SSO", () => {
    const social = quote(setTile(members(), "membership-social", true));
    expect(lineOf(social, "membership-social")?.openHours).toBe(4);
    expect(lineOf(social, "nimbly-membership-social")?.openHours).toBe(1);
    expect(social.edition).toBe("enterprise");
    const sso = quote(setQuantity(social.selection, "membership", 3));
    expect(sso.selection.tiles).not.toHaveProperty("membership-social");
    expect(
      quote(setTile(sso.selection, "membership-social", true)).selection.tiles,
    ).not.toHaveProperty("membership-social");
    expect(
      quote(setTile(essential(), "membership-social", true)).selection.tiles,
    ).not.toHaveProperty("membership-social");
  });

  test("Member area takes build and design hours entered; taking Memberships out takes every part", () => {
    const area = setQuantity(
      setQuantity(setTile(members(), "membership-area", true), "membership-area", 20),
      "membership-area-design",
      6,
    );
    const priced = quote(area);
    expect(lineOf(priced, "membership-area")?.openHours).toBe(20);
    expect(lineOf(priced, "membership-area")?.bucket).toBe("implementation");
    expect(lineOf(priced, "membership-area-design")?.openHours).toBe(6);
    expect(lineOf(priced, "membership-area-design")?.bucket).toBe("design");
    expect(decodeSelection(encodeSelection(priced.selection))).toEqual(priced.selection);
    const out = quote(setTile(area, "membership", false)).selection.tiles;
    expect(Object.keys(out).filter((id) => id.startsWith("membership"))).toEqual([]);
  });
});

describe("custom catalogue hours", () => {
  const custom = () =>
    setQuantity(setTile(essential(), "product-catalogue", true), "product-catalogue", 5);

  test("the entered hours are the catalogue's build hours, with no design hours", () => {
    const priced = quote(setQuantity(custom(), "catalogue-custom", 25));
    expect(priced.lines.find((line) => line.id === "product-catalogue")?.openHours).toBe(0);
    expect(priced.lines.find((line) => line.id === "catalogue-custom")?.openHours).toBe(25);
    expect(priced.lines.find((line) => line.id === "nimbly-product-catalogue")).toBeUndefined();
    expect(priced.shape).toBe("platform");
  });

  test("leaving Custom drops the entered hours", () => {
    const entered = setQuantity(custom(), "catalogue-custom", 25);
    expect(
      quote(setQuantity(entered, "product-catalogue", 2)).selection.tiles["catalogue-custom"],
    ).toBeUndefined();
    expect(
      quote(setTile(entered, "product-catalogue", false)).selection.tiles["catalogue-custom"],
    ).toBeUndefined();
  });

  test("a share link keeps the entered hours", () => {
    const entered = quote(setQuantity(custom(), "catalogue-custom", 25));
    const decoded = decodeSelection(`#${encodeSelection(entered.selection)}`);
    if (!decoded) throw new Error("Could not decode");
    expect(quote(decoded).hours).toBe(entered.hours);
  });
});

describe("extra AI variants", () => {
  test("two variants are included: their line has no hours", () => {
    const priced = quote(ai());
    expect(priced.lines.find((line) => line.id === "ai-variants")).toMatchObject({
      qty: 2,
      included: 2,
      openHours: 0,
    });
    expect(aiVariantCost(priced)).toBe(9);
  });

  test("each extra variant adds half the base design, rounded up", () => {
    const base = setTile(ai(), "hubdb", true);
    expect(quote(base).designHours).toBe(19);
    const three = quote(setQuantity(base, "ai-design", 3));
    expect(three.lines.find((line) => line.id === "ai-variants")?.openHours).toBe(10);
    expect(three.designHours).toBe(29);
    const five = quote(setQuantity(base, "ai-design", 5));
    expect(five.lines.find((line) => line.id === "ai-variants")?.openHours).toBe(30);
    expect(five.designHours).toBe(49);
    expect(aiVariantCost(five)).toBe(10);
  });

  test("hours stay whole and add up for every variant count", () => {
    for (const id of ["hubdb", "search", "blog-setups", "product-catalogue"]) {
      for (let variants = 2; variants <= 10; variants += 1) {
        const priced = quote(setQuantity(setTile(ai(), id, true), "ai-design", variants));
        expect(Number.isInteger(priced.hours)).toBe(true);
        expect(Number.isInteger(priced.designHours)).toBe(true);
        for (const line of priced.lines) expect(Number.isInteger(line.openHours)).toBe(true);
        expect(priced.hours).toBe(
          priced.designHours +
            priced.implementationHours +
            priced.contentHours +
            priced.projectHours,
        );
      }
    }
  });
});

describe("step hours", () => {
  test("steps add up to the total", () => {
    const priced = quote({
      startingPoint: "cms-react",
      websitePages: 40,
      tiles: {
        "ai-design": 3,
        "ai-feedback": 2,
        "blog-recent": 1,
        "blog-setups": 2,
        "blog-list": 2,
        "blog-post": 1,
        "favorite-products": 2,
        footer: 1,
        header: 1,
        hubdb: 2,
        "landing-templates": 3,
        languages: 3,
        menu: 2,
        "product-catalogue": 3,
        "related-products": 1,
        search: 2,
        sections: 14,
        setup: 1,
        system: 1,
        "custom-forms": 1,
        templates: 6,
        "content-hours": 25,
      },
    });
    const steps = ["design", "basics", "addons", "languages", "content"] as const;
    const sum = steps.reduce((total, step) => total + stepHours(priced, step), 0);
    expect(sum).toBeCloseTo(priced.hours);
    expect(stepHours(priced, "languages")).toBe(20);
    expect(stepHours(priced, "content")).toBe(25);
  });
});
