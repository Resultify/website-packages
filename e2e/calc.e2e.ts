/* The short link and the calculations page, in a browser. Expected hours come from the app's own
   logic, run here in Node. The calculations page is served the frozen files of test/fixtures as the
   files on disk and in the last commit, so a change made on the page changes none of the numbers
   here. Save is caught before it reaches the server, so the tests never write the files in src/. */
import { expect, type Page, type Route, test } from "@playwright/test";
import {
  buildCatalog,
  designChoices,
  getTile,
  startingDesign,
  tileMode,
  withCatalog,
} from "../src/catalog.ts";
import { hoursLabel } from "../src/controls.ts";
import {
  decodeSelection,
  encodeSelection,
  formatHours,
  type Quote,
  quote,
  type Selection,
  selectionForShape,
  setQuantity,
  setSource,
  setTile,
} from "../src/quote.ts";
import {
  applyCells,
  type Cells,
  parseRules,
  parseTable,
  type Rules,
  serializeTable,
} from "../src/table.ts";
import { codes, fixtureCatalog, fixtureText, rows, rules } from "../test/fixture.ts";

/* Landing templates, custom system templates and 50h of content on the starting estimate, with AI
   generated design */
const EXAMPLE = "-FMRqQVcGc";
/** The starting estimate, as the estimator writes it with the frozen files: Nimbly design. Made
    with those files, not src/, as the page here is served them */
const START = withCatalog(fixtureCatalog, () => encodeSelection(selectionForShape("essential")));
/** The rows of estimates on the right of the calculations page: the starting estimate, then with
    Blog and Search, then with the Product catalogue too, each with every design that has design
    hours. */
const setups = [
  ["Starting estimate", []],
  ["Blog and Search", ["blog-setups", "search"]],
  ["Blog, Search and Products", ["blog-setups", "search", "product-catalogue"]],
] as const;
const ownEstimate = (
  [setup, adds]: (typeof setups)[number],
  choice: (typeof designChoices)[number],
) => ({
  name: `${setup} · ${choice.label}`,
  code: withCatalog(fixtureCatalog, () =>
    encodeSelection(
      adds.reduce(
        (selection, id) => setTile(selection, id, true),
        setTile(selectionForShape("essential"), choice.id, true),
      ),
    ),
  ),
});
const STARTING = ownEstimate(setups[0], startingDesign).name;
/* Sections with AI design: 5h each becomes 6h */
const CHANGE: Cells = { "sections build-ai": "6" };

const tableText = fixtureText.table;
const rulesText = fixtureText.rules;
const codesText = fixtureText.codes;
function priced(code: string, cells: Cells = {}, changed: Partial<Rules> = {}): Quote {
  return withCatalog(buildCatalog(applyCells(rows, cells), { ...rules, ...changed }, codes), () =>
    quote(decodeSelection(code) as Selection),
  );
}

type Sent = { table: string; rules: string };
const committed = { table: tableText, rules: rulesText };

/** The files as the server gives them: as they are on disk, and as the last commit has them. */
async function serveTable(page: Page, onSave?: (sent: Sent, route: Route) => Promise<void>) {
  await page.route("**/calc/api/table", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: { saved: { ...committed, codes: codesText }, committed },
      });
      return;
    }
    const body = route.request().postDataJSON() as Sent;
    if (onSave) await onSave(body, route);
    else await route.fulfill({ json: { saved: { ...body, codes: codesText }, committed } });
  });
}
const savedAs = (sent: Sent) => ({ json: { saved: { ...sent, codes: codesText }, committed } });
async function openCalc(page: Page, code = EXAMPLE) {
  await page.goto(`/calc/#${code}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".c-main tbody tr").first()).toBeVisible({ timeout: 15000 });
}
async function setCell(page: Page, key: string, value: string) {
  const field = page.locator(`input[data-cell="${key}"]`);
  await field.fill(value);
  await field.press("Enter");
}
async function setRule(page: Page, name: string, value: string) {
  const field = page.locator(`input[data-rule="${name}"]`);
  await field.fill(value);
  await field.press("Enter");
}
/** An estimate on the right: its cell, and when it is the one chosen, its hours by kind under the
    grid. */
const estimate = (page: Page, name: string) => page.locator(`.c-right [data-estimate="${name}"]`);
const figure = (page: Page, name: string, which: string) =>
  estimate(page, name).locator(`[data-figure="${which}"]`);
const total = (page: Page) => page.locator(".big").evaluate((node) => node.firstChild?.textContent);

test("the estimator's address is the short code, and an address from before it opens the starting estimate", async ({
  page,
}) => {
  /* The estimator has the files in src/: its starting estimate is theirs */
  const start = encodeSelection(selectionForShape("essential"));
  await page.goto("/");
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => location.hash)).toBe(`#${start}`);

  await page.goto("about:blank");
  await page.goto("/#s=cms-react&w=25&b=same&t=templates.9,sections.20");
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => location.hash)).toBe(`#${start}`);
  /* The estimator prices with the files in src/ */
  const live = (code: string) => formatHours(quote(decodeSelection(code) as Selection).hours);
  expect(await total(page)).toBe(live(start));

  await page.goto("about:blank");
  await page.goto(`/#${EXAMPLE}`);
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(await total(page)).toBe(live(EXAMPLE));
});

test("the calculations page reads the files from the server and prices the link's estimate and its examples", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await serveTable(page);
  await openCalc(page);
  const own = estimate(page, "From your link");
  await expect(own.locator('[data-figure="committed"]')).toHaveText(
    hoursLabel(priced(EXAMPLE).hours),
  );
  await expect(own.locator('[data-figure="table"]')).toHaveCount(0);
  await expect(figure(page, STARTING, "committed")).toHaveText(hoursLabel(priced(START).hours));
  await expect(page.locator(".c-status")).toContainText("No changes since the last commit");
  /* The table is laid out as the estimator is, and its type says where hours count: no Content
     place of its own */
  await expect(page.locator(".c-main .c-group")).toHaveText([
    /Site basics/,
    /Shelf/,
    /Blog/,
    /Product catalogue/,
    /Memberships/,
  ]);
  await expect(page.locator("[data-act=save]")).toBeDisabled();
  await expect(page.locator(".is-changed")).toHaveCount(0);
  /* No link codes on the page, and no Website pages row */
  await expect(page.locator(".c-main")).not.toContainText("Website pages");
  /* Every hour of the estimate sits on its rows: the two columns add up to its total */
  const sums = await page.evaluate(() => {
    const figure = (cell: Element | null) => Number.parseFloat(cell?.textContent || "0") || 0;
    let hours = 0;
    let design = 0;
    for (const line of document.querySelectorAll(".c-main tbody tr:not(.c-group)")) {
      /* In it, then Design and Build, as everywhere */
      const cells = line.querySelectorAll(".c-own");
      design += figure(cells[1] ?? null);
      hours += figure(cells[2] ?? null);
    }
    return { hours, design };
  });
  const want = priced(EXAMPLE);
  /* Extra variants and feedback rounds are in the Design panel, not on a row */
  expect(sums.design).toBe(want.designHours);
  expect(sums.hours + sums.design).toBe(want.hours);
  expect(errors).toEqual([]);
});

test("a changed cell is compared with the last commit, stays through a reload, and Save sends the files", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page);
  await setCell(page, "sections build-ai", "6");
  const want = priced(EXAMPLE, CHANGE);
  const own = estimate(page, "From your link");
  await expect(page.locator(".c-status")).toContainText(
    "1 change from the last commit, 1 edit not saved yet",
  );
  /* The hours with this page's files, and the last commit's when pointing at them */
  await expect(own.locator('[data-figure="table"]')).toHaveText(hoursLabel(want.hours));
  await expect(own.locator('[data-figure="table"] .is-changed')).toHaveAttribute(
    "title",
    `Last commit: ${hoursLabel(priced(EXAMPLE).hours)}`,
  );
  /* 8 sections, 1h more each, and project management's share of them */
  await expect(own.locator('[data-figure="change"]')).toHaveText(
    `+${hoursLabel(want.hours - priced(EXAMPLE).hours)}`,
  );
  expect(want.hours - priced(EXAMPLE).hours).toBe(8 + 1);
  await expect(own.locator('[data-figure="build"]')).toHaveText(
    hoursLabel(want.implementationHours),
  );
  await expect(page.locator(".c-changes li")).toContainText("Sections");
  await expect(page.locator(".c-changes li")).toContainText("Build hours with AI generated design");
  await expect(page.locator(".c-changes li .c-fromto")).toContainText(/5\s*→\s*6/);
  await expect(page.locator(".c-changes li")).toContainText("not saved");
  const cell = page.locator('input[data-cell="sections build-ai"]');
  await expect(cell).toHaveClass(/is-changed/);
  await expect(cell).toHaveClass(/is-unsaved/);

  await page.reload();
  await expect(cell).toHaveValue("6");
  await expect(own.locator('[data-figure="table"]')).toHaveText(hoursLabel(want.hours));

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toContainText("Saved");
  expect(sent.table).toBe(serializeTable(applyCells(rows, CHANGE)));
  expect(sent.rules).toBe(rulesText);
  /* One cell changed: one line of the file differs */
  const before = tableText.split("\n");
  expect(sent.table.split("\n").filter((line, index) => line !== before[index])).toHaveLength(1);
  /* Saved, and still a change from the last commit */
  await expect(page.locator(".c-status")).toContainText("1 change from the last commit, all saved");
  await expect(cell).not.toHaveClass(/is-unsaved/);
  await expect(page.locator("[data-act=save]")).toBeDisabled();
});

test("the Design, Project and Languages panels change the rules, and Save sends them", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page, START);
  const design = page.locator('.c-card[aria-label="Design"]');
  const languages = page.locator('.c-card[aria-label="Languages"]');
  await expect(design).toContainText("Feedback rounds");
  await expect(design).toContainText("Variants");
  /* One column for each design choice, named as the estimator names it */
  await expect(design.locator("thead th")).toHaveText(["AI", "Nimbly", "Custom"]);
  await expect(design.locator('input[data-rule="nimbly-feedback-included"]')).toHaveValue("1");
  await expect(design.locator('input[data-rule="custom-feedback-included"]')).toHaveValue("1");
  /* Project management: one share, in the Project panel, not one for each design */
  await expect(design.locator('input[data-rule$="pm-percent"]')).toHaveCount(0);
  await expect(
    page.locator('.c-card[aria-label="Project"] input[data-rule="pm-percent"]'),
  ).toHaveValue(rules["pm-percent"]);
  /* The table: each design choice's design and build hours side by side */
  await expect(page.locator(".c-heads .c-span.is-choice")).toHaveText(["AI", "Nimbly", "Custom"]);
  await expect(page.locator(".c-heads2 th")).toHaveText([
    ...["Design", "Build", "Design", "Build", "Design", "Build"],
    ...["Package", "Tier", "In it", "Design", "Build"],
  ]);
  await expect(languages).toContainText("The 2nd");
  await expect(languages.locator('input[data-rule="languages-second"]')).toHaveValue("14");

  await setRule(page, "ai-variant-percent", "100");
  await setRule(page, "languages-growth-from", "3");
  await setRule(page, "pm-percent", "10");
  await expect(page.locator(".c-changes")).toContainText("each extra, % of AI design");
  await expect(page.locator(".c-changes")).toContainText("Project management");
  await expect(page.locator(".c-changes")).toContainText("Growth from");
  await expect(page.locator('input[data-rule="languages-growth-from"]')).toHaveClass(/is-changed/);
  const want = priced(
    START,
    {},
    { "ai-variant-percent": "100", "languages-growth-from": "3", "pm-percent": "10" },
  );
  await expect(figure(page, STARTING, "table")).toHaveText(hoursLabel(want.hours));

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  expect(parseRules(sent.rules)["ai-variant-percent"]).toBe("100");
  expect(parseRules(sent.rules)["languages-growth-from"]).toBe("3");
  expect(parseRules(sent.rules)["pm-percent"]).toBe("10");
  expect(sent.table).toBe(tableText);
});

test("status, type, package and tier are pick-lists: Hidden takes an item or an option out, Content moves hours to content, and a package from a quantity is written as such", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page);
  /* The basics and the Blog's templates have no status of their own, their options do; a part
     added on its own has its own */
  await expect(page.locator('select[data-cell="sections status"]')).toHaveCount(0);
  await expect(page.locator('select[data-cell="menu·Advanced status"]')).toHaveValue("");
  await expect(page.locator('select[data-cell="blog-list status"]')).toHaveCount(0);
  await expect(page.locator('select[data-cell="blog-list·Simple status"]')).toHaveValue("");
  await expect(page.locator('select[data-cell="membership-groups status"]')).toHaveCount(0);
  for (const part of [
    "blog-recent",
    "favorite-products",
    "related-products",
    "membership-social",
    "membership-area",
  ]) {
    await expect(page.locator(`select[data-cell="${part} status"] option`)).toHaveText([
      "Live",
      "Soon",
      "Hidden",
    ]);
  }
  await page.locator('select[data-cell="system status"]').selectOption("hidden");
  const own = estimate(page, "From your link");
  /* The link had Custom system templates: without them it is 6h of build and 1h of design less,
     and 2h less of project management (15% of 140h, 21h, not of 147h, 23h) */
  const fewer = priced(EXAMPLE).hours - priced(EXAMPLE, { "system status": "hidden" }).hours;
  expect(fewer).toBe(9);
  await expect(own.locator('[data-figure="change"]')).toHaveText(`−${fewer}h`);
  await expect(page.locator(".c-changes .c-fromto")).toContainText(/Live\s*→\s*Hidden/);
  /* Landing templates as content: the same hours, counted as content */
  const build = Number.parseFloat((await own.locator('[data-figure="build"]').textContent()) ?? "");
  await page.locator('select[data-type="landing-templates"]').selectOption("content");
  await expect(own.locator('[data-figure="content"]')).toContainText("53h");
  await expect(own.locator('[data-figure="build"]')).toContainText(`${build - 3}h`);
  /* An option coming soon cannot be chosen */
  await page.locator('select[data-cell="search·Advanced status"]').selectOption("soon");

  const growth = page.locator('select[data-need="landing-templates package"]');
  await expect(growth).toHaveValue("growth");
  const from = page.locator('input[data-need="landing-templates package"][data-part="from"]');
  await expect(from).toHaveValue("3");
  await from.fill("5");
  await from.press("Enter");
  await page.locator('select[data-need="hubdb tier"]').selectOption("enterprise");

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  const saved = parseTable(sent.table);
  const of = (id: string) => saved.find((row) => row.id === id);
  expect(of("system")?.status).toBe("hidden");
  expect(of("landing-templates")?.type).toBe("content");
  expect(saved.find((row) => row.id === "search" && row.option === "Advanced")?.status).toBe(
    "soon",
  );
  expect(of("landing-templates")?.package).toBe("growth from 5");
  expect(of("hubdb")?.tier).toBe("enterprise");
});

test("Undo goes back to the last commit's value, and Discard drops all that was not saved, in one click", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page);
  await setCell(page, "sections build-ai", "6");
  await page.locator(".c-changes button", { hasText: "Undo" }).click();
  await expect(page.locator('input[data-cell="sections build-ai"]')).toHaveValue("5");
  await expect(page.locator(".is-changed")).toHaveCount(0);

  await setCell(page, "templates build-ai", "3");
  await setRule(page, "ai-feedback-each", "4");
  await expect(page.locator("[data-act=reset]")).toHaveText("Discard");
  await page.locator("[data-act=reset]").click();
  await expect(page.locator(".c-changes li")).toHaveCount(0);
  await expect(page.locator("[data-act=reset]")).toHaveCount(0);
  await expect(page.locator('input[data-cell="templates build-ai"]')).toHaveValue("2");
  await expect(page.locator('input[data-rule="ai-feedback-each"]')).toHaveValue("3");
  expect(await page.evaluate(() => sessionStorage.getItem("website-packages.unsaved"))).toBeNull();
});

test("a cell the files cannot take says which row and why, and Save waits; a refused save says why", async ({
  page,
}) => {
  await serveTable(page, async (_body, route) => {
    await route.fulfill({ status: 422, json: { error: "Checked on the server" } });
  });
  await openCalc(page);
  await setCell(page, "sections build-ai", "many");
  await expect(page.locator('.c-status [role="alert"]')).toContainText(
    "Sections: build-ai must be a number",
  );
  await expect(page.locator("[data-act=save]")).toBeDisabled();
  await setCell(page, "sections build-ai", "6");
  await expect(page.locator('.c-status [role="alert"]')).toHaveCount(0);
  await page.locator("[data-act=save]").click();
  await expect(page.locator('.c-status [role="alert"]')).toContainText(
    "Not saved. Checked on the server",
  );
  await expect(page.locator('input[data-cell="sections build-ai"]')).toHaveClass(/is-unsaved/);
});

test("choosing an estimate fills the table's last columns with it, and a pasted link is priced too", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page, START);
  const products = ownEstimate(setups[2], startingDesign);
  await estimate(page, products.name).locator("input").check();
  await expect(page.locator(".c-main tfoot th")).toContainText(
    `${products.name}: ${hoursLabel(priced(products.code).hours)}`,
  );
  /* The catalogue at the option it starts with */
  const option = withCatalog(fixtureCatalog, () => {
    const catalogue = getTile("product-catalogue");
    const mode = tileMode(catalogue, catalogue.initial);
    return mode?.group ? `${mode.group}: ${mode.label}` : (mode?.label ?? "");
  });
  await expect(
    page
      .locator(".c-main tr", { has: page.locator(`input[value="${option}"]`) })
      .locator(".c-own")
      .first(),
  ).toHaveText("in");

  await page.locator("#c-link").fill("not a link");
  await page.locator(".c-load button").click();
  await expect(page.locator('.c-load [role="alert"]')).toContainText(
    "not a link from the estimator",
  );

  await page.locator("#c-link").fill(`https://example.com/#${EXAMPLE}`);
  await page.locator(".c-load button").click();
  await expect(figure(page, "From your link", "committed")).toHaveText(
    hoursLabel(priced(EXAMPLE).hours),
  );
  expect(await page.evaluate(() => location.hash)).toBe(`#${EXAMPLE}`);
});

test("the estimates are a grid: the starting estimate, then with Blog and Search, then with Products too, each with every design; all in sight, and a link to one of them picks it", async ({
  page,
}) => {
  await serveTable(page);
  /* Each design that has design hours, in the estimator's order */
  const designs = designChoices.filter((choice) => choice.kind !== "none");
  const want = setups.flatMap((setup) => designs.map((choice) => ownEstimate(setup, choice)));
  expect(want).toHaveLength(9);
  await openCalc(page, want[4]?.code);
  /* Its own link is one of the estimates already, so it has no From your link of its own */
  await expect(page.locator(".c-est-item")).toHaveCount(want.length);
  expect(
    await page
      .locator(".c-est-item")
      .evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.estimate)),
  ).toEqual(want.map((item) => item.name));
  await expect(page.locator(".c-est-col")).toHaveText(["AI", "Nimbly", "Custom"]);
  await expect(page.locator(".c-est-row")).toHaveText([
    "Starting estimate",
    "+ Blog and Search",
    "+ Products",
  ]);
  await expect(estimate(page, want[4]?.name ?? "").locator("input")).toBeChecked();
  for (const item of want) {
    await expect(figure(page, item.name, "committed")).toHaveText(
      hoursLabel(priced(item.code).hours),
    );
  }
  /* All nine, the chosen one's hours and the field for another link, with no scrolling */
  expect(
    await page.locator(".c-right").evaluate((node) => node.scrollHeight <= node.clientHeight),
  ).toBe(true);

  /* With no link, the starting estimate with the starting design, as the estimator starts */
  await page.goto("about:blank");
  await page.goto("/calc/", { waitUntil: "domcontentloaded" });
  await expect(estimate(page, STARTING).locator("input")).toBeChecked();
});

test("the server refuses a save that does not come from the calculations page", async ({
  request,
}) => {
  const response = await request.post("/calc/api/table", {
    data: { table: "id\n", rules: "rule,value\n" },
    headers: { origin: "https://example.com" },
  });
  expect(response.status()).toBe(403);
});

test("changes on the left, the table in the middle, estimates on the right: the window holds all three, and the table's headings and total stay in sight", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page);
  const box = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      });
  const [left, middle, right] = [
    await box(".c-left"),
    await box(".c-middle"),
    await box(".c-right"),
  ];
  expect(left.right).toBeLessThan(middle.left);
  expect(middle.right).toBeLessThan(right.left);
  await expect(page.locator(".c-left")).toContainText("Changes");
  await expect(page.locator(".c-right")).toContainText("Estimates");
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );

  const headTop = (await box(".c-main thead th")).top;
  await page.locator(".c-scroll").evaluate((node) => node.scrollTo(400, 2000));
  expect((await box(".c-main thead th")).top).toBe(headTop);
  expect((await box(".c-main tfoot th")).bottom).toBeLessThanOrEqual(
    (await box(".c-scroll")).bottom,
  );
  /* Sideways, the item stays at the table's left edge */
  expect((await box(".c-main tbody .c-item")).left).toBe((await box(".c-scroll")).left);
});

test("an item added on the page goes to the shelf, gets a link code on Save, and one no commit has can be removed", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page);
  const add = page.locator("form.c-add");
  await add.locator("button[type=submit]").click();
  await expect(add.locator('[role="alert"]')).toHaveText("Give the item a name.");

  await add.locator("input[name=label]").fill("Event calendar");
  /* What it counts is asked for once its hours are for each one */
  await expect(add.locator("input[name=unit]")).toHaveCount(0);
  await add.locator("label:has(input[name=hours][value=unit])").click();
  await add.locator("button[type=submit]").click();
  await expect(add.locator('[role="alert"]')).toHaveText("Say what it counts, such as calendars.");
  await add.locator("input[name=unit]").fill("calendars");
  await add.locator("button[type=submit]").click();
  /* The new row is last on the shelf, and its name has the focus */
  await expect(page.locator('input[data-cell="event-calendar item"]')).toBeFocused();
  await expect(page.locator(".c-changes")).toContainText("Event calendarNew on the shelf");
  await expect(page.locator(".c-status")).toContainText("1 edit not saved yet");

  await setCell(page, "event-calendar build-ai", "4");
  await page.reload();
  await expect(page.locator('input[data-cell="event-calendar build-ai"]')).toHaveValue("4");

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  const saved = parseTable(sent.table);
  const at = saved.findIndex((row) => row.id === "event-calendar");
  expect(saved[at]).toMatchObject({
    item: "Event calendar",
    place: "shelf",
    type: "",
    status: "",
    unit: "calendars",
    start: "1",
    max: "10",
    "build-ai": "4",
    note: "",
  });
  /* After the shelf's last item */
  expect(saved[at - 1]?.place).toBe("shelf");
  expect(saved[at + 1]?.place).not.toBe("shelf");
  await expect(page.locator(".c-status")).toContainText("all saved");

  /* Saved, not committed: no link has its code yet, so it can go */
  await page.locator(".c-changes [data-act=drop]").click();
  await expect(page.locator('input[data-cell="event-calendar build-ai"]')).toHaveCount(0);
  await expect(page.locator(".c-status")).toContainText("1 edit not saved yet");
  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  expect(sent.table).toBe(tableText);
});

test("an item of content with its hours entered in the estimate goes to the shelf as Content, with an empty hours field", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page);
  const add = page.locator("form.c-add");
  await add.locator("input[name=label]").fill("Copywriting");
  await add.locator("label:has(input[name=type][value=content])").click();
  await add.locator("label:has(input[name=hours][value=entered])").click();
  await add.locator("button[type=submit]").click();
  const row = page.locator(".c-main tr", {
    has: page.locator('input[data-cell="copywriting item"]'),
  });
  await expect(row).toContainText("Entered in the estimate");
  await expect(row.locator('select[data-type="copywriting"]')).toHaveValue("content");
  /* Its hours come from the estimate: no hour cells, only the most that can be entered */
  await expect(row.locator('input[data-cell^="copywriting build"]')).toHaveCount(0);
  await expect(row.locator('input[data-cell="copywriting max"]')).toHaveValue("400");
  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  const saved = parseTable(sent.table);
  expect(saved.find((item) => item.id === "copywriting")).toMatchObject({
    place: "shelf",
    type: "content",
    unit: "hours",
    start: "0",
    max: "400",
  });
  const at = saved.findIndex((item) => item.id === "copywriting");
  expect(saved[at + 1]?.id).toBe("blog-setups");
});

test("an item can take its build and design hours from the estimate; project management is a row of the site basics", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page);
  /* Project management: always in, Project, one share in the Project panel, its hours in the
     estimate's */
  const management = page.locator(".c-main tr.is-rule");
  await expect(management).toContainText("Project management");
  await expect(management).toContainText("Always in");
  await expect(management.locator(".c-type")).toHaveText("Project");
  await expect(management).toContainText(`${rules["pm-percent"]}%, whatever the design`);
  const hours = priced(EXAMPLE).lines.find((line) => line.id === "project-management");
  await expect(management.locator(".c-own").nth(2)).toHaveText(hoursLabel(hours?.openHours ?? 0));
  /* Custom integration: both entered */
  const integration = page.locator(".c-main tr", {
    has: page.locator('input[data-cell="custom-integration item"]'),
  });
  await expect(integration).toContainText("Build and design entered in the estimate");
  /* A new one */
  const add = page.locator("form.c-add");
  await add.locator("input[name=label]").fill("Payment gateway");
  await expect(add.locator("input[name=design]")).toHaveCount(0);
  await add.locator("label:has(input[name=hours][value=entered])").click();
  await add.locator("input[name=design]").check();
  await add.locator("button[type=submit]").click();
  const row = page.locator(".c-main tr", {
    has: page.locator('input[data-cell="payment-gateway item"]'),
  });
  await expect(row).toContainText("Build and design entered in the estimate");
  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  expect(parseTable(sent.table).find((item) => item.id === "payment-gateway")).toMatchObject({
    type: "",
    unit: "build and design hours",
    start: "0",
    max: "400",
  });
});

test("Preview opens the estimator with this page's files, unsaved, and follows the changes made here; the estimator keeps the saved ones", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page, START);
  await setCell(page, "sections build-nimbly", "5");
  const [preview] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator("[data-act=preview]").click(),
  ]);
  await expect(preview.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(new URL(preview.url()).search).toBe("?preview");
  await expect(preview.locator(".preview-bar")).toContainText("Nothing here is saved");
  /* Priced with this page's files: Sections at 5h each */
  const want = priced(START, { "sections build-nimbly": "5" });
  const total = () => preview.locator(".big").evaluate((node) => node.firstChild?.textContent);
  expect(await total()).toBe(formatHours(want.hours));
  expect(want.hours).not.toBe(priced(START).hours);
  /* An item added here is on the preview's shelf, at once */
  const add = page.locator("form.c-add");
  await add.locator("input[name=label]").fill("Event calendar");
  await add.locator("button[type=submit]").click();
  await expect(preview.locator('.shelf .pill[data-id="event-calendar"]')).toBeVisible();
  /* Nothing was saved: the estimator itself has the saved files */
  await preview.locator(".preview-bar a", { hasText: "Close preview" }).click();
  await expect(preview.locator(".preview-bar")).toHaveCount(0);
  await expect(preview.locator('.shelf .pill[data-id="event-calendar"]')).toHaveCount(0);
  const live = quote(decodeSelection(START) as Selection);
  expect(await total()).toBe(formatHours(live.hours));
});

test("a change to what an estimate starts with shows in the starting estimates and in the preview, which follows it; the preview has no Share link", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page, START);
  const menuStart = (option: string) =>
    page.locator(`input[data-start="menu"][value="menu·${option}"]`);
  await menuStart("Advanced").check();
  /* The starting estimates start with the advanced menu now */
  const advanced = { "menu·Simple start": "", "menu·Advanced start": "1" };
  const was = priced(START);
  const now = withCatalog(buildCatalog(applyCells(rows, advanced), rules, codes), () =>
    quote(selectionForShape("essential")),
  );
  expect(now.hours).toBeGreaterThan(was.hours);
  await expect(figure(page, STARTING, "table")).toHaveText(hoursLabel(now.hours));
  /* The left column holds its head, however many buttons it has */
  for (const side of await page
    .locator(".c-side")
    .evaluateAll((nodes) => nodes.map((node) => [node.scrollWidth, node.clientWidth]))) {
    expect(side[0]).toBeLessThanOrEqual(side[1] ?? 0);
  }
  const [preview] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator("[data-act=preview]").click(),
  ]);
  const menu = preview.locator('[data-action="mode"][data-id="menu"].is-on');
  await expect(menu).toHaveText("Advanced");
  await expect(preview.locator(".big")).toContainText(formatHours(now.hours));
  await expect(preview.locator('button[aria-label="Share link"]')).toBeDisabled();
  /* Back to Simple here: the preview follows */
  await menuStart("Simple").check();
  await expect(page.locator(".c-changes li")).toHaveCount(0);
  await expect(menu).toHaveText("Simple");
  await expect(preview.locator(".big")).toContainText(formatHours(was.hours));
});

test("a source of products made live here can be chosen in the preview, keeping the catalogue's option; a part set to Soon is locked there, and one Hidden is gone", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page, START);
  const options = [
    "Module based",
    "Dynamic pages: Simple",
    "Dynamic pages: Filtered",
    "Dynamic pages: Multi-level",
    "Custom",
  ];
  const cells: Cells = {
    ...Object.fromEntries(options.map((option) => [`catalogue-crm·${option} status`, ""])),
    "favorite-products status": "soon",
    "related-products status": "hidden",
  };
  for (const [key, value] of Object.entries(cells)) {
    await page.locator(`select[data-cell="${key}"]`).selectOption(value);
  }
  const [preview] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator("[data-act=preview]").click(),
  ]);
  await expect(preview.locator(".big")).toBeVisible({ timeout: 15000 });
  await preview.locator('.shelf .pill[data-id="product-catalogue"]').click();
  await preview.locator('[data-action="mode"][data-id="product-catalogue"][data-qty="3"]').click();
  const card = preview.locator('.feat[data-key="product-catalogue"]');
  await expect(card.locator('[data-action="source"][data-id="catalogue-objects"]')).toBeDisabled();
  await card.locator('[data-action="source"][data-id="catalogue-crm"]').click();
  await expect(card.locator('[data-action="source"][data-id="catalogue-crm"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    card.locator('[data-action="mode"][data-id="catalogue-crm"][data-qty="3"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("Catalogue with CRM Object as its source");
  /* Favorite products: locked. Related products: not there */
  await expect(card.locator(".sub.blocked", { hasText: "Favorite products" })).toContainText(
    "In development",
  );
  await expect(card).not.toContainText("Related products");
  /* Priced with this page's files */
  const want = withCatalog(buildCatalog(applyCells(rows, cells), rules, codes), () => {
    const filtered = setQuantity(
      setTile(selectionForShape("essential"), "product-catalogue", true),
      "product-catalogue",
      3,
    );
    return quote(setSource(filtered, "catalogue-crm"));
  });
  expect(want.selection.tiles["catalogue-crm"]).toBe(3);
  await expect(preview.locator(".big")).toContainText(formatHours(want.hours));
});

test("the estimator asked for a preview with nothing to show says so, and has the saved files", async ({
  page,
}) => {
  await page.goto(`/?preview#${START}`);
  await expect(page.locator(".preview-bar")).toContainText("No preview");
  await expect(page.locator(".preview-bar")).toContainText("These are the saved files");
  const live = quote(decodeSelection(START) as Selection);
  await expect(page.locator(".big")).toContainText(formatHours(live.hours));
});

test("each column heading explains itself in a popup, on hover and on keyboard focus", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page);
  const tip = page.locator("#c-tip");
  await expect(tip).toBeHidden();
  const ai = page.locator('.c-main thead th[data-tip-name="Build hours with AI generated design"]');
  await ai.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Build hours with AI generated design");
  await expect(tip).toContainText("Sections: 4, so 8 sections are 32h");
  await expect(ai).toHaveAttribute("aria-describedby", "c-tip");
  /* Below the heading, inside the window */
  const [cell, popup] = [await ai.boundingBox(), await tip.boundingBox()];
  expect(popup && cell && popup.y >= cell.y + cell.height).toBe(true);

  await page.mouse.move(5, 5);
  await expect(tip).toBeHidden();
  const needs = page.locator('.c-main thead th[data-tip-name="HubSpot tier it needs"]');
  await needs.focus();
  await expect(tip).toContainText("Professional (Pro) or Enterprise");
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
  /* Every heading of a column explains itself; the headings over groups of columns name them */
  expect(
    await page
      .locator(".c-main thead th:not(.c-span)")
      .evaluateAll((cells) => cells.every((c) => c.dataset.tip)),
  ).toBe(true);
});

test("an item with options has one name over them, and starts with the option marked; each source of products has the same options", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page, START);
  /* Another option to start with, then back: nothing changed */
  const menuStart = (option: string) =>
    page.locator(`input[data-start="menu"][value="menu·${option}"]`);
  await menuStart("Advanced").check();
  await expect(page.locator(".c-changes li")).toHaveCount(1);
  await menuStart("Simple").check();
  await expect(page.locator(".c-changes li")).toHaveCount(0);
  await expect(page.locator(".c-status")).toContainText("No changes since the last commit");
  /* The name is written once, and goes on each of its rows */
  const name = page.locator('input[data-name="menu"]');
  await name.fill("Main menu");
  await name.press("Enter");
  await expect(page.locator(".c-changes li")).toHaveCount(1);
  /* The option it starts with: one change, whichever rows it moves between */
  await page
    .locator(
      'input[data-start="product-catalogue"][value="product-catalogue·Dynamic pages: Filtered"]',
    )
    .check();
  await expect(page.locator(".c-changes li")).toHaveCount(2);
  await expect(page.locator(".c-changes")).toContainText(/Simple\s*→\s*Dynamic pages: Filtered/);
  /* The Product catalogue's sources, each with the same options and a status on each */
  const catalogue = page.locator('.c-main tr.c-group[data-place="catalogue"]');
  await expect(catalogue).toContainText("Product catalogue");
  await expect(page.locator('input[data-name="product-catalogue"]')).toHaveValue("HubDB");
  await expect(page.locator('input[data-name="catalogue-crm"]')).toHaveValue("CRM Object");
  await expect(page.locator('input[data-name="catalogue-objects"]')).toHaveValue("Custom Object");
  await expect(
    page.locator('select[data-cell="catalogue-crm·Dynamic pages: Filtered status"] option'),
  ).toHaveText(["Live", "Soon", "Hidden"]);
  /* The Custom options carry the most hours that can be entered: one field, on the first */
  await expect(page.locator('input[data-cell="catalogue-custom max"]')).toHaveCount(1);
  await expect(page.locator('input[data-cell="catalogue-custom max"]')).toHaveValue("400");
  await expect(page.locator('input[data-cell="catalogue-custom item"]')).toHaveCount(0);

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  const saved = parseTable(sent.table);
  expect(saved.filter((row) => row.id === "menu").map((row) => row.item)).toEqual([
    "Main menu",
    "Main menu",
  ]);
  expect(
    saved.filter((row) => row.id === "product-catalogue").map((row) => [row.option, row.start]),
  ).toEqual([
    ["Module based", ""],
    ["Dynamic pages: Simple", ""],
    ["Dynamic pages: Filtered", "1"],
    ["Dynamic pages: Multi-level", ""],
    ["Custom", ""],
  ]);
});
