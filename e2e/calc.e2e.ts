/* The short link and the calculations page, in a browser. Expected hours come from the app's own
   logic and files, run here in Node. Save is caught before it reaches the server, so the tests never
   write the files in src/. */
import { expect, type Page, type Route, test } from "@playwright/test";
import { buildCatalog, withCatalog } from "../src/catalog.ts";
import { hoursLabel } from "../src/controls.ts";
import { decodeSelection, formatHours, type Quote, quote, type Selection } from "../src/quote.ts";
import {
  applyCells,
  type Cells,
  liveCodesText,
  liveRulesText,
  liveText,
  parseCodes,
  parseRules,
  parseTable,
  type Rules,
  serializeTable,
} from "../src/table.ts";

/* Landing templates, custom system templates and 50h of content on the starting estimate */
const EXAMPLE = "BBkE_0kABIMIAwgCMg";
const START = "BBkC_wGDAAMIAg";
/* Sections with AI design: 4h each becomes 5h */
const CHANGE: Cells = { "sections build-ai": "5" };

const rows = parseTable(liveText);
const rules = parseRules(liveRulesText);
const codes = parseCodes(liveCodesText);
function priced(code: string, cells: Cells = {}, changed: Partial<Rules> = {}): Quote {
  const selection = decodeSelection(code) as Selection;
  return withCatalog(buildCatalog(applyCells(rows, cells), { ...rules, ...changed }, codes), () =>
    quote(selection),
  );
}

type Sent = { table: string; rules: string };
const committed = { table: liveText, rules: liveRulesText };

/** The files as the server gives them: as they are on disk, and as the last commit has them. */
async function serveTable(page: Page, onSave?: (sent: Sent, route: Route) => Promise<void>) {
  await page.route("**/calc/api/table", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: { saved: { ...committed, codes: liveCodesText }, committed },
      });
      return;
    }
    const body = route.request().postDataJSON() as Sent;
    if (onSave) await onSave(body, route);
    else await route.fulfill({ json: { saved: { ...body, codes: liveCodesText }, committed } });
  });
}
const savedAs = (sent: Sent) => ({ json: { saved: { ...sent, codes: liveCodesText }, committed } });
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
const estimate = (page: Page, name: string) => page.locator(`.c-est-item[data-estimate="${name}"]`);
const figure = (page: Page, name: string, which: string) =>
  estimate(page, name).locator(`[data-figure="${which}"]`);
const total = (page: Page) => page.locator(".big").evaluate((node) => node.firstChild?.textContent);

test("the estimator's address is the short code, and an address from before it opens the starting estimate", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => location.hash)).toBe(`#${START}`);

  await page.goto("about:blank");
  await page.goto("/#s=cms-react&w=25&b=same&t=templates.9,sections.20");
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => location.hash)).toBe(`#${START}`);
  expect(await total(page)).toBe(formatHours(priced(START).hours));

  await page.goto("about:blank");
  await page.goto(`/#${EXAMPLE}`);
  await expect(page.locator(".big")).toBeVisible({ timeout: 15000 });
  expect(await total(page)).toBe("139");
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
  await expect(figure(page, "Starting estimate", "committed")).toHaveText("78h");
  await expect(page.locator(".c-status")).toContainText("No changes since the last commit");
  /* The table is laid out as the estimator is, and its type says where hours count: no Content
     place of its own */
  await expect(page.locator(".c-main .c-group")).toHaveText([
    /Site basics/,
    /Shelf/,
    /Blog/,
    /Product catalogue/,
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
      const cells = line.querySelectorAll(".c-own");
      hours += figure(cells[1] ?? null);
      design += figure(cells[2] ?? null);
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
  await setCell(page, "sections build-ai", "5");
  const want = priced(EXAMPLE, CHANGE);
  const own = estimate(page, "From your link");
  await expect(page.locator(".c-status")).toContainText(
    "1 change from the last commit, 1 edit not saved yet",
  );
  await expect(own.locator('[data-figure="committed"]')).toHaveText("139h");
  await expect(own.locator('[data-figure="table"]')).toHaveText(hoursLabel(want.hours));
  await expect(own.locator('[data-figure="change"]')).toHaveText("+8h");
  await expect(own.locator('[data-figure="build"]')).toHaveText(
    hoursLabel(want.implementationHours),
  );
  await expect(page.locator(".c-changes li")).toContainText("Sections");
  await expect(page.locator(".c-changes li")).toContainText("Build hours with AI generated design");
  await expect(page.locator(".c-changes li .c-fromto")).toContainText(/4\s*→\s*5/);
  await expect(page.locator(".c-changes li")).toContainText("not saved");
  const cell = page.locator('input[data-cell="sections build-ai"]');
  await expect(cell).toHaveClass(/is-changed/);
  await expect(cell).toHaveClass(/is-unsaved/);

  await page.reload();
  await expect(cell).toHaveValue("5");
  await expect(own.locator('[data-figure="table"]')).toHaveText(hoursLabel(want.hours));

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toContainText("Saved");
  expect(sent.table).toBe(serializeTable(applyCells(rows, CHANGE)));
  expect(sent.rules).toBe(liveRulesText);
  /* One cell changed: one line of the file differs */
  const before = liveText.split("\n");
  expect(sent.table.split("\n").filter((line, index) => line !== before[index])).toHaveLength(1);
  /* Saved, and still a change from the last commit */
  await expect(page.locator(".c-status")).toContainText("1 change from the last commit, all saved");
  await expect(cell).not.toHaveClass(/is-unsaved/);
  await expect(page.locator("[data-act=save]")).toBeDisabled();
});

test("the Design and Languages panels change the rules, and Save sends them", async ({ page }) => {
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
  await expect(languages).toContainText("The 2nd");
  await expect(languages.locator('input[data-rule="languages-second"]')).toHaveValue("14");

  await setRule(page, "ai-variant-percent", "100");
  await setRule(page, "languages-growth-from", "3");
  await expect(page.locator(".c-changes")).toContainText("each extra, % of AI design");
  await expect(page.locator(".c-changes")).toContainText("Growth from");
  await expect(page.locator('input[data-rule="languages-growth-from"]')).toHaveClass(/is-changed/);
  const want = priced(START, {}, { "ai-variant-percent": "100", "languages-growth-from": "3" });
  await expect(figure(page, "Starting estimate", "table")).toHaveText(hoursLabel(want.hours));

  await page.locator("[data-act=save]").click();
  await expect(page.locator(".c-small.is-done")).toBeVisible();
  expect(parseRules(sent.rules)["ai-variant-percent"]).toBe("100");
  expect(parseRules(sent.rules)["languages-growth-from"]).toBe("3");
  expect(sent.table).toBe(liveText);
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
  /* Basics and parts have no status of their own; their options do */
  await expect(page.locator('select[data-cell="sections status"]')).toHaveCount(0);
  await expect(page.locator('select[data-cell="menu·Advanced status"]')).toHaveValue("");
  await expect(
    page.locator(".c-main tr", {
      has: page.locator('input[data-cell="blog-recent item"]'),
    }),
  ).toContainText("With the blog");
  await page.locator('select[data-cell="system status"]').selectOption("hidden");
  const own = estimate(page, "From your link");
  /* The link had Custom system templates: without them it is 6h of build and 1h of design less */
  await expect(own.locator('[data-figure="change"]')).toHaveText("−7h");
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

test("Undo goes back to the last commit's value, and Discard unsaved drops what was not saved", async ({
  page,
}) => {
  await serveTable(page);
  await openCalc(page);
  await setCell(page, "sections build-ai", "5");
  await page.locator(".c-changes button", { hasText: "Undo" }).click();
  await expect(page.locator('input[data-cell="sections build-ai"]')).toHaveValue("4");
  await expect(page.locator(".is-changed")).toHaveCount(0);

  await setCell(page, "templates build-ai", "3");
  await setRule(page, "ai-feedback-each", "4");
  await page.locator("[data-act=reset]").click();
  await page.locator("[data-act=reset-yes]").click();
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
  await estimate(page, "Platform with a catalogue").locator("input").check();
  await expect(page.locator(".c-main tfoot th")).toContainText("Platform with a catalogue: 269h");
  await expect(
    page
      .locator(".c-main tr", { has: page.locator('input[value="Dynamic pages: Filtered"]') })
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
  await expect(figure(page, "From your link", "committed")).toHaveText("139h");
  expect(await page.evaluate(() => location.hash)).toBe(`#${EXAMPLE}`);
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
  expect(sent.table).toBe(liveText);
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

test("an item with options has one name over them, and starts with the option marked; a source of products to come cannot be Live", async ({
  page,
}) => {
  let sent: Sent = { table: "", rules: "" };
  await serveTable(page, async (body, route) => {
    sent = body;
    await route.fulfill(savedAs(body));
  });
  await openCalc(page, START);
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
  /* The Product catalogue's sources: HubDB with its options; the others can only be to come */
  const catalogue = page.locator('.c-main tr.c-group[data-place="catalogue"]');
  await expect(catalogue).toContainText("Product catalogue");
  await expect(page.locator('input[data-name="product-catalogue"]')).toHaveValue("HubDB");
  await expect(page.locator('select[data-cell="catalogue-crm status"] option')).toHaveText([
    "Soon",
    "Hidden",
  ]);
  /* Its Custom option carries the most hours that can be entered for it */
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
