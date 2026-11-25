/* The calculations page in a browser. The dev server's src/hours.csv is never read or written here:
   every test answers the page's api/hours itself, with the frozen hours of test/fixtures (local
   mode) or with a 404 (public mode), so a change of the hours in src/ changes none of the numbers.
   Expected hours come from the app's own logic, run here in Node. */
import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page, type Request, test } from "@playwright/test";
import {
  buildCatalogFrom,
  type Catalog,
  designChoices,
  getTile,
  optionNotes,
  placeName,
  places,
  withCatalog,
} from "../src/catalog.ts";
import { applyEdits, decodeEdits, encodeEdits, fileOnlyId } from "../src/calc/edits.ts";
import { config, siteUrl } from "../src/config.ts";
import { choiceOf, decodeSelection, quote, selectionForShape, withDesign } from "../src/quote.ts";
import { parseHours, rowsFrom, serializeHours } from "../src/table.ts";
import { fixtureHoursText } from "../test/fixture.ts";

const oldRows = parseHours(fixtureHoursText);
const oldCatalog = buildCatalogFrom(fixtureHoursText, config);

/** The hours.csv text with a link's edits in it. */
const withEdits = (hash: string) =>
  serializeHours(applyEdits(oldRows, decodeEdits(hash, config.linkCodes).edits));

/** One of the page's estimates under a catalog: a preset (the first, the starting estimate, unless
    given) with a design. */
function priced(catalog: Catalog, design: string, link = config.calcEstimates[0]?.link ?? "") {
  return withCatalog(catalog, () => {
    const linked = decodeSelection(link);
    if (!linked) throw new Error(`#${link} is not a link`);
    return quote(withDesign(linked, design));
  });
}
const ai = designChoices.find((choice) => choice.kind === "ai")?.id ?? "";
const nimbly = designChoices.find((choice) => choice.kind === "nimbly")?.id ?? "";
const custom = designChoices.find((choice) => choice.kind === "custom")?.id ?? "";

type Saved = { edits: { id: string; option: string; column: string; value: string }[] };

/** The page on this machine, with the dev server's file answered by the frozen hours. A Save is
    answered here too, never by the server: `onSave` sees what was sent. */
async function openLocal(page: Page, hash = "", onSave?: (body: Saved) => string) {
  await page.route("**/calc/api/hours", async (route) => {
    const request: Request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ json: { hours: fixtureHoursText } });
      return;
    }
    const body = request.postDataJSON() as Saved;
    if (!onSave) {
      await route.fulfill({ status: 500, json: { error: "This test does not save" } });
      return;
    }
    await route.fulfill({ json: { hours: onSave(body) } });
  });
  await page.goto(`/calc/${hash}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".c-sheet")).toBeVisible({ timeout: 15000 });
}

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true });
const card = (page: Page, name: string) => page.locator(`[data-estimate="${name}"]`);
const figure = (page: Page, name: string, row: "old" | "new", kind: string) =>
  card(page, name).locator(`tr[data-row="${row}"] td[data-kind="${kind}"]`);

test("every row of hours.csv is in the sheet, in the estimator's places and order, with only hours and packages", async ({
  page,
}) => {
  await openLocal(page);
  const read = rowsFrom(oldRows, config);
  const titles: Record<string, string> = {
    basics: "Site basics",
    shelf: "Shelf",
    blog: placeName.blog,
    catalogue: placeName.catalogue,
    membership: placeName.membership,
  };
  const wanted: string[] = [];
  for (const place of places) {
    const own = oldRows.filter(
      (row, index) => read[index]?.place === place && row.id !== fileOnlyId,
    );
    if (own.length === 0) continue;
    wanted.push(`# ${titles[place]}`);
    for (const id of new Set(own.map((row) => row.id))) {
      const rows = own.filter((row) => row.id === id);
      if (rows[0]?.option) wanted.push(rows[0].item);
      for (const row of rows) wanted.push(row.option ? `${row.item} · ${row.option}` : row.item);
    }
  }
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll(".c-table tbody tr")].flatMap((row) => {
      const element = row as HTMLElement;
      if (element.classList.contains("c-sec")) {
        return [`# ${element.querySelector(".c-sec-name")?.textContent}`];
      }
      return element.dataset.row ? [element.dataset.row] : [];
    }),
  );
  expect(shown).toEqual(wanted);
  /* Every row but the custom catalogue's, whose hours each source's Custom option stands for */
  expect(shown.filter((line) => !line.startsWith("#")).length).toBe(
    oldRows.length - 1 + new Set(oldRows.filter((row) => row.option).map((row) => row.id)).size,
  );
  await expect(page.locator(".c-table thead")).toHaveText(
    /^ItemAINimblyCustomPackageDesignBuildDesignBuildDesignBuild$/,
  );
  for (const word of ["Status", "Soon", "Hidden", "Tier", "Start", "Max", "Type"]) {
    await expect(page.locator(".c-sheet")).not.toContainText(word, { ignoreCase: false });
  }
  /* A kick-off has no design hours, and Content's hours are entered in the estimate */
  await expect(page.locator('tr[data-row="Kick-off meeting"] .c-none')).toHaveCount(3);
  await expect(page.locator('tr[data-row="Content"] .c-entered')).toHaveText(
    "hours entered in the estimate",
  );
});

test("an edited hour is yellow with ↺ and the file's value, is in the link, and moves the estimates; ↺ puts it back", async ({
  page,
}) => {
  await openLocal(page);
  const name = "Starting estimate · Nimbly";
  await expect(card(page, name).locator('[data-figure="change"]')).toHaveText("no change");
  await expect(card(page, name).locator('tr[data-row="old"]')).toHaveCount(0);

  const cell = field(page, "Sections, Nimbly build hours");
  await expect(cell).toHaveValue("4");
  await cell.fill("6");
  await expect(cell).toHaveClass(/is-edited/);
  const undo = page.getByRole("button", { name: "Put back 4" });
  await expect(undo).toHaveText("↺ 4");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#e1.42d4~6");
  await expect(page.locator(".c-status")).toContainText("1 edit, kept in this page's link");

  const before = priced(oldCatalog, nimbly);
  const after = priced(buildCatalogFrom(withEdits("e1.42d4~6"), config), nimbly);
  expect(after.hours).toBeGreaterThan(before.hours);
  await expect(figure(page, name, "old", "total")).toHaveText(`${before.hours}h`);
  await expect(figure(page, name, "new", "total")).toHaveText(`${after.hours}h`);
  await expect(figure(page, name, "new", "total")).toHaveClass(/is-chg/);
  await expect(figure(page, name, "new", "build")).toHaveText(String(after.implementationHours));
  const change = after.hours - before.hours;
  await expect(card(page, name).locator('[data-figure="change"]')).toHaveText(
    `▲ ${change}h +${Math.round((change / before.hours) * 100)}%`,
  );
  await expect(card(page, name)).toHaveClass(/is-moved/);

  await undo.click();
  await expect(cell).toHaveValue("4");
  await expect(cell).not.toHaveClass(/is-edited/);
  await expect(cell).toBeFocused();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect(card(page, name).locator('[data-figure="change"]')).toHaveText("no change");
});

test("a package edit: Page templates need Growth from 3, not 5, and the starting estimates go from Essential to Growth", async ({
  page,
}) => {
  await openLocal(page);
  const from = field(page, "Page templates, package from");
  await expect(from).toHaveValue("5");
  await from.fill("3");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#e1.41pg5~g3");
  await expect(page.getByRole("button", { name: "Put back Growth from 5" })).toBeVisible();
  const before = priced(oldCatalog, ai);
  const after = priced(buildCatalogFrom(withEdits("e1.41pg5~g3"), config), ai);
  expect([before.label, after.label]).toEqual(["Essential", "Growth"]);
  await expect(card(page, "Starting estimate · AI").locator('[data-figure="package"]')).toHaveText(
    "Essential → Growth",
  );
  /* Any: the "from" goes, and the package with it */
  await field(page, "Page templates, package").selectOption("");
  await expect(from).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#e1.41pg5~n");
});

test("the estimates: each preset of config.calcEstimates, a row of AI, Nimbly and Custom, its title a link to the estimator; the key lists AI's discount bands", async ({
  page,
}) => {
  await openLocal(page);
  /* AI's totals are after its discount, as the estimator's: the key says so, with the bands */
  const rule = (name: keyof typeof config.rules) => config.rules[name];
  await expect(page.locator(".c-key")).toContainText(
    `AI's Total is after its discount: ${rule("ai-discount-percent")}% of the first ${rule("ai-discount-band-2-from")}h, ${rule("ai-discount-band-2-percent")}% to ${rule("ai-discount-band-3-from")}h, ${rule("ai-discount-band-3-percent")}% past ${rule("ai-discount-band-3-from")}h`,
  );
  const titles = page.locator(".c-est-row a");
  await expect(titles).toHaveText(config.calcEstimates.map((preset) => preset.title));
  for (const [index, preset] of config.calcEstimates.entries()) {
    await expect(titles.nth(index)).toHaveAttribute("href", `../#${preset.link}`);
  }
  await expect(page.locator(".c-est")).toHaveCount(config.calcEstimates.length * 3);
  /* The link's estimate with each design: AI and Custom with their own feedback and variants */
  const last = config.calcEstimates.at(-1);
  if (!last) return;
  for (const [short, design] of [
    ["AI", ai],
    ["Nimbly", nimbly],
    ["Custom", custom],
  ] as const) {
    const q = priced(oldCatalog, design, last.link);
    await expect(figure(page, `${last.title} · ${short}`, "new", "total")).toHaveText(
      `${q.totalHours}h`,
    );
    await expect(figure(page, `${last.title} · ${short}`, "new", "design")).toHaveText(
      String(q.designHours),
    );
  }
});

test("rows in development, as the estimator shows them locked, are striped and not edited: the tag on the section, item or option that is all of it; a link's edits of them are left out", async ({
  page,
}) => {
  await openLocal(page);
  /* An item coming soon */
  const crm = page.locator('tr[data-row="CRM Object section"]');
  await expect(crm).toHaveClass(/is-dev/);
  await expect(crm.locator(".c-dev")).toHaveText("In development");
  for (const label of ["AI build hours", "Custom design hours", "package"]) {
    await expect(field(page, `CRM Object section, ${label}`)).toBeDisabled();
  }
  /* An item with options: the tag on the item, each option locked */
  await expect(page.locator('tr[data-row="Forms with external data"] .c-dev')).toHaveCount(1);
  await expect(page.locator('tr[data-row="Forms with external data · HubDB"] .c-dev')).toHaveCount(
    0,
  );
  await expect(field(page, "Forms with external data · HubDB, Nimbly design hours")).toBeDisabled();
  /* A section all in development: the tag on the section only. Access groups is live itself, but a
     part of Memberships, which is coming soon */
  await expect(page.locator('tr.c-sec[data-place="membership"] .c-dev')).toHaveText(
    "In development",
  );
  const groups = page.locator('tr[data-row="Access groups"]');
  await expect(groups).toHaveClass(/is-dev/);
  await expect(groups.locator(".c-dev")).toHaveCount(0);
  await expect(field(page, "Access groups, Custom build hours")).toBeDisabled();
  /* What is live is edited as ever, and Enter skips what is locked */
  await expect(page.locator('tr[data-row="HubDB section"]')).not.toHaveClass(/is-dev/);
  await expect(field(page, "HubDB section, AI build hours")).toBeEnabled();
  await field(page, "HubDB section, AI build hours").press("Enter");
  await expect(field(page, "Blogs, AI build hours")).toBeFocused();

  /* A link with an edit of each: the live one is kept, the other left out and counted */
  const live = decodeEdits("e1.42d4~6", config.linkCodes).edits;
  const locked = { id: "crm-section", option: "", column: "ai-build", was: "0", now: "5" } as const;
  const hash = encodeEdits([...live, locked], config.linkCodes);
  await openLocal(page, `#${hash}`);
  await expect(page.locator(".c-status")).toContainText("1 edit, kept in this page's link");
  await expect(page.locator(".c-status")).toContainText("1 of this link could not be used");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#e1.42d4~6");
  await expect(field(page, "CRM Object section, AI build hours")).toHaveValue("0");
});

test("tones: each design's columns and cards in its shelf colour, a white gap before each design, every other item striped, the pointed row on sand with a bar", async ({
  page,
}) => {
  await openLocal(page);
  /** A property of the first element the selector finds, and the same property of a probe put in
      it with `value`: the expected colour comes from the page's own tokens. */
  const styleOf = (selector: string, property: string, value: string) =>
    page.evaluate(
      ({ selector, property, value }) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Nothing is ${selector}`);
        const probe = document.createElement("i");
        probe.style.setProperty(property, value);
        element.append(probe);
        const read = (node: Element) => getComputedStyle(node).getPropertyValue(property);
        const both = { shown: read(element), wanted: read(probe) };
        probe.remove();
        return both;
      },
      { selector, property, value },
    );
  const same = async (selector: string, property: string, value: string) => {
    const { shown, wanted } = await styleOf(selector, property, value);
    expect(shown, `${selector} ${property}`).toBe(wanted);
    return shown;
  };
  const plain = 'tr[data-row="Page templates"]';
  const alt = 'tr[data-row="Sections"]';
  await expect(page.locator(plain)).not.toHaveClass(/is-alt|is-dev/);
  await expect(page.locator(alt)).toHaveClass(/is-alt/);

  /* AI lavender, Nimbly sage, Custom tan: Design a shade deeper than Build, the gap white */
  const shelf = { ai: "--shelf-rule", nimbly: "--shelf-content", custom: "--shelf-design" };
  const tones = new Set<string>();
  for (const [design, token] of Object.entries(shelf)) {
    const cell = `${plain} td.d-${design}`;
    tones.add(
      await same(
        `${cell}.is-design`,
        "background-color",
        `color-mix(in srgb, var(${token}) 20%, transparent)`,
      ),
    );
    tones.add(
      await same(
        `${cell}:not(.is-design)`,
        "background-color",
        `color-mix(in srgb, var(${token}) 10%, transparent)`,
      ),
    );
    await same(`${cell}.is-design`, "border-left-color", "var(--bg)");
    expect((await styleOf(`${cell}.is-design`, "border-left-width", "0")).shown).toBe("6px");
    await same(`.c-est.d-${design}`, "border-top-color", `var(${token})`);
  }
  expect(tones.size).toBe(6);

  /* Every other item on a cream stripe; the row under the pointer on sand, a bar on its name */
  expect((await styleOf(plain, "background-color", "transparent")).shown).toBe("rgba(0, 0, 0, 0)");
  await same(alt, "background-color", "color-mix(in srgb, var(--shelf) 42%, var(--bg))");
  await page.mouse.move(0, 0);
  await page.locator(`${plain} th.c-item`).hover();
  await same(plain, "background-color", "color-mix(in srgb, var(--shelf) 85%, var(--bg))");
  await same(`${plain} > th.c-item`, "box-shadow", "inset 3px 0 0 var(--shelf-text)");
});

test("typing: a value the cell cannot take is not kept, Escape puts the value back, Enter goes down a row", async ({
  page,
}) => {
  await openLocal(page);
  const cell = field(page, "Sections, AI build hours");
  await cell.click();
  await cell.fill("5x");
  await expect(cell).toHaveClass(/is-wrong/);
  await expect(page.locator(".c-status")).toContainText("Hours are whole numbers, 0 to 9999.");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  /* Left, it shows its value again */
  await page.locator("h1").click();
  await expect(cell).toHaveValue("5");
  await expect(cell).not.toHaveClass(/is-wrong/);
  await expect(page.locator(".c-status")).not.toContainText("whole numbers");

  /* "07" is 7 */
  await cell.click();
  await cell.fill("07");
  await expect(cell).toHaveValue("7");
  await expect(cell).toBeFocused();
  await cell.press("Escape");
  await expect(cell).toHaveValue("5");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");

  await cell.fill("8");
  await cell.press("Enter");
  /* The next row with AI build hours: Menu · Simple */
  await expect(field(page, "Menu · Simple, AI build hours")).toBeFocused();
  await expect(cell).toHaveValue("8");
});

test("a reload keeps the edits; a link opens with them, marks one made on other hours, and counts what it cannot use", async ({
  page,
}) => {
  await openLocal(page, "#e1.43-1a1~4");
  const simple = field(page, "Menu · Simple, AI design hours");
  await expect(simple).toHaveValue("4");
  await expect(simple).toHaveClass(/is-edited/);
  await page.reload();
  await expect(simple).toHaveValue("4");
  await expect(simple).toHaveClass(/is-edited/);

  /* Made where sections' Nimbly build was 2: the file has 4 now */
  await page.goto("/calc/#e1.42d2~6.999a1~2", { waitUntil: "domcontentloaded" });
  const sections = field(page, "Sections, Nimbly build hours");
  await expect(sections).toHaveValue("6");
  await expect(sections).toHaveClass(/is-other/);
  await expect(page.locator(".c-status")).toContainText("1 made on other hours");
  await expect(page.locator(".c-status")).toContainText("1 of this link could not be used");
  await sections.hover();
  await expect(page.getByRole("tooltip")).toHaveText(
    "This link changed 2 → 6, but hours.csv has 4 now. 6 is used; ↺ puts 4 back.",
  );
  /* The link that could not be used is not kept */
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#e1.42d2~6");
});

test("Copy share link gives the published page with the edits, Open takes it back, and Download gives hours.csv with them", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const hash = "#e1.41pg5~g3.42d4~3.43-1a1~4";
  await openLocal(page, hash);
  await expect(page.locator(".c-chip")).toHaveText("3");
  await page.getByRole("button", { name: "Copy share link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${siteUrl}calc/${hash}`);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download hours.csv" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("hours.csv");
  expect(await readFile(await file.path(), "utf8")).toBe(withEdits(hash));

  await page.getByRole("button", { name: "Undo all" }).click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect(page.locator(".c-status")).toContainText("No edits.");
  await page.getByPlaceholder("Paste a shared link").fill(copied);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe(hash);
  await expect(page.locator(".c-chip")).toHaveText("3");
  /* Back: the edits before the link */
  await page.goBack();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect(page.locator(".c-chip")).toHaveCount(0);

  await page.getByPlaceholder("Paste a shared link").fill("https://example.com/calc/");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".c-status")).toContainText("That link has no edits.");
});

test("Save sends the edits to the dev server, then the page has none and says Saved", async ({
  page,
}) => {
  const sent: Saved[] = [];
  await openLocal(page, "#e1.41pg5~g3.43-1a1~4", (body) => {
    sent.push(body);
    return withEdits("e1.41pg5~g3.43-1a1~4");
  });
  await page.getByRole("button", { name: "Save to src/hours.csv" }).click();
  await expect(page.locator(".c-status")).toContainText("Saved to src/hours.csv");
  await expect(page.locator(".c-status")).toContainText("No edits.");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  expect(sent).toEqual([
    {
      edits: [
        { id: "templates", option: "", column: "package", value: "growth from 3" },
        { id: "menu", option: "Simple", column: "ai-design", value: "4" },
      ],
    },
  ]);
  /* The saved values are the file's now: not edits */
  await expect(field(page, "Menu · Simple, AI design hours")).toHaveValue("4");
  await expect(field(page, "Menu · Simple, AI design hours")).not.toHaveClass(/is-edited/);
  await expect(page.getByRole("button", { name: "Save to src/hours.csv" })).toBeDisabled();
});

test("published, with no dev server: no Save and no local bar, and the edits still work", async ({
  page,
}) => {
  await page.route("**/calc/api/hours", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/calc/#e1.43-1a1~4", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".c-sheet")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Save to src/hours.csv" })).toHaveCount(0);
  await expect(page.getByPlaceholder("Paste a shared link")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download hours.csv" })).toBeVisible();
  await expect(field(page, "Menu · Simple, AI design hours")).toHaveClass(/is-edited/);
});

test("the help on a name is the estimator's note word for word, as a new estimate shows it, and nothing more", async ({
  page,
}) => {
  await openLocal(page);
  /* What the estimator says, from its own code: a new estimate's design fills {build} */
  const appSays = (catalog: Catalog, id: string, option = 0) =>
    withCatalog(catalog, () => {
      const choice = choiceOf(selectionForShape("essential"));
      return optionNotes(getTile(id), choice)[option];
    });
  const tip = page.getByRole("tooltip");
  /* Hovered where it is: a scroll closes a help, as on the page, so a name further down is
     scrolled to first, then hovered */
  const hoverReads = async (anchor: Locator, text: string) => {
    await anchor.scrollIntoViewIfNeeded();
    await expect(async () => {
      await page.mouse.move(0, 0);
      await anchor.hover();
      await expect(tip).toHaveText(text, { timeout: 500 });
    }).toPass();
  };
  const templates = page.locator(".c-help", { hasText: "Page templates" });
  await hoverReads(templates, appSays(oldCatalog, "templates") ?? "");
  /* {build} is Nimbly's build hours, as in the estimator */
  await expect(tip).toHaveText("2h each to build");
  const sections = page.locator(".c-help", { hasText: "Sections" });
  await sections.focus();
  await expect(tip).toHaveText(appSays(oldCatalog, "sections") ?? "");
  await expect(tip).toHaveText("Hero, cards, quote, FAQ and more. 4h each");
  await expect(sections).toHaveAttribute("aria-describedby", "c-tip");
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
  /* An item with options has its note on each option, none on its name */
  await expect(page.locator('tr[data-row="Menu"] .c-help')).toHaveCount(0);
  await hoverReads(
    page.locator('tr[data-row="Menu · Advanced"] .c-help'),
    appSays(oldCatalog, "menu", 1) ?? "",
  );
  /* An option with no note of its own: the estimator says its item's, and so does the page */
  await hoverReads(
    page.locator('tr[data-row="Forms with external data · External API"] .c-help'),
    appSays(oldCatalog, "external-forms", 1) ?? "",
  );
  /* The help follows the edits of the hours it shows, and only those */
  await field(page, "Page templates, AI build hours").fill("7");
  await hoverReads(templates, "2h each to build");
  await field(page, "Page templates, Nimbly build hours").fill("3");
  await hoverReads(templates, "3h each to build");
});

test("at 1440×900 the estimates sit beside the sheet and stay in view while it scrolls, with no sideways scroll", async ({
  page,
}) => {
  await openLocal(page);
  const sheet = await page.locator(".c-sheet").boundingBox();
  const estimates = await page.locator(".c-estimates").boundingBox();
  expect(sheet && estimates).toBeTruthy();
  if (!sheet || !estimates) return;
  expect(estimates.x).toBeGreaterThan(sheet.x + sheet.width);
  expect(estimates.width).toBeGreaterThan(460);
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
  const held = await page.locator(".c-estimates").boundingBox();
  expect(Math.round(held?.y ?? 0)).toBe(16);
  /* The sheet's header rows stay at the top too */
  const head = await page.locator(".c-table thead").boundingBox();
  expect(Math.round(head?.y ?? -1)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  /* Each preset's cards side by side here, each within its card; where the panel is narrower they
     stack, still within */
  const columns = () =>
    page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".c-set")!).gridTemplateColumns.split(" ").length,
    );
  const spill = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll(".c-est")].filter(
          (card) => card.scrollWidth > card.clientWidth,
        ).length,
    );
  expect(await columns()).toBe(3);
  expect(await spill()).toBe(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(columns).toBe(1);
  expect(await spill()).toBe(0);
  /* On a phone the page still never scrolls sideways: the sheet scrolls in its card */
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await spill()).toBe(0);
});
