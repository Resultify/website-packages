/* The page in a browser. Each test names the behaviour it guards, at the sizes that matter most
   (1440 and 1280, and wider). Expected hours come from the app's own logic, run here in Node. */
import { expect, type Page, test } from "@playwright/test";
import { appName, currentRelease, releases } from "../src/changelog.ts";
import {
  buildCatalog,
  clientDesignPercent,
  designChoices,
  getTile,
  getTile as getTileLive,
  managementPercent,
  tierMark,
  withCatalog,
} from "../src/catalog.ts";
import {
  blockedShelfIds,
  hoursLabel,
  hoursSummary,
  hoursText,
  laneIds,
  shelfGroupOf,
  shelfGroupOf as shelfGroupOfLive,
  shelfLanes,
} from "../src/controls.ts";
import {
  decodeSelection,
  encodeSelection,
  formatHours,
  type Quote,
  quote,
  selectionForShape,
  setQuantity,
  sourceIn,
  stepHours,
} from "../src/quote.ts";
import { parseTable, serializeTable } from "../src/table.ts";
import { codes, fixtureCatalog, fixtureText, rows, rules } from "../test/fixture.ts";

/* The example: Search, Custom forms and Blog in, AI design, Growth on Content Hub Starter */
const EXAMPLE = "#SFMRoK0fw";
const LAPTOP = { width: 1280, height: 800 };

async function open(page: Page, hash = EXAMPLE) {
  await page.goto(`/${hash}`, { waitUntil: "domcontentloaded" });
  /* The page waits for its web fonts; give a slow first load time */
  await expect(page.locator(".feat").first()).toBeVisible({ timeout: 15000 });
}
/* Items slide when they move; measure only once they have arrived */
async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => a.playState !== "running") &&
      !document.querySelector(".ghost"),
  );
}
async function addFromShelf(page: Page, id: string) {
  await page.locator(`.shelf .pill[data-id="${id}"]`).click();
  await expect(page.locator(`.feat[data-key="${id}"]`)).toBeVisible();
  await settle(page);
}
/** The page with the frozen files of test/fixtures, in a preview: for what the files in src/ may
    not have at the moment, such as items coming soon. */
async function openFrozen(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    "website-packages.preview",
    JSON.stringify({ ...fixtureText, code: "" }),
  ] as const);
  await page.goto("/?preview", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".shelf .s-row").first()).toBeVisible({ timeout: 15000 });
}
/** Something worked out with the frozen files. */
const frozen = <T>(run: () => T): T => withCatalog(fixtureCatalog, run);
/** The app's own quote for a page: the page keeps its selection in the address. */
function quoteOf(hash: string): Quote {
  const selection = decodeSelection(hash);
  if (!selection) throw new Error(`No selection in ${hash}`);
  return quote(selection);
}
const shown = (page: Page) =>
  page.evaluate(() => ({
    hash: location.hash,
    total: document.querySelector(".big")?.firstChild?.textContent,
    legend: [...document.querySelectorAll(".lg b")].map((b) => b.textContent),
    head: [...document.querySelectorAll(".est .sh .hrs.sum > span")].map(
      (s) => s.lastChild?.textContent,
    ),
  }));

test("the total, its parts and the estimate's figures come from the app's own quote", async ({
  page,
}) => {
  await open(page);
  for (const step of [
    async () => {},
    () => addFromShelf(page, "product-catalogue"),
    () => page.locator('[data-action="inc"][data-id="blog-setups"]').click(),
    () => page.locator("#design-custom-design").check(),
  ]) {
    await step();
    const s = await shown(page);
    const q = quoteOf(s.hash);
    expect(s.total).toBe(formatHours(q.hours));
    expect(s.legend).toEqual(
      [q.designHours, q.implementationHours, q.contentHours, q.projectHours].map(hoursLabel),
    );
    /* Content first, Build last */
    expect(s.head[0]).toBe(hoursLabel(stepHours(q, "content")));
    expect(s.head.at(-1)).toBe(hoursLabel(stepHours(q, "addons", "implementation")));
  }
});

test("Design offers AI generated, Nimbly, Custom and None, Nimbly first, each with its note, its feedback rounds and the package it needs", async ({
  page,
}) => {
  /* The starting estimate: nothing on it yet but the basics */
  await page.goto(`/#${encodeSelection(selectionForShape("essential"))}`);
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  const choices = page.locator(".dsel .choice");
  await expect(choices).toHaveText(["AI generated", "Nimbly", "Custom", "None"]);
  await expect(choices.filter({ hasText: "Nimbly" })).toHaveClass(/is-on/);
  const note = page.locator(".dsel small");
  const feedback = page.locator('[data-action="inc"][data-id$="-feedback"]');
  for (const choice of designChoices) {
    await page.locator(`#design-${choice.id}`).check();
    await expect(choices.filter({ hasText: choice.label })).toHaveClass(/is-on/);
    await expect(note).toHaveText(choice.note);
    const s = await shown(page);
    const q = quoteOf(s.hash);
    expect(s.total).toBe(formatHours(q.hours));
    /* Its design hours, from its own column of the table */
    expect(s.legend[0]).toBe(hoursLabel(q.designHours));
    /* The package the app gives the estimate with this design */
    await expect(page.locator(".half.pkg b")).toHaveText(q.label);
    if (!choice.feedbackId) {
      await expect(feedback).toHaveCount(0);
      expect(q.designHours).toBe(0);
      continue;
    }
    /* Only this design's feedback rounds, starting at the ones included */
    await expect(feedback).toHaveCount(1);
    await expect(feedback).toHaveAttribute("data-id", choice.feedbackId);
    const rounds = getTile(choice.feedbackId);
    await expect(page.locator(`#qty-${choice.feedbackId}`)).toHaveValue(
      String(rounds.includedInBase),
    );
    await expect(page.locator(".basics")).toContainText(rounds.summary);
  }
});

test("taking an item out by keyboard moves focus to its Add on the shelf, and adding it moves focus back", async ({
  page,
}) => {
  await open(page);
  await page.locator('.feat [data-action="tile"][data-id="search"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.shelf .pill[data-id="search"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('.feat [data-action="tile"][data-id="search"]')).toBeFocused();
});

test("a press anywhere on a shelf row or on a part's row switches it, but a press on a control inside does not", async ({
  page,
}) => {
  await open(page);
  await page.locator('.s-row[data-key="landing-templates"] .s-name').click();
  await expect(page.locator('.feat[data-key="landing-templates"]')).toBeVisible();

  const recent = page.locator(".subs .r").filter({ hasText: "Recent blog posts" });
  await expect(recent).toHaveClass(/\boff\b/);
  await recent.locator(".tx").click();
  await expect(recent).toHaveClass(/is-on/);
  await recent.locator(".tx").click();
  await expect(recent).toHaveClass(/\boff\b/);

  await addFromShelf(page, "product-catalogue");
  const favorite = page.locator(".subs .r").filter({ hasText: "Favorite products" });
  await favorite.locator(".tx").click();
  await expect(favorite).toHaveClass(/is-on/);
  await favorite.locator('[data-action="inc"]').click();
  await expect(favorite).toHaveClass(/is-on/);
  await expect(favorite.locator(".qty")).toHaveValue("2");
});

/* Colours as the browser gives them (rgb() or color(srgb …)), and the contrast between two of them */
const contrastHelpers = `
  const parse = (c) => {
    let m = c.match(/rgba?\\(([\\d.]+)[, ]+([\\d.]+)[, ]+([\\d.]+)(?:[,/ ]+([\\d.]+))?/);
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] === undefined ? 1 : +m[4]];
    m = c.match(/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?: \\/ ([\\d.]+))?/);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    return null;
  };
  const over = (top, under) => top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = (c) => { const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
`;

test("every step under Growth and Starter stays visible on its card, at rest and under the pointer", async ({
  page,
}) => {
  await open(page);
  const lowest = () =>
    page.evaluate((helpers) => {
      const { parse, over, ratio } = new Function(`${helpers}; return { parse, over, ratio };`)();
      const sidebar = parse(getComputedStyle(document.querySelector(".side")!).backgroundColor);
      let min = Infinity;
      for (const half of document.querySelectorAll(".half")) {
        const cs = getComputedStyle(half);
        let card = over(parse(cs.backgroundColor) ?? [0, 0, 0, 0], sidebar);
        const tint = cs.backgroundImage.match(/(rgba?\([^)]*\)|color\([^)]*\))/);
        if (tint) card = over(parse(tint[1]), card);
        for (const step of half.querySelectorAll(".steps i"))
          min = Math.min(
            min,
            ratio(over(parse(getComputedStyle(step).backgroundColor), card), card),
          );
      }
      return min;
    }, contrastHelpers);
  expect(await lowest()).toBeGreaterThanOrEqual(1.25);
  await page.locator(".badge").hover();
  await settle(page);
  expect(await lowest()).toBeGreaterThanOrEqual(1.25);
});

test("items join the estimate in the order you add them, Content too, and go back to their own place on the shelf", async ({
  page,
}) => {
  await open(page);
  /* The link's items come in the shelf's order; then each in the order it is added */
  const linked = laneIds.filter((id) => quoteOf(EXAMPLE).selection.tiles[id] !== undefined);
  expect(linked).toEqual(expect.arrayContaining(["search", "custom-forms", "blog-setups"]));
  await addFromShelf(page, "content-hours");
  await addFromShelf(page, "landing-templates");
  const order = () =>
    page.locator(".feat").evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.key));
  expect(await order()).toEqual([...linked, "content-hours", "landing-templates"]);
  await page.locator('.feat[data-key="search"] .spine').click();
  await settle(page);
  expect(await order()).toEqual([
    ...linked.filter((id) => id !== "search"),
    "content-hours",
    "landing-templates",
  ]);
  const page_ = await page.evaluate(() => ({
    hash: location.hash,
    shelf: [...document.querySelectorAll(".s-row:not(.is-blocked)")].map(
      (n) => (n as HTMLElement).dataset.key,
    ),
  }));
  const tiles = quoteOf(page_.hash).selection.tiles;
  const off = laneIds.filter((id) => tiles[id] === undefined);
  const groups = ["Any package", "Needs Growth", "Needs Platform"] as const;
  expect(page_.shelf).toEqual(
    groups.flatMap((group) => off.filter((id) => shelfGroupOf(id) === group)),
  );
  /* Search is back in its own place: before every item after it in the table, in its group */
  expect(page_.shelf).toContain("search");
});

test("an item going in draws its spine first, one coming out slides away towards the shelf, and both leave the page as it would be with no motion", async ({
  page,
}) => {
  await open(page);
  /* Press and look in one go, before the motion has run */
  const added = await page.evaluate(() => {
    (document.querySelector('.shelf .pill[data-id="landing-templates"]') as HTMLElement).click();
    const card = document.querySelector('.feat[data-key="landing-templates"]')!;
    const spine = card
      .querySelector(".spine")!
      .getAnimations()
      .map((a) => (a.effect as KeyframeEffect).getKeyframes()[0]?.transform);
    const parts = [...card.children]
      .filter((n) => !n.classList.contains("spine"))
      .map((n) => (n.getAnimations()[0]?.effect as KeyframeEffect | undefined)?.getTiming().delay);
    return { spine, parts };
  });
  expect(added.spine).toEqual(["scaleY(0)"]);
  expect(added.parts.every((delay) => (delay as number) > 0)).toBe(true);
  await settle(page);

  const removed = await page.evaluate(() => {
    const box = document.querySelector('.feat[data-key="custom-forms"]')!.getBoundingClientRect();
    (document.querySelector('.feat[data-key="custom-forms"] .spine') as HTMLElement).click();
    const ghost = document.querySelector<HTMLElement>(".ghost")!;
    const frames = ghost.getAnimations()[0]?.effect as KeyframeEffect;
    return {
      at: [parseFloat(ghost.style.left), parseFloat(ghost.style.top)],
      box: [box.left, box.top],
      end: frames.getKeyframes().at(-1)!.transform,
      inert: (ghost.firstElementChild as HTMLElement).inert,
      keys: ghost.querySelectorAll("[data-key], [data-action]").length,
    };
  });
  /* The copy leaves from where the card stood (style values are rounded to three decimals) */
  removed.at.forEach((v, i) => expect(v).toBeCloseTo(removed.box[i] ?? Number.NaN, 1));
  expect(removed.end).toBe("translateX(40px)");
  expect(removed.inert).toBe(true);
  expect(removed.keys).toBe(0);
  await settle(page);

  await page.locator('.s-row[data-key="custom-forms"] .s-name').click();
  await settle(page);
  expect(await page.locator(".ghost").count()).toBe(0);
  expect(
    await page
      .locator(".feat")
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.key)),
  ).toEqual([
    /* The link's items in the shelf's order, Custom forms gone; then each as it came back */
    ...laneIds.filter(
      (id) => id !== "custom-forms" && quoteOf(EXAMPLE).selection.tiles[id] !== undefined,
    ),
    "landing-templates",
    "custom-forms",
  ]);
  const transforms = await page
    .locator(".feat, .feat *, .s-row")
    .evaluateAll(
      (nodes) =>
        nodes.filter(
          (n) => getComputedStyle(n).transform !== "none" && !n.classList.contains("spine"),
        ).length,
    );
  expect(transforms).toBe(0);
});

test("with reduced motion, adding and taking out items moves nothing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const moving = await page.evaluate(() => {
    (document.querySelector('.shelf .pill[data-id="landing-templates"]') as HTMLElement).click();
    const inAdded = document
      .querySelector('.feat[data-key="landing-templates"]')!
      .getAnimations({ subtree: true }).length;
    (document.querySelector('.feat[data-key="custom-forms"] .spine') as HTMLElement).click();
    const rows = [...document.querySelectorAll(".feat, .s-row")].reduce(
      (n, node) => n + node.getAnimations().length,
      0,
    );
    return { inAdded, rows, ghosts: document.querySelectorAll(".ghost").length };
  });
  expect(moving).toEqual({ inAdded: 0, rows: 0, ghosts: 0 });
});

test("the spine takes an item out from anywhere on it, and turns the tick into a cross under the pointer", async ({
  page,
}) => {
  await open(page);
  const spine = page.locator('.feat[data-key="blog-setups"] .spine');
  const box = await spine.boundingBox();
  expect(box!.height).toBeGreaterThan(150);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height - 10);
  await expect(spine.locator(".x")).toBeVisible();
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('.feat[data-key="blog-setups"]')).toHaveCount(0);
  await expect(page.locator('.s-row[data-key="blog-setups"]')).toBeVisible();
});

test("fixed parts start where the item's name starts, parts with a switch sit to the right, and launch parts start at their hairline", async ({
  page,
}) => {
  await open(page);
  await addFromShelf(page, "product-catalogue");
  /* Open to start with, both */
  for (const fold of await page.locator("details.fold").all()) {
    await expect(fold).toHaveAttribute("open", "");
  }
  await expect(page.locator("details.fold")).toHaveCount(2);
  await settle(page);
  const left = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((n) => n.getBoundingClientRect().left);
  const name = await left('.feat[data-key="product-catalogue"] > .r .tx b');
  expect(
    Math.abs((await left('.feat[data-key="product-catalogue"] .subs .r.no-lead .tx b')) - name),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      (await left('.feat[data-key="blog-setups"] .subs .r.no-lead .tx b')) -
        (await left('.feat[data-key="blog-setups"] > .r .tx b')),
    ),
  ).toBeLessThanOrEqual(1);
  expect(await left('.feat[data-key="product-catalogue"] .subs .r.off .pill')).toBeGreaterThan(
    name + 8,
  );
  for (const part of await page.locator(".fold-body .r").all()) {
    const [row, text] = await Promise.all([
      part.evaluate((n) => n.getBoundingClientRect().left),
      part.locator(".tx b").evaluate((n) => n.getBoundingClientRect().left),
    ]);
    expect(Math.abs(text - row)).toBeLessThanOrEqual(1);
  }
  expect(
    Math.abs((await left(".fold-body .r .tx b")) - (await left(".fold summary .tx b"))),
  ).toBeLessThanOrEqual(1);
});

test("Design comes before Build everywhere: the heads after Content or Project, each item's figures, the totals, the shelf and its key, the fields", async ({
  page,
}) => {
  await open(page);
  await addFromShelf(page, "product-catalogue");
  await addFromShelf(page, "custom-integration");
  const orders = await page.evaluate(() => {
    const kind = (node: Element) =>
      node.classList.contains("hd")
        ? "design"
        : node.classList.contains("hb")
          ? "build"
          : node.classList.contains("hp")
            ? "project"
            : "other";
    /* Every figure column that has figures; a row with no hours has an empty one */
    return [...document.querySelectorAll(".hrs:not(.one, .c, .p), .s-hrs, .s-key")]
      .filter((node) => node.children.length > 0)
      .map((node) => [...node.children].map(kind).join(" "));
  });
  expect(orders.length).toBeGreaterThan(20);
  for (const order of orders) expect(["design build", "project design build"]).toContain(order);
  /* The panel heads: Content or Project first, then Design and Build */
  await expect(page.locator(".est .sh > .hrs")).toHaveText([
    /^Content\d+h$/,
    /^Design\d+hBuild\d+h$/,
  ]);
  await expect(page.locator(".basics .sh:has(> .hrs.p) > .hrs")).toHaveText([
    /^Project\d+h$/,
    /^Design\d+hBuild\d+h$/,
  ]);
  await expect(page.locator(".s-key").first()).toHaveText("DesignBuild");
  await expect(page.locator('.feat[data-key="custom-integration"] .duo')).toHaveText([
    /Design/,
    /Build/,
  ]);
});

test("the tier name fits on its card, and the shelf's Build / Design key has the colours of the hours under it", async ({
  page,
}) => {
  await open(page);
  await addFromShelf(page, "product-catalogue");
  await expect(page.locator(".half.hub b")).toHaveText("Professional");
  const fit = await page.locator(".half.hub").evaluate((card) => {
    const range = document.createRange();
    range.selectNodeContents(card.querySelector("b")!);
    return card.getBoundingClientRect().right - range.getBoundingClientRect().right;
  });
  expect(fit).toBeGreaterThanOrEqual(10);
  const colour = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((n) => getComputedStyle(n).color);
  expect(await colour(".s-key .hb")).toBe(await colour(".s-row .s-hrs .hb"));
  expect(await colour(".s-key .hd")).toBe(await colour(".s-row .s-hrs .hd"));
  expect(await colour(".s-key .hb")).not.toBe(await colour(".s-key .hd"));
});

test("Changelog, under Reset, lists the releases in a dialog that Escape, Close or a press outside closes; under it, the version and Beta", async ({
  page,
}) => {
  await open(page);
  /* Last in the sidebar: Reset, Changelog under it, then the version */
  const label = `${appName}v${currentRelease.version}${currentRelease.stage ?? ""}`;
  expect(
    await page
      .locator(".side-act")
      .evaluate((nav) => [...nav.children].slice(-2).map((node) => node.textContent?.trim())),
  ).toEqual([expect.stringMatching(/^Reset.*Changelog/), label]);
  const below = async (upper: string, lower: string) =>
    (await page.locator(upper).boundingBox())!.y < (await page.locator(lower).boundingBox())!.y;
  expect(await below('[data-focus="act-reset"]', '[data-focus="act-changelog"]')).toBe(true);
  expect(await below('[data-focus="act-changelog"]', ".ver")).toBe(true);
  /* On a laptop the rail still holds them all, Reset and Changelog side by side */
  await page.setViewportSize(LAPTOP);
  expect(
    await page.locator(".side").evaluate((side) => side.scrollHeight <= side.clientHeight),
  ).toBe(true);
  await expect(page.locator(".ver")).toBeInViewport({ ratio: 1 });
  /* The rail is too narrow for the name: the version and Beta stay */
  await expect(page.locator(".ver-name")).toBeHidden();
  await expect(page.locator(".ver .beta")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  const dialog = page.locator("dialog.changelog");
  const button = page.getByRole("button", { name: "Changelog" });
  await button.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".cl-release h3")).toHaveText(
    releases.map((release) => new RegExp(`^v${release.version.replace(".", "\\.")}`)),
  );
  await expect(dialog.locator(".cl-release").first().locator("li")).toHaveCount(
    currentRelease.changes.length,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await button.click();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await button.click();
  await page.mouse.click(8, 8);
  await expect(dialog).toBeHidden();
  /* The estimate is as it was */
  await expect(page.locator(".big")).toBeVisible();
});

test("the page's main heading is its name, read but not shown; the favicon loads", async ({
  page,
}) => {
  await open(page);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(appName);
  const box = await heading.boundingBox();
  expect(box!.width * box!.height).toBeLessThanOrEqual(1);
  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  const response = await page.request.get(new URL(href!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("<svg");
});

test("Reset is off on the starting estimate and empties any other; Undo brings back the same estimate in the same order", async ({
  page,
}) => {
  await page.goto("/");
  const reset = page.locator(".ab.warn");
  await expect(reset).toBeDisabled();
  await open(page);
  await expect(reset).toBeEnabled();
  const order = () =>
    page.locator(".feat").evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.key));
  const before = { hash: await page.evaluate(() => location.hash), order: await order() };
  await reset.click();
  await expect(page.locator(".est .count")).toHaveText(`0 of ${laneIds.length}`);
  await expect(page.locator(".half.pkg b")).toHaveText("Essential");
  /* Nothing left to reset: Reset is off, and the next thing to reach is Undo */
  await expect(reset).toBeDisabled();
  await expect(page.locator(".toast button")).toBeFocused();
  await page.locator(".toast button").click();
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(reset).toBeEnabled();
  await expect(reset).toBeFocused();
  expect(await page.evaluate(() => location.hash)).toBe(before.hash);
  expect(await order()).toEqual(before.order);
});

test("Page migration and Blog import are hours you enter, as Content is, and count as Content hours", async ({
  page,
}) => {
  await open(page);
  for (const id of ["migrate-pages", "migrate-posts"]) {
    await expect(page.locator(`.s-row[data-key="${id}"] .s-cue`)).toHaveText("Enter hours");
    await addFromShelf(page, id);
  }
  for (const [id, hours] of [
    ["migrate-pages", "12"],
    ["migrate-posts", "5"],
  ] as const) {
    await page.locator(`#hours-${id}`).fill(hours);
    await page.keyboard.press("Enter");
    await expect(page.locator(`.feat[data-key="${id}"] .hc`)).toHaveText(`${hours}h`);
  }
  const s = await shown(page);
  const q = quoteOf(s.hash);
  expect(q.contentHours).toBe(17);
  expect(s.legend[2]).toBe("17h");
  await expect(page.locator(".est .sh .hrs.sum.c")).toHaveText(/(^|Content)17h$/);
});

test("the shelf shows what is coming soon locked, with its tier, each in the group of the package it needs, and there is no Coming later list", async ({
  page,
}) => {
  /* The frozen files have items coming soon, whatever src/ has */
  await openFrozen(page);
  const blockedShelfIds = frozen(() => shelfLanes().blockedShelfIds);
  const shelfGroupOf = (id: string) => frozen(() => shelfGroupOfLive(id));
  const getTile = (id: string) => frozen(() => getTileLive(id));
  const blocked = page.locator(".s-row.is-blocked");
  const rows = await blocked.evaluateAll((nodes) =>
    nodes.map((n) => [
      (n as HTMLElement).dataset.key,
      n.querySelector(".s-name")?.firstChild?.textContent,
      n.querySelector(".tag")?.textContent ?? null,
    ]),
  );
  /* Every item coming soon, in the group of the package it needs, after the rest of the group */
  for (const group of await page.locator(".shelf .s-group").all()) {
    const locked = await group
      .locator(".s-row")
      .evaluateAll((nodes) => nodes.map((n) => n.classList.contains("is-blocked")));
    expect(locked).toEqual([...locked].sort((a, b) => Number(a) - Number(b)));
  }
  expect(blockedShelfIds.length).toBeGreaterThan(0);
  const groupName = {
    "Any package": "Any package",
    "Needs Growth": "Growth",
    "Needs Platform": "Platform",
  } as const;
  const expected = (Object.keys(groupName) as (keyof typeof groupName)[]).flatMap((group) =>
    blockedShelfIds.filter((id) => shelfGroupOf(id) === group).map((id) => [id, groupName[group]]),
  );
  const placed = await blocked.evaluateAll((nodes) =>
    nodes.map((n) => [
      (n as HTMLElement).dataset.key,
      n.closest(".s-group")?.querySelector("h3 span")?.textContent,
    ]),
  );
  expect(placed).toEqual(expected);
  expect(rows.map(([key]) => key).sort()).toEqual([...blockedShelfIds].sort());
  /* Each by its name, with the tier it needs */
  for (const [key, name, tag] of rows) {
    const tile = getTile(key ?? "");
    expect(name).toBe(tile.id === "product-catalogue" ? "Product catalogue" : tile.label);
    expect(tag).toBe(frozen(() => tierMark(tile)) ?? null);
  }
  /* No badge: a small note says why, over the row, while the pointer is on it */
  await expect(blocked.locator(".dev")).toHaveCount(0);
  const tip = blocked.first().locator(".tip");
  await expect(tip).toHaveText("In development. Not part of the estimate yet.");
  expect(await tip.evaluate((n) => getComputedStyle(n).opacity)).toBe("0");
  await blocked.first().hover();
  await expect.poll(() => tip.evaluate((n) => getComputedStyle(n).opacity)).toBe("1");
  /* Over the row above it, not under: let it take the pointer for a moment to ask what is on top */
  const onTop = await tip.evaluate((n) => {
    const node = n as HTMLElement;
    const box = node.getBoundingClientRect();
    node.style.pointerEvents = "auto";
    const top = document.elementFromPoint(box.left + 10, box.top + 6);
    node.style.pointerEvents = "";
    return top?.closest(".tip") === node;
  });
  expect(onTop).toBe(true);
  await expect(page.locator(".side")).not.toContainText("Coming later");
});

for (const size of [{ width: 1440, height: 900 }, LAPTOP]) {
  test(`at ${size.width}px Copy hours and Hours breakdown are one block, and Reset stays in view`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page);
    const block = page.locator(".side .hours-act");
    await expect(block.locator(".ab")).toHaveCount(2);
    await expect(block.locator(".ab.primary")).toHaveAttribute("aria-label", "Copy hours");
    await expect(block.locator('button[aria-label="Hours breakdown"]')).toHaveCount(1);
    expect(await block.evaluate((n) => getComputedStyle(n).boxShadow)).not.toBe("none");
    const outer = await block.boundingBox();
    for (const button of await block.locator(".ab").all()) {
      const box = await button.boundingBox();
      expect(box && outer && box.x >= outer.x && box.x + box.width <= outer.x + outer.width).toBe(
        true,
      );
      expect(box && outer && box.y >= outer.y && box.y + box.height <= outer.y + outer.height).toBe(
        true,
      );
    }
    const reset = await page.locator(".ab.warn").boundingBox();
    expect((reset?.y ?? 0) + (reset?.height ?? 0)).toBeLessThanOrEqual(size.height);
  });
}

test("things that cannot be added are disabled, not inert, so their reason and not-allowed cursor show", async ({
  page,
}) => {
  /* The frozen files have CRM Object section coming soon */
  await openFrozen(page);
  await addFromShelf(page, "product-catalogue");
  await page.locator('[data-action="mode"][data-id="product-catalogue"][data-qty="1"]').click();
  const related = page.locator(".subs .r.blocked");
  await expect(related).toHaveAttribute("aria-disabled", "true");
  await expect(related).toHaveAttribute("title", /Needs dynamic pages/);
  for (const node of [related, page.locator('.s-row[data-key="crm-section"]')]) {
    expect(await node.evaluate((n) => (n as HTMLElement).inert)).toBe(false);
    expect(await node.evaluate((n) => getComputedStyle(n).cursor)).toBe("not-allowed");
  }
  await related.click();
  await expect(related).toHaveClass(/blocked/);
});

test("package hints sit on the note line and show only while they would move the package", async ({
  page,
}) => {
  await open(page);
  await page.locator(".ab.warn").click();
  const templates = page.locator(".basics .r").filter({ hasText: "Page templates" });
  await expect(templates.locator(".tx small .hint")).toHaveText("5+ → Growth");
  expect(await templates.locator(".hint").evaluate((n) => getComputedStyle(n).display)).toBe(
    "block",
  );
  await expect(templates.locator(".tx b .hint")).toHaveCount(0);
  /* An item that needs Growth, whichever it is in the files */
  const growth = laneIds.find((id) => shelfGroupOf(id) === "Needs Growth") ?? "";
  await addFromShelf(page, growth);
  await expect(page.locator(".half.pkg b")).toHaveText("Growth");
  await expect(templates.locator(".hint")).toBeHidden();
});

for (const size of [{ width: 1440, height: 900 }, LAPTOP]) {
  test(`at ${size.width}px the three column titles share one line, the shelf is at most 260px and the estimate is the widest column`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page);
    const m = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return {
        tops: [".basics .sh h2", ".est .sh h2", ".s-head h2"].map((s) => Math.round(box(s).top)),
        shelf: box(".shelf").width,
        est: box(".est").width,
        basics: box(".basics").width,
      };
    });
    expect(Math.max(...m.tops) - Math.min(...m.tops)).toBeLessThanOrEqual(1);
    expect(m.shelf).toBeLessThanOrEqual(260);
    expect(m.est).toBeGreaterThan(m.basics);
  });

  test(`at ${size.width}px popovers from the sidebar open beside it, not over it`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page);
    for (const trigger of ['button[aria-label="Hours breakdown"]', ".badge"]) {
      await page.locator(trigger).click();
      const panel = page.locator(".pop-panel:popover-open");
      await expect(panel).toBeVisible();
      const [left, edge] = await Promise.all([
        panel.evaluate((n) => n.getBoundingClientRect().left),
        page.locator(".side").evaluate((n) => n.getBoundingClientRect().right),
      ]);
      expect(left).toBeGreaterThanOrEqual(edge);
      await page.keyboard.press("Escape");
      await page.mouse.click(size.width - 20, size.height - 20);
    }
  });
}

/* A row's text (name, note, package hint) never runs under its control or its hours */
const textUnderControls = async (page: Page) => {
  await settle(page);
  return page.evaluate(() => {
    const out: string[] = [];
    const lines = (el: Element) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].filter((r) => r.width > 0);
    };
    for (const row of document.querySelectorAll(".r, .s-row")) {
      const blockers = [
        ...row.querySelectorAll(
          ":scope > .ctl > *, :scope > .hrs > span, :scope > .s-hrs > span, :scope > .s-cue",
        ),
      ]
        .filter((n) => n.textContent?.trim() || n.children.length)
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.width > 0);
      for (const text of row.querySelectorAll(
        ":scope > .tx b, :scope > .tx small, :scope > .s-name",
      )) {
        for (const t of lines(text)) {
          for (const b of blockers) {
            if (
              t.right > b.left + 0.5 &&
              t.left < b.right - 0.5 &&
              t.bottom > b.top + 0.5 &&
              t.top < b.bottom - 0.5
            ) {
              out.push(text.textContent?.trim().slice(0, 40) ?? "");
            }
          }
        }
      }
    }
    return out;
  });
};

for (const size of [{ width: 1440, height: 900 }, LAPTOP]) {
  test(`at ${size.width}px no text runs under a control or the hours: as given, on Essential with every package hint, and with everything in`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page);
    expect(await textUnderControls(page)).toEqual([]);
    await page.locator(".ab.warn").click();
    await expect(page.locator(".basics .hint:not(.off)")).toHaveCount(4);
    expect(await textUnderControls(page)).toEqual([]);
    await page.locator(".toast button").click();
    for (const id of ["landing-templates", "system", "hubdb", "product-catalogue", "content-hours"])
      await addFromShelf(page, id);
    await page.locator('[data-action="inc"][data-id="blog-setups"]').click();
    await page.locator('[data-action="mode"][data-id="product-catalogue"][data-qty="5"]').click();
    expect(await textUnderControls(page)).toEqual([]);
  });
}

const SIZES = [{ width: 1440, height: 900 }, LAPTOP];

for (const size of SIZES) {
  test(`at ${size.width}px: the captions over column figures stay apart and inside their panel, and no text runs under a control`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page);
    await addFromShelf(page, "product-catalogue");
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll(".sh")].map((sh) => {
        const panel = sh.closest(".pb")!.getBoundingClientRect();
        /* The captions shown: a label that has no room is not */
        const caps = [...sh.querySelectorAll(".hrs.sum small")]
          .map((c) => c.getBoundingClientRect())
          .filter((c) => c.width > 0);
        const apart = caps.every((a, i) =>
          caps
            .slice(i + 1)
            .every(
              (b) =>
                a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
            ),
        );
        return { inside: caps.every((c) => c.right <= panel.right && c.left >= panel.left), apart };
      }),
    );
    for (const head of heads) expect(head).toEqual({ inside: true, apart: true });
    expect(await textUnderControls(page)).toEqual([]);
  });
}

/* Every row, card, head and sidebar action keeps its top and height through a press that adds or removes
   no row. Choosing a design is left out: it adds and removes rows on purpose. */
async function places(page: Page) {
  await settle(page);
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        ".basics .sh, .basics .r, .fold, .feat, .feat .r, .est .more, .side .hgrid, .side-act .ab, .s-row",
      ),
    ].map((n) => {
      const r = n.getBoundingClientRect();
      const scroller = n.closest("[data-keep-scroll]");
      return `${n.className.split(" ")[0]} ${Math.round(r.top + (scroller ? scroller.scrollTop : 0))}/${Math.round(r.height)}`;
    }),
  );
}
const click = (page: Page, sel: string) => () => page.locator(sel).first().click();
const type = (page: Page, sel: string, value: string) => async () => {
  await page.locator(sel).fill(value);
  await page.keyboard.press("Enter");
};

test("column figures sit on their title's line, labels have no dots and their figure's colour, dimmer; Content leads the estimate's and Project the site basics', labelled where they fit", async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-action="inc"][data-id="ai-feedback"]').click();
  await settle(page);
  const heads = await page.evaluate(() =>
    [...document.querySelectorAll(".sh")].map((sh) => {
      const title = sh.querySelector("h2")!.getBoundingClientRect();
      const spans = [...sh.querySelectorAll(".hrs.sum > span")].filter((s) =>
        s.querySelector("small"),
      );
      return spans.map((span) => {
        const figure = document.createRange();
        figure.selectNode(span.lastChild!);
        const f = figure.getBoundingClientRect();
        const label = span.querySelector("small")!;
        const ls = getComputedStyle(label);
        return {
          line: Math.abs((f.top + f.bottom) / 2 - (title.top + title.bottom) / 2),
          dot: getComputedStyle(label, "::before").content,
          sameColour: ls.color === getComputedStyle(span).color,
          dimmer: Number(ls.opacity) < 1,
        };
      });
    }),
  );
  expect(heads.flat().length).toBeGreaterThanOrEqual(5);
  for (const f of heads.flat()) {
    expect(f.line).toBeLessThanOrEqual(2);
    expect(f.dot).toBe("none");
    expect(f.sameColour).toBe(true);
    expect(f.dimmer).toBe(true);
  }
  /* Content first in the estimate's head, Project first in the site basics': in their colours, with
     their labels at full width, and the titles still on one line */
  const content = page.locator(".est .sh > .hrs.sum.c");
  const project = page.locator(".basics .sh > .hrs.sum.p");
  await expect(content).toHaveText(/^Content\d+h$/);
  await expect(project).toHaveText(/^Project\d+h$/);
  for (const [lead, dot] of [
    [content, ".lg .c b"],
    [project, ".lg .p b"],
  ] as const) {
    expect(await lead.evaluate((n) => getComputedStyle(n).color)).toBe(
      await page.locator(dot).evaluate((n) => getComputedStyle(n).color),
    );
    /* Before Design and Build */
    expect(
      await lead.evaluate((n) => n.nextElementSibling?.classList.contains("sum") ?? false),
    ).toBe(true);
  }
  for (const title of await page.locator(".sh h2").all()) {
    expect(await title.evaluate((n) => n.getBoundingClientRect().height)).toBeLessThanOrEqual(23);
  }
  /* Narrower: the figures alone, in their colours */
  await page.setViewportSize(LAPTOP);
  await expect(content.locator("small")).toBeHidden();
  await expect(project.locator("small")).toBeHidden();
  await expect(content).toHaveText(/^Content\d+h$/);
});

for (const size of SIZES) {
  test(`at ${size.width}px: nothing jumps when you choose an option, change a number, or switch a part`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page);
    const steps: [string, () => Promise<unknown>][] = [
      ["Search Advanced", click(page, '[data-action="mode"][data-id="search"][data-qty="2"]')],
      ["Search Simple", click(page, '[data-action="mode"][data-id="search"][data-qty="1"]')],
      ["Feedback 3", click(page, '[data-action="inc"][data-id="ai-feedback"]')],
      ["Feedback 2", click(page, '[data-action="dec"][data-id="ai-feedback"]')],
      ["2 blogs", click(page, '[data-action="inc"][data-id="blog-setups"]')],
      ["1 blog", click(page, '[data-action="dec"][data-id="blog-setups"]')],
      [
        "List template Advanced",
        click(page, '[data-action="mode"][data-id="blog-list"][data-qty="2"]'),
      ],
      [
        "List template Simple",
        click(page, '[data-action="mode"][data-id="blog-list"][data-qty="1"]'),
      ],
      ["Recent blog posts on", click(page, ".subs .r.off .tx")],
      ["Recent blog posts off", click(page, ".subs .r.is-on .tx")],
      ["Copy hours", click(page, ".ab.primary")],
    ];
    for (const [label, act] of steps) {
      const before = await places(page);
      await act();
      expect(await places(page), label).toEqual(before);
    }

    await addFromShelf(page, "product-catalogue");
    await addFromShelf(page, "content-hours");
    const catalogue = [
      ...[1, 3, 4, 5, 2].map((level): [string, () => Promise<unknown>] => [
        `Complexity ${level}`,
        click(page, `[data-action="mode"][data-id="product-catalogue"][data-qty="${level}"]`),
      ]),
      [
        "Custom catalogue hours",
        async () => {
          await page
            .locator('[data-action="mode"][data-id="product-catalogue"][data-qty="5"]')
            .click();
          await type(page, "#hours-catalogue-custom", "30")();
          await page
            .locator('[data-action="mode"][data-id="product-catalogue"][data-qty="2"]')
            .click();
        },
      ],
      ["Favorite products on", click(page, '.subs .r.off:has-text("Favorite products") .tx')],
      ["Favorite products 2", click(page, '[data-action="inc"][data-id="favorite-products"]')],
      ["Favorite products off", click(page, '.subs .r.is-on:has-text("Favorite products") .tx')],
      ["Related products on", click(page, '.subs .r.off:has-text("Related products") .tx')],
      [
        "Module based with Related products",
        click(page, '[data-action="mode"][data-id="product-catalogue"][data-qty="1"]'),
      ],
      [
        "Back to Simple",
        click(page, '[data-action="mode"][data-id="product-catalogue"][data-qty="2"]'),
      ],
      ["Content hours", type(page, "#hours-content-hours", "12")],
    ] as [string, () => Promise<unknown>][];
    for (const [label, act] of catalogue) {
      const before = await places(page);
      await act();
      expect(await places(page), label).toEqual(before);
    }

    await page.locator(".ab.warn").click();
    await page.locator(".toast button").waitFor();
    const basics: [string, () => Promise<unknown>][] = [
      ["Page templates 4", click(page, '[data-action="inc"][data-id="templates"]')],
      [
        "Page templates 5 (moves to Growth)",
        click(page, '[data-action="inc"][data-id="templates"]'),
      ],
      [
        "Page templates 4 (back to Essential)",
        click(page, '[data-action="dec"][data-id="templates"]'),
      ],
      ["Menu Advanced", click(page, '[data-action="mode"][data-id="menu"][data-qty="2"]')],
      ["Menu Simple", click(page, '[data-action="mode"][data-id="menu"][data-qty="1"]')],
      ["2 languages", click(page, '[data-action="inc"][data-id="languages"]')],
      ["1 language", click(page, '[data-action="dec"][data-id="languages"]')],
      ["30+ pages", click(page, '[data-action="pages-over"][data-over="1"]')],
      ["Up to 30 pages", click(page, '[data-action="pages-over"][data-over="0"]')],
      ["40 sections (past 200 hours)", type(page, "#qty-sections", "40")],
      ["8 sections", type(page, "#qty-sections", "8")],
    ];
    for (const [label, act] of basics) {
      const before = await places(page);
      await act();
      expect(await places(page), label).toEqual(before);
    }
  });
}

test("Add sits in the middle of its pill, on the shelf and inside an item", async ({ page }) => {
  await open(page);
  const offsets = await page.locator(".pill").evaluateAll((pills) =>
    pills.map((pill) => {
      const range = document.createRange();
      range.selectNodeContents(pill);
      const text = range.getBoundingClientRect();
      const box = pill.getBoundingClientRect();
      return [
        Math.abs(text.left - box.left - (box.right - text.right)),
        Math.abs(text.top - box.top - (box.bottom - text.bottom)),
      ];
    }),
  );
  expect(offsets.length).toBeGreaterThan(3);
  for (const [x, y] of offsets) {
    expect(x).toBeLessThanOrEqual(1.5);
    expect(y).toBeLessThanOrEqual(2);
  }
});

test("with every feature in, nothing runs out of its card or row at 1280px, and the phone layout has no sideways scroll", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP);
  await open(page);
  for (const id of ["landing-templates", "system", "hubdb", "product-catalogue", "content-hours"])
    await addFromShelf(page, id);
  await page.locator('[data-action="inc"][data-id="blog-setups"]').click();
  await page.locator('[data-action="mode"][data-id="product-catalogue"][data-qty="5"]').click();
  await settle(page);
  const outside = await page.evaluate(() => {
    const out: string[] = [];
    for (const box of document.querySelectorAll(".feat, .basics .r, .fold, .s-row, .side")) {
      const edge = box.getBoundingClientRect();
      /* A tooltip is a card over the page, not part of its row */
      for (const n of box.querySelectorAll(":not([role=tooltip]):not([role=tooltip] *)")) {
        const r = n.getBoundingClientRect();
        if (r.width && (r.right > edge.right + 0.5 || r.left < edge.left - 0.5))
          out.push(`${n.tagName}.${n.className} in ${box.className}`);
      }
    }
    return out;
  });
  expect(outside).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  /* The parts of each column head (title, figures) never run into each other */
  const clashes = await page.evaluate(() => {
    const out: string[] = [];
    for (const head of document.querySelectorAll(".sh")) {
      const parts = [...head.children]
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.width > 0);
      for (let i = 1; i < parts.length; i += 1) {
        const text = [...(head.children[0]?.childNodes ?? [])].map((n) => n.textContent).join("");
        if ((parts[i]?.left ?? 0) < (parts[i - 1]?.right ?? 0) - 0.5) out.push(text);
      }
    }
    return out;
  });
  expect(clashes).toEqual([]);
});

test("the dot grid counts hours, one dot each, in four blocks of 50 that fill the width", async ({
  page,
}) => {
  await open(page);
  const steps = [
    async () => {},
    () => addFromShelf(page, "product-catalogue"),
    /* Past 200 hours, whatever the files' hours: every section and page template there can be */
    async () => {
      await page.locator("#qty-sections").fill(String(getTile("sections").max));
      await page.keyboard.press("Enter");
      await page.locator("#qty-templates").fill(String(getTile("templates").max));
      await page.keyboard.press("Enter");
    },
  ];
  let scaled = false;
  for (const step of steps) {
    await step();
    const g = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll(".hgrid .blk")];
      const count = (c: string) => document.querySelectorAll(`.hgrid i.${c}`).length;
      return {
        blocks: blocks.map((b) => b.children.length),
        widthLeft:
          document.querySelector(".hgrid")!.getBoundingClientRect().right -
          (blocks.at(-1)?.getBoundingClientRect().right ?? 0),
        d: count("d"),
        b: count("b"),
        c: count("c"),
        p: count("p"),
        hash: location.hash,
        unit: document.querySelector(".dot-unit:not(.reserved)")?.textContent ?? null,
      };
    });
    const q = quoteOf(g.hash);
    const parts = [q.designHours, q.implementationHours, q.contentHours, q.projectHours];
    expect(q.projectHours).toBeGreaterThan(0);
    expect(g.blocks).toEqual([50, 50, 50, 50]);
    expect(g.widthLeft).toBeLessThanOrEqual(1);
    if (q.hours <= 200) {
      expect([g.d, g.b, g.c, g.p]).toEqual(parts.map(Math.round));
      expect(g.unit).toBeNull();
    } else {
      scaled = true;
      const unit = Number(g.unit?.match(/= (\d+)h/)?.[1]);
      expect(unit).toBeGreaterThan(1);
      expect([g.d, g.b, g.c, g.p]).toEqual(parts.map((h) => Math.round(h / unit)));
    }
  }
  expect(scaled).toBe(true);
  await expect(page.locator(".tlabel")).toHaveText("Total");
  await expect(page.locator(".badge .join")).toHaveCount(1);
});

test("Copy hours copies the app's own text and keeps its icon while it says Copied", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.locator(".ab.primary").click();
  await expect(page.locator(".ab.primary .al")).toHaveText("Copied");
  await expect(page.locator(".ab.primary svg")).toHaveCount(1);
  const [copied, hash] = await page.evaluate(async () => [
    await navigator.clipboard.readText(),
    location.hash,
  ]);
  expect(copied).toBe(hoursText(quoteOf(hash)));
  await expect(page.locator(".ab.primary .al")).toHaveText("Copy hours", { timeout: 4000 });
});

test("Escape closes an open popup, Hours breakdown or the package's, and the focus goes back to its button", async ({
  page,
}) => {
  await open(page);
  for (const trigger of ['button[aria-label="Hours breakdown"]', ".badge"]) {
    const button = page.locator(trigger).first();
    await button.click();
    await expect(page.locator(".pop-panel:popover-open")).toHaveCount(1);
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator(".pop-panel:popover-open")).toHaveCount(0);
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
  }
});

test("a popup a redraw took away leaves no listener behind: the next click drops them all", async ({
  page,
}) => {
  await open(page);
  const cdp = await page.context().newCDPSession(page);
  const keydowns = async () => {
    const { result } = await cdp.send("Runtime.evaluate", { expression: "document" });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", {
      objectId: result.objectId ?? "",
    });
    return listeners.filter((listener) => listener.type === "keydown").length;
  };
  const before = await keydowns();
  await page.locator('button[aria-label="Hours breakdown"]').click();
  await expect(page.locator(".pop-panel:popover-open")).toHaveCount(1);
  expect(await keydowns()).toBe(before + 1);
  /* The same estimate again: the page redraws, and the open popup goes with it */
  await page.evaluate(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
  await expect(page.locator(".pop-panel:popover-open")).toHaveCount(0);
  await page.locator(".sh h2").first().click();
  expect(await keydowns()).toBe(before);
});

test("the hours breakdown says what Copy hours copies, the included rounds and variants too, and names its group Build as the rest of the page does", async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-action="inc"][data-id="ai-feedback"]').click();
  await page.locator('button[aria-label="Hours breakdown"]').click();
  const panel = page.locator(".pop-panel:popover-open");
  const heads = panel.locator(".line-head");
  await expect(heads).toContainText(["Design", "Build"]);
  await expect(panel).not.toContainText("Implementation");
  const summary = hoursSummary(quoteOf(await page.evaluate(() => location.hash)));
  await expect(panel.locator(".line-title")).toHaveText(summary.title);
  /* Line for line, as Copy hours has them */
  const want = summary.groups.flatMap((group) => [
    [group.heading, hoursLabel(group.hours)],
    ...group.lines.map((line) => [
      line.name,
      line.hours === null ? "" : line.hours === "included" ? "included" : hoursLabel(line.hours),
    ]),
  ]);
  const shown = await panel
    .locator(".line-head, .line:not(.is-total)")
    .evaluateAll((items) =>
      items.map((item) => [...item.children].map((part) => part.textContent ?? "")),
    );
  expect(shown).toEqual(want);
  expect(shown.flat()).toContain("Variants · 2 designs");
  expect(shown.flat()).toContain("Feedback · 2 rounds (1 included, 1 extra)");
  await expect(panel.locator(".line.is-total")).toContainText(hoursLabel(summary.total));
});

test("Custom integration takes build hours and design hours, each in its field, and Copy hours waits until one has some", async ({
  page,
}) => {
  await open(page);
  await addFromShelf(page, "custom-integration");
  const card = page.locator('.feat[data-key="custom-integration"]');
  const build = card.locator("#hours-custom-integration");
  const design = card.locator("#hours-custom-integration-design");
  await expect(card.locator(".duo")).toHaveText([/Design/, /Build/]);
  await page.locator(".ab.primary").click();
  await expect(page.locator(".toast.is-warn")).toContainText("Add hours to Custom integration");
  await expect(card.locator(".r")).toHaveClass(/missing/);
  await design.fill("5");
  await page.keyboard.press("Enter");
  await expect(card.locator(".r")).not.toHaveClass(/missing/);
  await build.fill("12");
  await page.keyboard.press("Enter");
  await expect(card.locator(".hrs .hb")).toHaveText("12h");
  await expect(card.locator(".hrs .hd")).toHaveText("5h");
  const q = quoteOf(await page.evaluate(() => location.hash));
  expect(q.selection.tiles["custom-integration"]).toBe(12);
  expect(q.selection.tiles["custom-integration-design"]).toBe(5);
  const text = hoursText(q);
  expect(text).toContain("  - Custom integration: 12h");
  expect(text).toContain("  - Custom integration: 5h");
});

test("a tier badge follows the option or quantity in use: Forms with external data is Pro with HubDB and Ent with External API, and so on for every card", async ({
  page,
}) => {
  /* The frozen files with everything coming soon made live, in a preview, so every item is here
     whatever src/ has live */
  const table = serializeTable(
    rows.map((row) => (row.status === "soon" ? { ...row, status: "" } : row)),
  );
  const catalog = buildCatalog(parseTable(table), rules, codes);
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    "website-packages.preview",
    JSON.stringify({ ...fixtureText, table, code: "" }),
  ] as const);
  await page.goto("/?preview", { waitUntil: "domcontentloaded" });
  await expect(page.locator('.shelf .pill[data-id="external-forms"]')).toBeVisible({
    timeout: 15000,
  });
  /* Every card's badge, and the badge of each part that has one, as the app's own tiers say */
  const badges = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".est .feat")].map((card) => [
        (card as HTMLElement).dataset.key,
        card.querySelector(":scope > .r .tx b .tag")?.textContent ?? null,
      ]),
    );
  const wanted = async () => {
    const hash = await page.evaluate(() => location.hash);
    return withCatalog(catalog, () => {
      const chosen = (decodeSelection(hash) as NonNullable<ReturnType<typeof decodeSelection>>)
        .tiles;
      return shelfLanes()
        .laneIds.filter((id) =>
          id === "product-catalogue" ? sourceIn(chosen) : chosen[id] !== undefined,
        )
        .map((id) => {
          const tile = getTile(id === "product-catalogue" ? (sourceIn(chosen) ?? id) : id);
          return [id, tierMark(tile, chosen[tile.id]) ?? null];
        });
    });
  };
  const card = page.locator('.feat[data-key="external-forms"]');
  const head = card.locator(":scope > .r .tx b .tag");
  await addFromShelf(page, "external-forms");
  await expect(head).toHaveText("Pro");
  await card.locator('[data-action="mode"][data-id="external-forms"][data-qty="2"]').click();
  await expect(head).toHaveText("Ent");
  await expect(page.locator(".half.hub b")).toHaveText("Enterprise");
  await card.locator('[data-action="mode"][data-id="external-forms"][data-qty="1"]').click();
  await expect(head).toHaveText("Pro");
  /* Everything in, then each option of each card and more of what counts */
  for (const id of withCatalog(catalog, () => shelfLanes().laneIds)) {
    if (await page.locator(`.shelf .pill[data-id="${id}"]`).count()) {
      await page.locator(`.shelf .pill[data-id="${id}"]`).click();
    }
  }
  await settle(page);
  const sorted = (list: unknown[][]) =>
    [...list].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  expect(sorted(await badges())).toEqual(sorted(await wanted()));
  for (const button of await page
    .locator('.est .feat [data-action="mode"]:not([disabled])')
    .all()) {
    await button.click();
    expect(sorted(await badges())).toEqual(sorted(await wanted()));
  }
  const groups = page.locator('[data-action="inc"][data-id="membership-groups"]');
  await groups.click();
  await groups.click();
  await expect(
    page
      .locator(".feat[data-key='membership'] .subs .r", { hasText: "Access groups" })
      .locator(".tag"),
  ).toHaveText(withCatalog(catalog, () => tierMark(getTile("membership-groups"), 3) ?? ""));
  await page.locator('[data-action="inc"][data-id="blog-setups"]').click();
  expect(sorted(await badges())).toEqual(sorted(await wanted()));
});

test("Memberships: a way to sign in, access groups (Enterprise from 3), Social sign-in that does not go with SSO, and a Member area whose hours are entered", async ({
  page,
}) => {
  /* Memberships may be coming soon in src/: the frozen files of test/fixtures have it live. The
     estimator prices with them in a preview, as the calculations page opens it */
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    "website-packages.preview",
    JSON.stringify({ ...fixtureText, code: "" }),
  ] as const);
  await page.goto("/?preview", { waitUntil: "domcontentloaded" });
  await expect(page.locator('.shelf .pill[data-id="membership"]')).toBeVisible({ timeout: 15000 });
  await addFromShelf(page, "membership");
  const card = page.locator('.feat[data-key="membership"]');
  const signIn = (level: number) =>
    card.locator(`[data-action="mode"][data-id="membership"][data-qty="${level}"]`);
  await expect(card.locator('[data-action="mode"][data-id="membership"]')).toHaveText(
    withCatalog(fixtureCatalog, () => getTile("membership").modes ?? []).map((mode) => mode.label),
  );
  await expect(signIn(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".half.hub b")).toHaveText("Professional");
  /* Three access groups: Enterprise */
  const groups = card.locator('[data-action="inc"][data-id="membership-groups"]');
  await groups.click();
  await groups.click();
  await expect(page.locator(".half.hub b")).toHaveText("Enterprise");
  /* Social sign-in, then SSO: it is locked, and out */
  await card.locator('.pill[data-id="membership-social"]').click();
  await expect(card.locator(".sub.is-on", { hasText: "Social sign-in" })).toBeVisible();
  await signIn(3).click();
  await expect(card.locator(".sub.blocked", { hasText: "Social sign-in" })).toContainText(
    "Not with SSO",
  );
  /* Member area: Copy hours waits for its hours */
  await card.locator('.pill[data-id="membership-area"]').click();
  await page.locator(".ab.primary").click();
  await expect(page.locator(".toast.is-warn")).toContainText("Add hours to Member area");
  await expect(card.locator(".sub", { hasText: "Member area" })).toHaveClass(/missing/);
  await card.locator("#hours-membership-area").fill("20");
  await page.keyboard.press("Enter");
  await card.locator("#hours-membership-area-design").fill("6");
  await page.keyboard.press("Enter");
  await expect(card.locator(".sub", { hasText: "Member area" })).not.toHaveClass(/missing/);
  const hash = await page.evaluate(() => location.hash);
  const [q, text] = withCatalog(fixtureCatalog, () => {
    const priced = quoteOf(hash);
    return [priced, hoursText(priced)] as const;
  });
  expect(q.selection.tiles).toMatchObject({
    membership: 3,
    "membership-groups": 3,
    "membership-area": 20,
    "membership-area-design": 6,
  });
  expect(q.selection.tiles).not.toHaveProperty("membership-social");
  await expect(page.locator(".big")).toContainText(formatHours(q.hours));
  expect(text).toContain("  - Memberships · SSO: ");
  expect(text).toContain("  - Access groups · 3 access groups: ");
  expect(text).toContain("  - Member area: 20h");
});

test("an item's total reads apart from its parts' hours: each figure labelled, larger, and the parts' figures lighter", async ({
  page,
}) => {
  await open(page);
  const style = (locator: ReturnType<Page["locator"]>) =>
    locator.first().evaluate((node) => {
      const { fontSize, fontWeight } = getComputedStyle(node);
      return { size: Number.parseFloat(fontSize), weight: Number(fontWeight) };
    });
  const totals = [
    { at: page.locator('.feat[data-key="blog-setups"] > .r'), label: /^Build\d+h$/ },
    { at: page.locator('details.fold[data-fold="fixed"] > summary'), label: /^Build\d+h$/ },
    { at: page.locator('details.fold[data-fold="project"] > summary'), label: /^Project\d+h$/ },
  ];
  const parts = [
    page.locator('.feat[data-key="blog-setups"] .subs .r'),
    page.locator('details.fold[data-fold="fixed"] .fold-body .r'),
    page.locator('details.fold[data-fold="project"] .fold-body .r'),
  ];
  for (const [index, { at, label }] of totals.entries()) {
    const figure = at.locator(":scope > .hrs.tot .hb");
    await expect(figure).toHaveText(label);
    const part = parts[index]?.locator(":scope > .hrs .hb") ?? figure;
    /* A part's figure has no label */
    await expect(part.first()).toHaveText(/^\d+h$/);
    const [whole, one] = [await style(figure), await style(part)];
    expect(whole.size).toBeGreaterThan(one.size);
    expect(whole.weight).toBeGreaterThan(one.weight);
  }
  await expect(page.locator('.feat[data-key="blog-setups"] > .r > .hrs.tot .hd')).toHaveText(
    /^Design\d+h$/,
  );
});

test("the site basics always have the kick-off, training and project management in a Project fold of their own, without design hours, their hours Project's", async ({
  page,
}) => {
  await open(page);
  const fold = page.locator('details.fold[data-fold="project"]');
  await expect(fold.locator("summary .tx b")).toHaveText("Project");
  /* Their hours in Project's colour, and Project on the title's line of the site basics */
  const colour = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((n) => getComputedStyle(n).color);
  expect(await colour('details.fold[data-fold="project"] summary .hrs .hb')).toBe(
    await colour(".lg .p b"),
  );
  const head = quoteOf(await page.evaluate(() => location.hash));
  await expect(page.locator(".basics .sh > .hrs.sum.p")).toHaveText(
    `Project${hoursLabel(stepHours(head, "basics", "project"))}`,
  );
  /* Open to start with, and closed it stays closed */
  await expect(fold).toHaveAttribute("open", "");
  await fold.locator("summary").click();
  await page.locator('[data-action="inc"][data-id="ai-feedback"]').click();
  await expect(fold).not.toHaveAttribute("open", "");
  await fold.locator("summary").click();
  await page.locator('[data-action="dec"][data-id="ai-feedback"]').click();
  await expect(fold).toHaveAttribute("open", "");
  const part = (name: string) =>
    fold.locator(".r.part", { has: page.locator(".tx > b", { hasText: new RegExp(`^${name}`) }) });
  const before = quoteOf(await page.evaluate(() => location.hash));
  const hoursOf = (q: Quote, id: string) => q.lines.find((line) => line.id === id)?.openHours ?? 0;
  await expect(part("Kick-off meeting").locator(".hrs")).toHaveText(
    hoursLabel(hoursOf(before, "kickoff")),
  );
  const sessions = before.selection.tiles.training ?? 0;
  await expect(part("Training").locator(`#qty-training`)).toHaveValue(String(sessions));
  await part("Training").locator('[data-action="inc"]').click();
  const q = quoteOf(await page.evaluate(() => location.hash));
  expect(q.selection.tiles.training).toBe(sessions + 1);
  await expect(part("Training").locator(".hrs")).toHaveText(hoursLabel(hoursOf(q, "training")));
  /* No design hours of their own */
  expect(q.lines.filter((line) => line.bucket === "design" && line.item === "kickoff")).toEqual([]);
  expect(q.lines.filter((line) => line.bucket === "design" && line.item === "training")).toEqual(
    [],
  );
  const management = q.lines.find((line) => line.id === "project-management");
  await expect(part("Project management").locator(".hrs")).toHaveText(
    hoursLabel(management?.openHours ?? 0),
  );
  await expect(part("Project management")).toContainText(management?.mode ?? "");
  const trigger = part("Project management").locator(".has-info");
  await trigger.hover();
  /* One share, whatever the design: no list of designs. Of design, build and content only */
  await expect(trigger.locator(".info-pop")).toContainText(
    `${formatHours(managementPercent())}% of its design, build and content hours`,
  );
  await expect(trigger.locator(".info-pop")).toContainText(
    "The kick-off and training are not counted",
  );
  await expect(trigger.locator(".info-pop")).toContainText(
    `With no design, also of ${formatHours(clientDesignPercent())}% of the design hours Custom would have`,
  );
  await expect(trigger.locator(".info-pop .info-list")).toHaveCount(0);
  /* With no design, the client's design counts too, a share of what Custom's would be */
  await page.locator("#design-no-design").check();
  const none = quoteOf(await page.evaluate(() => location.hash));
  const noneManagement = none.lines.find((line) => line.id === "project-management");
  expect(noneManagement?.mode).toContain("client design");
  await expect(part("Project management")).toContainText(noneManagement?.mode ?? "");
  await expect(part("Project management").locator(".hrs")).toHaveText(
    hoursLabel(noneManagement?.openHours ?? 0),
  );
});

test("Feedback and Variants say more about themselves while the pointer or the focus is on their name", async ({
  page,
}) => {
  await open(page);
  for (const [name, says] of [
    ["Feedback", "One round: the client reviews the design"],
    ["Variants", "of the AI design hours of this estimate, rounded up"],
  ] as const) {
    const trigger = page.locator(".has-info", { hasText: name });
    const card = trigger.locator(".info-pop");
    await expect(card).toBeHidden();
    await trigger.hover();
    await expect(card).toBeVisible();
    await expect(card).toContainText(says);
    await page.mouse.move(0, 0);
    await expect(card).toBeHidden();
    await trigger.focus();
    await expect(card).toBeVisible();
    await trigger.blur();
  }
  /* The rounds of each design, the chosen one first in weight */
  const feedback = page.locator(".has-info", { hasText: "Feedback" }).locator(".info-pop");
  await expect(feedback.locator(".info-list > span")).toHaveText(
    designChoices.flatMap((choice) => {
      if (!choice.feedbackId) return [];
      const rounds = getTile(choice.feedbackId);
      return [
        `${choice.label}${rounds.includedInBase} included, then ${rounds.build.custom}h each`,
      ];
    }),
  );
  await expect(feedback.locator(".is-on")).toContainText("AI generated");
});

test("hover sits on what you press: rows, cards and the shelf callout stay still, stepper signs and options light up", async ({
  page,
}) => {
  await open(page);
  const style = (sel: string, prop: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((n, p) => getComputedStyle(n).getPropertyValue(p), prop);
  const still = async (sel: string, prop: string, hoverSel = sel) => {
    const before = await style(sel, prop);
    await page.locator(hoverSel).first().hover();
    expect(await style(sel, prop), `${sel} ${prop}`).toBe(before);
  };
  await still(".basics .r:not(.dsel)", "background-color", ".basics .r:not(.dsel) .tx b");
  await still(".fold", "background-color", ".fold summary .tx b");
  await still(
    '.feat[data-key="blog-setups"]',
    "box-shadow",
    '.feat[data-key="blog-setups"] > .r .tx b',
  );
  await still(
    '.feat[data-key="blog-setups"] > .r .stepper',
    "background-color",
    '.feat[data-key="blog-setups"] > .r .tx b',
  );
  await still(".more", "background-color");
  await still(".more", "border-top-style");

  const inc = '.basics [data-action="inc"][data-id="templates"]';
  const rest = await style(inc, "background-color");
  await page.locator(inc).hover();
  expect(await style(inc, "background-color")).not.toBe(rest);

  /* The package and tier cards: a tint under the pointer, not an outline */
  const card = page.locator(".half.pkg");
  const restCard = await card.evaluate((n) => getComputedStyle(n).backgroundImage);
  await page.locator(".badge").hover();
  expect(restCard).toBe("none");
  expect(await card.evaluate((n) => getComputedStyle(n).backgroundImage)).toContain("gradient");
  expect(await card.evaluate((n) => getComputedStyle(n).boxShadow)).toBe("none");

  const advanced = '.feat[data-key="search"] .mode:not(.is-on)';
  const off = await style(advanced, "background-color");
  await page.locator(advanced).hover();
  expect(await style(advanced, "background-color")).not.toBe(off);
});

test("an item that arrives in the estimate gets no yellow wash, and the shelf callout does not animate", async ({
  page,
}) => {
  await open(page);
  await page.locator('.shelf .pill[data-id="landing-templates"]').click();
  await page.locator(".more").click();
  const washes = await page.evaluate(
    () =>
      document.getAnimations().filter((a) => {
        const frames = (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
        return frames.some((f) => "backgroundColor" in f || "background" in f || "boxShadow" in f);
      }).length,
  );
  expect(washes).toBe(0);
  await expect(page.locator(".shelf .pill").first()).toBeFocused();
});

test("the shelf's inner shadow is a layer above its rows, so hover fills, lines and stripes stay under it", async ({
  page,
}) => {
  await open(page);
  const layer = await page.evaluate(() => {
    const after = getComputedStyle(document.querySelector(".shelf")!, "::after");
    return {
      position: after.position,
      events: after.pointerEvents,
      z: Number(after.zIndex),
      shadow: after.boxShadow,
    };
  });
  expect(layer.position).toBe("absolute");
  expect(layer.events).toBe("none");
  expect(layer.z).toBeGreaterThan(0);
  expect(layer.shadow).toContain("inset");
  await expect(page.locator(".shelf > .s-scroll .s-row").first()).toBeVisible();
});

test("Complexity keeps Dynamic pages apart from Module based and Custom, and two-option controls stack", async ({
  page,
}) => {
  await open(page);
  await addFromShelf(page, "product-catalogue");
  const parts = page.locator(".complexity .cpart");
  await expect(parts).toHaveCount(3);
  await expect(parts.nth(0).locator(".mode")).toHaveText(["Module based"]);
  await expect(parts.nth(1).locator(".kicker")).toHaveText("Dynamic pages");
  await expect(parts.nth(1).locator(".mode")).toHaveText(["Simple", "Filtered", "Multi-level"]);
  await expect(parts.nth(2).locator(".mode")).toHaveText(["Custom"]);
  /* Content's figure sits level with its hours field */
  await addFromShelf(page, "content-hours");
  const [figure, field] = await Promise.all([
    page.locator('.feat[data-key="content-hours"] .hc').evaluate((n) => {
      const r = n.getBoundingClientRect();
      return (r.top + r.bottom) / 2;
    }),
    page.locator('.feat[data-key="content-hours"] .unit').evaluate((n) => {
      const r = n.getBoundingClientRect();
      return (r.top + r.bottom) / 2;
    }),
  ]);
  expect(Math.abs(figure - field)).toBeLessThanOrEqual(2);
  for (const size of [{ width: 1440, height: 900 }, LAPTOP]) {
    await page.setViewportSize(size);
    await settle(page);
    const bottoms = await parts.evaluateAll((nodes) =>
      nodes.map((n) => Math.round(n.getBoundingClientRect().bottom)),
    );
    expect(new Set(bottoms).size, `Complexity on one line at ${size.width}px`).toBe(1);
  }

  const direction = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((n) => getComputedStyle(n).flexDirection);
  expect(await direction('.feat[data-key="search"] .modes')).toBe("column");
  expect(await direction(".basics .r .modes")).toBe("column");
  expect(await direction(".choices")).toBe("row");
});

test("wider than 1440px the page stops at 1440, in the middle, on the dark ground, with rounded corners", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  const box = await page.locator(".page").boundingBox();
  expect(box?.width).toBe(1440);
  expect(box?.x).toBe(240);
  const [ground, outside] = await page.evaluate(() => {
    const probe = document.createElement("i");
    probe.style.color = "var(--outside)";
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return [getComputedStyle(document.body).backgroundColor, colour];
  });
  expect(ground).toBe(outside);
  const channels = (ground.match(/\d+/g) ?? []).slice(0, 3).map(Number);
  expect(Math.max(...channels)).toBeLessThan(64);
  const corners = () => page.locator(".page").evaluate((n) => getComputedStyle(n).borderRadius);
  expect(await corners()).toBe("10px");
  /* At 1440 the page fills the window, so its corners are square */
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await corners()).toBe("0px");
});

test("Copy hours waits while Content, Page migration or Blog import is in with no hours, and says where", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.evaluate(() => navigator.clipboard.writeText("before"));
  await addFromShelf(page, "content-hours");
  await addFromShelf(page, "migrate-pages");
  await page.locator(".ab.primary").click();
  await expect(page.locator(".toast.is-warn")).toHaveText(
    "Add hours to Content and Page migration, or take them out of the estimate, then copy.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("before");
  for (const id of ["content-hours", "migrate-pages"]) {
    const card = page.locator(`.feat[data-key="${id}"] .r.content`);
    await expect(card).toHaveClass(/missing/);
    await expect(card.locator(".warn")).toBeVisible();
    await expect(card.locator("input")).toHaveAttribute("aria-invalid", "true");
  }
  await expect(page.locator("#hours-content-hours")).toBeFocused();
  /* Hours in one, the other taken out: the warning goes, and Copy hours copies */
  await page.locator("#hours-content-hours").fill("8");
  await page.keyboard.press("Enter");
  await expect(page.locator('.feat[data-key="content-hours"] .r.content')).not.toHaveClass(
    /missing/,
  );
  await page.locator('.feat[data-key="migrate-pages"] .spine').click();
  await settle(page);
  await expect(page.locator(".toast.is-warn")).toHaveCount(0);
  await page.locator(".ab.primary").click();
  await expect(page.locator(".ab.primary .al")).toHaveText("Copied");
  const [copied, hash] = await page.evaluate(async () => [
    await navigator.clipboard.readText(),
    location.hash,
  ]);
  expect(copied).toBe(hoursText(quoteOf(hash)));
});

test("with more than one blog, the list and post templates and Recent blog posts each get a counter, up to one for each blog, and their hours count once for each", async ({
  page,
}) => {
  await page.goto(`/#${encodeSelection(selectionForShape("essential"))}`);
  await expect(page.locator('.shelf .pill[data-id="blog-setups"]')).toBeVisible({ timeout: 15000 });
  await addFromShelf(page, "blog-setups");
  const card = page.locator('.feat[data-key="blog-setups"]');
  const counter = (id: string) => card.locator(`.count-field:has(#qty-${id}-count)`);
  /* One blog: the counters keep their place, unseen */
  for (const id of ["blog-list", "blog-post"]) {
    await expect(counter(id)).toHaveClass(/reserved/);
    await expect(counter(id)).toBeHidden();
  }
  const blogs = page.locator('[data-action="inc"][data-id="blog-setups"]');
  await blogs.click();
  await blogs.click();
  for (const id of ["blog-list", "blog-post"]) await expect(counter(id)).toBeVisible();
  /* Both count templates: a screen reader hears whose they are */
  await expect(card.getByRole("spinbutton", { name: "templates (List template)" })).toBeVisible();
  await expect(card.getByRole("button", { name: "More templates (Post template)" })).toBeVisible();
  await expect(card.locator(":scope > .r .tx small")).toContainText(
    "3 blogs, sharing a list and a post template",
  );
  const more = page.locator('[data-action="inc"][data-id="blog-list-count"]');
  await more.click();
  await more.click();
  await expect(page.locator("#qty-blog-list-count")).toHaveValue("3");
  /* Never more than the blogs */
  await expect(more).toBeDisabled();
  await expect(card.locator(":scope > .r .tx small")).toContainText(
    "3 blogs, 3 list and 1 post templates",
  );
  const q = quoteOf(await page.evaluate(() => location.hash));
  expect(q.selection.tiles["blog-list-count"]).toBe(3);
  const list = q.lines.find((line) => line.id === "blog-list");
  await expect(card.locator(".r", { hasText: "List template" }).locator(".hrs .hb")).toHaveText(
    hoursLabel(list?.openHours ?? 0),
  );
  expect(list?.openHours).toBe(
    3 *
      (quote(setQuantity(q.selection, "blog-list-count", 1)).lines.find(
        (line) => line.id === "blog-list",
      )?.openHours ?? 0),
  );
  /* Recent blog posts, while it is live in the files: a counter of versions once it is in, and a
     note that says what a version is */
  const recent = getTile("blog-recent");
  if (!recent.disabled && !recent.hidden) {
    const row = card.locator(".sub", {
      has: page.locator(".tx > b", { hasText: /^Recent blog posts/ }),
    });
    await expect(counter("blog-recent")).toBeHidden();
    await row.locator('.pill[data-id="blog-recent"]').click();
    await expect(counter("blog-recent")).toBeVisible();
    await expect(counter("blog-recent").locator(".kick")).toHaveText("Versions");
    await expect(row.locator(".tx small .stack > :not(.off)")).toHaveText(
      `${recent.summary}. Several blogs, each with its own design? One version for each`,
    );
    await page.locator('[data-action="inc"][data-id="blog-recent-count"]').click();
    const counted = quoteOf(await page.evaluate(() => location.hash));
    expect(counted.selection.tiles["blog-recent-count"]).toBe(2);
    await expect(row.locator(".hrs .hb")).toHaveText(
      hoursLabel(counted.lines.find((line) => line.id === "blog-recent")?.openHours ?? 0),
    );
  }
  /* Back to one blog: shared again */
  const fewer = page.locator('[data-action="dec"][data-id="blog-setups"]');
  await fewer.click();
  await fewer.click();
  await expect(counter("blog-list")).toBeHidden();
  await expect(counter("blog-recent")).toBeHidden();
  const one = quoteOf(await page.evaluate(() => location.hash));
  expect(one.selection.tiles).not.toHaveProperty("blog-list-count");
  expect(one.selection.tiles).not.toHaveProperty("blog-recent-count");
});

test("Copy hours waits while the Product catalogue's Custom option has no hours, and says where", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.evaluate(() => navigator.clipboard.writeText("before"));
  await addFromShelf(page, "product-catalogue");
  const custom =
    (getTile("product-catalogue").modes ?? []).findIndex((mode) => mode.customHours) + 1;
  const other = custom === 1 ? 2 : 1;
  const option = (level: number) =>
    page.locator(`[data-action="mode"][data-id="product-catalogue"][data-qty="${level}"]`);
  await option(custom).click();
  const complexity = page.locator('.feat[data-key="product-catalogue"] .r', {
    has: page.locator(".tx > b", { hasText: /^Complexity$/ }),
  });
  const field = page.locator("#hours-catalogue-custom");
  await page.locator(".ab.primary").click();
  await expect(page.locator(".toast.is-warn")).toHaveText(
    "Add hours to the Product catalogue's Custom option, or take it out of the estimate, then copy.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("before");
  await expect(complexity).toHaveClass(/missing/);
  await expect(complexity.locator(".warn")).toHaveText("Add hours, or choose another option");
  await expect(complexity.locator(".warn")).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toBeFocused();
  /* Another option clears it, and so do hours */
  await option(other).click();
  await expect(page.locator(".toast.is-warn")).toHaveCount(0);
  await expect(complexity).not.toHaveClass(/missing/);
  await option(custom).click();
  await page.locator(".ab.primary").click();
  await expect(complexity).toHaveClass(/missing/);
  await field.fill("30");
  await page.keyboard.press("Enter");
  await expect(complexity).not.toHaveClass(/missing/);
  await page.locator(".ab.primary").click();
  await expect(page.locator(".ab.primary .al")).toHaveText("Copied");
  const [copied, hash] = await page.evaluate(async () => [
    await navigator.clipboard.readText(),
    location.hash,
  ]);
  expect(copied).toBe(hoursText(quoteOf(hash)));
  expect(copied).toContain("30h");
});

test("every corner is in the family of the number fields: 6px outside, 4px inside", async ({
  page,
}) => {
  await open(page);
  const corners = await page.evaluate(() =>
    [
      ".shelf .pill",
      ".feat .spine .mk",
      ".side .ab.primary",
      ".badge .half",
      ".stepper",
      ".feat",
    ].map((selector) => {
      const node = document.querySelector(selector);
      return node ? getComputedStyle(node).borderTopLeftRadius : null;
    }),
  );
  expect(corners).toEqual(["6px", "4px", "6px", "6px", "6px", "6px"]);
});

test("Hours breakdown waits, as Copy hours does, while an item whose hours you enter is in with none", async ({
  page,
}) => {
  await open(page);
  await addFromShelf(page, "migrate-posts");
  const breakdown = page.locator('button[aria-label="Hours breakdown"]');
  await breakdown.click();
  await expect(page.locator(".pop-panel:popover-open")).toHaveCount(0);
  await expect(page.locator(".toast.is-warn")).toHaveText(
    "Add hours to Blog import, or take it out of the estimate, then open the breakdown.",
  );
  await expect(page.locator('.feat[data-key="migrate-posts"] .r.content')).toHaveClass(/missing/);
  await expect(page.locator("#hours-migrate-posts")).toBeFocused();
  await page.locator("#hours-migrate-posts").fill("6");
  await page.keyboard.press("Enter");
  await expect(page.locator(".toast.is-warn")).toHaveCount(0);
  await breakdown.click();
  const panel = page.locator(".pop-panel:popover-open");
  await expect(panel).toContainText("Blog import");
  await expect(panel.locator(".line-head")).toContainText(["Content"]);
});
