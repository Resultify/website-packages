# Plan: one hours.csv and a public calculations page

This plan is written to be carried out by an agent that has no other context. Everything needed is
here; when the plan points at existing code, it names the file and the function as they are at
commit `291e83e`. Read the whole plan before starting.

## 0. Working rules

- **0.1** Repository: `~/code/parcel.worktrees/add-calculation-page__dwt` (a git worktree, branch
  `add-calculation-page__dwt`, made from `main` at `291e83e`). Work only in that folder.
- **0.2** Never commit, push, stash or rewrite history. The owner commits each step. At the end of
  a step, stop and report: what changed (numbered list), the commands run and their results.
- **0.3** Toolchain is Bun only: `bun fmt` (format; `bun fmt --check` verifies), `bun check`
  (types), `bun test` (unit tests in `test/`), `bun run e2e` (Playwright browser tests in `e2e/`,
  run on Node; they reuse the dev server on port 4173, `bun run dev`). Never add Biome, ESLint,
  Prettier, tsc, a second lockfile, or a `check`/`fmt` script in `package.json`.
- **0.4** Every step ends with all four green: `bun fmt --check`, `bun check`, `bun test`,
  `bun run e2e`. Then open the changed pages in a browser (`playwright-cli`, headless, at `/` and
  `/calc/` of this worktree's dev server) and check the console has no errors. All four are green
  at `291e83e` (checked on 2026-11-20: 153 unit tests, 77 browser tests).
- **0.4.1** Playwright reuses whatever answers on the port, and on 4173 that may be the dev server
  of another checkout, running other code. Before the browser tests, make sure nothing else
  listens there (`lsof -nP -iTCP:4173 -sTCP:LISTEN`), or give this worktree a port of its own, for
  the server and the tests alike: `PORT=4183 bun run dev`, `PORT=4183 bun run e2e` (both read
  `PORT`).
- **0.5** Step 1 must not change a single price. `test/__snapshots__/prices.test.ts.snap` must stay
  byte for byte: add no test to `test/prices.test.ts` (new snapshot tests go in files of their
  own, 4.7.2 and 4.7.4). Never pass `--update-snapshots` in step 1: `bun test` writes a new test's
  snapshot the first time it runs (if it refuses because `CI` is set, pass the flag together with
  that one test file's path). At the end of the step,
  `git diff --exit-code 291e83e -- test/__snapshots__/prices.test.ts.snap` must print nothing; if
  the prices snapshot would change, stop and report instead.
- **0.6** Write code and comments in the style of the files around them: plain words, no jargon in
  user-facing text, comments that say why. Colours only from the tokens in the `:root` of
  `src/styles.css` (a test enforces this, also for the calculations page).
- **0.7** A visual mockup of the result is at `.tmp/viz/calc-plan.html` (ignored by git; it may be
  missing in another checkout). It illustrates sections 5.3 to 5.6; where it and this plan differ,
  the plan wins.
- **0.8** Step 1 deletes the old calculations page, and step 2 reuses parts of it. Wherever this
  plan says "the old page's …", read it from git: `git show 291e83e:src/calc/calc.ts` (and
  `calc.css`, `api.ts`, `e2e/calc.e2e.ts`, `test/api.test.ts`).

## 1. What exists now (commit 291e83e)

- **1.1** The estimator (`/`, `src/index.html`, `src/client.ts`, `src/estimator.ts`,
  `src/controls.ts`, `src/quote.ts`, `src/catalog.ts`) prices website projects. Its numbers come
  from three files read by `src/table.ts`:
  - `src/estimator.csv`: 54 rows under its header, one per item or per option of an item, 18
    columns:

    ```
    id,item,option,place,type,status,unit,start,max,build-ai,build-nimbly,build-custom,
    design-ai,design-nimbly,design-custom,package,tier,note
    ```

  - `src/rules.csv`: 27 rules (`rule,value`): feedback rounds, AI variants, the package each design
    needs, project management, languages, website pages
  - `src/link-codes.csv`: each item's number in a share link, and the order of its options
- **1.2** `src/catalog.ts` `buildCatalog(rows: Row[], rules: Rules, codes: CodeEntry[])` turns them
  into the `Catalog` the estimator prices with. Empty hour cells read as 0 (`buildRate`,
  `designRate`).
- **1.3** The calculations page (`/calc/`, dev server only: `src/calc/index.html`, `calc.ts`,
  `calc.css`, `api.ts`; routes in `src/server.ts`) edits all three files: Save, Preview (opens the
  estimator at `/?preview` with unsaved files, `src/preview.ts`), Discard, a Changes panel, Design/
  Project/Languages rule panels, Add an item, status/type/start/max/tier columns, and an Estimates
  panel of nine estimates. All of that is replaced by this plan.
- **1.4** Tests: `test/fixtures/` holds frozen copies of the three files (pricing tests use them via
  `test/fixture.ts`); `test/prices.test.ts` snapshots the prices of the files in `src/`;
  `test/table.test.ts` tests the catalog and links; `test/api.test.ts` the save API;
  `e2e/estimator.e2e.ts` the estimator; `e2e/calc.e2e.ts` the calculations page.
- **1.5** `e2e/estimator.e2e.ts` opens the estimator with the frozen fixture files through the
  preview: `openFrozen()` and two tests (tier badges; Memberships) put the files in
  `localStorage["website-packages.preview"]` and open `/?preview`.

## 2. Decisions (agreed with the owner on 2026-11-20)

- **D1** One CSV, `src/hours.csv`: items, help text, AI/Nimbly/Custom hours, package. It opens in
  Google Sheets as is and comes back from it as a CSV download.
- **D2** Everything else is in `src/config.ts` (TypeScript): per item place, type, status, unit,
  start, max, HubSpot tier; the 27 rules; the link codes; the calculations page's estimates.
  `estimator.csv`, `rules.csv` and `link-codes.csv` are deleted.
- **D3** The estimator and every price stay exactly the same. Every share link sent so far keeps
  opening the same estimate.
- **D4** The calculations page is published with the estimator (GitHub Pages, `docs/calc/`). Its
  edits live only in the page's address (the hash): a reload keeps them, the address shares them,
  Download gives `hours.csv` with them. The public page saves nothing.
- **D5** On localhost (dev server) the same link works (same hash, or pasted into a field), and
  **Save** writes the edits into `src/hours.csv`.
- **D6** The page edits hours and packages of existing rows only. None of: add or remove items,
  status, type, start, max, tier, rules, Preview, Changes panel, Discard/undo history, project
  management row, picking an estimate, pricing a pasted estimate link.
- **D7** Help text is read-only, shown in a popover on hover or keyboard focus of the item's name.
- **D8** An edited value is yellow, with a ↺ button on it that shows the value of `hours.csv` and
  puts it back.
- **D9** "Old" means the `hours.csv` the page has: the published one on the public page, the one on
  disk on localhost. "New" is Old with the page's edits. There is no comparison with the last git
  commit on the page; git and the test snapshots cover that.
- **D10** Soon and hidden items are ordinary rows in the page and in `hours.csv`, with 0 hours for
  now. Show, hide and Soon are set in `src/config.ts` only; the page never shows a status.
- **D11** The Estimates panel keeps today's nine estimates: "Starting estimate", "+ Blog and
  Search", "+ Products", each with AI, Nimbly and Custom. The item column is narrow so the panel
  gets the rest of the width.
- **D12** Each estimate compares Old and New: the total's change first and large, then a small
  table with an Old row over a New row (Total, Design, Build, Project), and the package as old → new
  when an edit moves it.
- **D13** Copy share link on localhost copies the published page's address, not localhost's. The
  estimator gets no link to the calculations page. A `src/hours.csv` the app cannot read stops
  the dev server's pages as today, with no message on the page.

## 3. The files after the change

- **3.1** New: `src/hours.csv`, `src/config.ts`, `src/test-files.ts`, `src/calc/edits.ts`,
  `scripts/hours-fmt.ts`, `test/fixtures/hours.csv`, `test/fixtures/config.ts`,
  `test/hours-file.test.ts`, `test/calc-estimates.test.ts`, `test/edits.test.ts`,
  `.gitattributes`.
- **3.2** Rewritten: `src/table.ts`, `src/calc/calc.ts`, `src/calc/calc.css`, `src/calc/api.ts`,
  `test/fixture.ts`, `test/api.test.ts`, `e2e/calc.e2e.ts`, README sections (step 3).
- **3.3** Changed: `src/catalog.ts` (default catalog, comments and messages that name the old
  files), `src/client.ts`, `src/estimator.ts`, `src/styles.css`, `src/server.ts`,
  `scripts/build.ts`, `test/prices.test.ts` (how it builds its catalogs, not its tests),
  `test/table.test.ts`, `test/page.test.ts`, `e2e/estimator.e2e.ts` (4.5.3),
  `.github/workflows/verify.yml` (the command, and its top comment about the frozen build),
  `.github/workflows/release.yml`. Comments that name `estimator.csv`, `rules.csv` or
  `link-codes.csv` in `src/quote.ts`, `src/link.ts`, `src/catalog.ts`, `playwright.config.ts` and
  `scripts/csv-text.ts` ("the tables") now name `hours.csv` or `config.ts` (`config.linkCodes`);
  4.8.4 finds any that are left.
- **3.4** Deleted: `src/estimator.csv`, `src/rules.csv`, `src/link-codes.csv`, `src/preview.ts`,
  `test/fixtures/estimator.csv`, `test/fixtures/rules.csv`, `test/fixtures/link-codes.csv`.
- **3.5** Unchanged apart from those comments: `src/quote.ts`, `src/controls.ts`, `src/link.ts`,
  the rest of `src/catalog.ts` (including `withCodes` in `buildCatalog` and `Catalog.codes`),
  `test/quote.test.ts`, `test/hours.test.ts`, every assertion of `e2e/estimator.e2e.ts`.

## 4. Step 1: the files, the config, the tests (no price changes)

### 4.0 Order inside step 1

Do it in this order; run `bun check` and the full tests only at the end (in between, imports of
removed functions break on purpose):

1. 4.2.1 and 4.4.2: the types, and the new readers in `table.ts`, next to the old ones
   (`liveHoursText` once `src/hours.csv` exists)
2. 4.3.1: the converter, which writes the new files (4.1, 4.2) with `serializeHours`
3. 4.3.2: the proof, while the old readers and files still exist
4. 4.4.3 to 4.4.5: remove the old readers; `catalog.ts`; `hours-fmt.ts`
5. 4.6: the build and workflows (`build.ts` imports `checkFiles`, which 4.5 removes)
6. 4.5: the old page and the preview
7. 4.7, then 0.4

### 4.1 `src/hours.csv`

- **4.1.1** The same 54 rows, in the same order, as `src/estimator.csv`. 11 columns, this header
  exactly:

  ```
  id,item,option,help,ai-design,ai-build,nimbly-design,nimbly-build,custom-design,custom-build,package
  ```

- **4.1.2** `id`, `item`, `option` and `package` are copied as they are. `help` is the old `note`.
  `ai-design` is the old `design-ai`, `ai-build` the old `build-ai`, and so on.
- **4.1.3** Empty hour cells: a cell stays empty only when (a) the row's unit is `hours` or
  `build and design hours` (its hours are typed in the estimate), or (b) it is a design cell of a
  row of type `project` (kick-off, training). Every other empty hour cell becomes `0`. In
  `src/estimator.csv` that fills 18 rows: the 16 soon rows (external-forms ×2, crm-section,
  crm-custom-section, catalogue-crm ×4 and catalogue-objects ×4 without their Custom option,
  membership ×3, membership-social), blog-setups and membership-groups. In
  `test/fixtures/estimator.csv` it fills 7 rows: external-forms ×2, crm-section,
  crm-custom-section, blog-setups, membership · SSO and membership-groups. Checked on 2026-11-20,
  for both: the catalog built with the 0s is identical to the one without, since empty reads as 0.
- **4.1.4** Written as `table.ts` writes CSV today: a cell is quoted only when it holds a comma, a
  quote (doubled) or a line break; LF line ends; a final line break.
- **4.1.5** `.gitattributes`: `src/hours.csv text eol=lf` and `test/fixtures/hours.csv text eol=lf`.

### 4.2 `src/config.ts`

- **4.2.1** Types (in `src/config.ts`, or in `src/table.ts` and imported):

  ```ts
  /** Where an item is shown: the `places` of catalog.ts, whose own `Place` also has "design". */
  export type ItemPlace = "basics" | "shelf" | "blog" | "catalogue" | "membership";
  /** What a row needs besides its hours: the old columns, left out when empty. */
  export type RowConfig = {
    status?: "soon" | "hidden";
    unit?: string;
    start?: number;
    max?: number;
    tier?: string; // "professional", "enterprise", or "enterprise from 3"
  };
  export type ItemConfig = RowConfig & {
    place: ItemPlace;
    type?: "content" | "project";
    /** An option's own values, where its item's rows differ. */
    options?: Record<string, RowConfig>;
  };
  export type Config = {
    items: Record<string, ItemConfig>;
    rules: Record<RuleName, number | string>;
    linkCodes: CodeEntry[];
    calcEstimates: { name: string; title: string; adds: string[] }[];
  };
  export const config: Config = { … };
  ```

- **4.2.2** `items`: one entry per id of `hours.csv`, in the file's order. For each of `status`,
  `unit`, `start`, `max`, `tier`: when every row of the item has the same value, it is on the item
  (left out when empty); otherwise it is on each option whose value is not empty. `place` and
  `type` are always the item's (all rows of an item share them; the converter checks it). `start`
  and `max` are numbers. Examples:

  ```ts
  templates: { place: "basics", unit: "templates", start: 3, max: 50 },
  menu: { place: "basics", options: { Simple: { start: 1 } } },
  kickoff: { place: "basics", type: "project" },
  "content-hours": { place: "shelf", type: "content", unit: "hours", start: 0, max: 900 },
  "external-forms": {
    place: "shelf",
    status: "soon",
    options: { HubDB: { tier: "professional" }, "External API": { tier: "enterprise" } },
  },
  "product-catalogue": {
    place: "catalogue",
    tier: "professional",
    options: { "Dynamic pages: Simple": { start: 1 }, Custom: { unit: "hours" } },
  },
  ```

- **4.2.3** `rules`: the 27 rules of `src/rules.csv`, same names and order, numbers as numbers and
  the four `*-package` rules as strings (`""`, `"growth"`). Group them with comments (feedback,
  variants, design packages, project management, languages, pages).
- **4.2.4** `linkCodes`: every entry of `src/link-codes.csv` (48), same order, codes and option
  lists, as `{ id, code, options }`. Includes the ids the app makes (`blog-list-count`,
  `custom-integration-design`, `ai-design`, `languages`, …).
- **4.2.5** `calcEstimates`: the three rows of the old page's `setups` in `src/calc/calc.ts`:

  ```ts
  calcEstimates: [
    { name: "Starting estimate", title: "Starting estimate", adds: [] },
    { name: "Blog and Search", title: "+ Blog and Search", adds: ["blog-setups", "search"] },
    {
      name: "Blog, Search and Products",
      title: "+ Products",
      adds: ["blog-setups", "search", "product-catalogue"],
    },
  ],
  ```

- **4.2.6** A comment on top says what lives here and that hours live in `hours.csv`; that adding
  an item means a row in `hours.csv`, an entry in `items`, and a new code in `linkCodes` (the next
  after the highest ever given; codes are never reused or changed).
- **4.2.7** Also in `src/config.ts`, apart from `config` (the fixture's config has none):
  `export const siteUrl = "https://resultify.github.io/website-packages/";`, the published
  site's address, as the `og:url` of `src/index.html` has it. The calculations page makes its
  share link with it on localhost (5.3.1).

### 4.3 Making the two files: a one-off converter

- **4.3.1** Write a converter in `.tmp/` (not committed) that reads the three old files and writes
  `hours.csv` (4.1, with `serializeHours` of 4.4.2) and the data of `config.ts` (4.2). Run it for
  `src/` and for `test/fixtures/`
  (the fixture's rules and rows differ from `src/`'s: it gets its own `test/fixtures/config.ts`,
  exporting `config: Config` the same way). Format the output with `bun fmt`.
- **4.3.2** Before deleting the old files, prove the conversion in a temporary test,
  `test/conversion.test.ts` (not kept): for both `src/` and the fixture,
  `rowsFrom(parseHours(new), config)` (4.4) deep-equals `parseTable(old estimator.csv)` except
  for the 0s of 4.1.3, `rulesFrom(config)` equals
  `parseRules(old rules.csv)`, `config.linkCodes` equals `parseCodes(old link-codes.csv)`, and
  `buildCatalog` of the new gives the same JSON as `buildCatalog` of the old (Maps as entry
  arrays). Then delete the old files and that test.

### 4.4 `src/table.ts`: reading hours.csv

- **4.4.1** Keep: `parseCsv` (also strip a leading BOM), the CSV writer, `Row` (the 18 old columns,
  now built in memory only), `Rules`, `RuleName`/`ruleNames`, `CodeEntry`, `withCodes`, `choices`,
  `designKinds`, `buildKind`.
- **4.4.2** Add: `hoursColumns` (the 11 names), `HoursRow` (`Record<HoursColumn, string>`),
  `parseHours(text): HoursRow[]` (header must be exactly the 11 columns, else an error naming
  them; cells trimmed; CRLF and a missing final line break read the same),
  `serializeHours(rows): string` (4.1.4), `liveHoursText` (the text of `src/hours.csv`, imported
  `with { type: "text" }`, as the old files were),
  `rowsFrom(rows: HoursRow[], config: Config): Row[]` (each old column from the CSV, or from the
  config: option value ?? item value ?? `""`, numbers as strings; an id missing from
  `config.items` is an error naming it), `rulesFrom(config): Rules` (values as strings; a rule of
  `ruleNames` that `config.rules` lacks is an error, "config.ts has no rule <name>". `parseRules`
  refused a file without a rule's row for the same reason: read as empty, a lost package rule
  prices Custom design as Essential, and the dev server and the build run without the type check).
- **4.4.3** Remove: the imports of the three old files, `liveText`, `liveRulesText`,
  `liveCodesText`, `parseTable`, `serializeTable`, `rowKey`, `cellKey`, `applyCells`, `Cells`,
  `parseRules`, `parseOlderRules`, `addedRules`, `serializeRules`, `parseCodes`, `serializeCodes`,
  `tableId`, and anything else left unused.
- **4.4.4** `src/catalog.ts`: add `buildCatalogFrom(hoursText: string, config: Config): Catalog` =
  `buildCatalog(rowsFrom(parseHours(hoursText), config), rulesFrom(config), config.linkCodes)`,
  and build the default catalog with `buildCatalogFrom(liveHoursText, config)`. Nothing else in
  `catalog.ts` changes but comments and messages that name the old files: its top comment, and
  the `|` message near line 1049, which becomes `an option name cannot have "|"`, without the part
  that names `link-codes.csv` (the check stays; `test/table.test.ts` expects that text).
- **4.4.5** `scripts/hours-fmt.ts`: reads `src/hours.csv` (or a path given as its argument),
  checks it with `parseHours` and `buildCatalogFrom` (prints the problem and exits 1 if it fails),
  and writes it back with `serializeHours`; prints "src/hours.csv: rewritten in the app's layout"
  or "src/hours.csv: already in the app's layout". It is how a Google Sheets download (CRLF, no
  final line break, its own quoting) is put in the app's layout (6.3). It loads `src/catalog.ts`
  with `await import()` inside its `try`, as `scripts/build.ts` loads `changelog.ts`: the module
  builds the default catalog from `src/hours.csv` as it loads, and throws there when the app
  cannot read the file, before a static import would let the script say anything.

### 4.5 The old calculations page and the preview go

- **4.5.1** Delete the old page's code (0.8 says where to read it later):
  - `src/calc/calc.ts` becomes a placeholder that renders one line in `#calc`: "The calculations
    page is being rebuilt."
  - `src/calc/calc.css` becomes a placeholder that uses at least one token, such as
    `body.calc { background: var(--basics); }` (`test/styles.test.ts` requires the page's CSS to
    use a token)
  - `src/calc/api.ts` keeps only `mayWrite()` and the `oneAtATime()` queue (step 2 uses both);
    the table route, `checkFiles`, `readTables`, `saveTables` go. `src/server.ts` loses the
    `/calc/api/table` route; `/calc/` and the `/calc` redirect stay
  - `test/api.test.ts` keeps only its "who may save" tests (of `mayWrite`); the rest goes.
    `e2e/calc.e2e.ts` is deleted (step 2 writes a new one)
- **4.5.2** Replace `src/preview.ts` with `src/test-files.ts`, for the browser tests only: when the
  address has `?files`, it reads `localStorage["website-packages.files"]`, JSON
  `{ hours: string, config: Config }`, and calls `useCatalog(buildCatalogFrom(hours, config))`
  before anything else reads the catalog. No bar, no storage listener, no message. `src/client.ts`
  imports it first, as it imported `preview.ts`, and treats `?files` as it treated `?preview` (a
  share link leaves it out). If `?files` is there but the storage is missing or cannot be read,
  it logs the reason with `console.error` and the page uses its bundled files. Remove
  `inPreview` from `src/estimator.ts`: Share link is always on.
  Remove `body.is-preview` and `.preview-bar` rules from `src/styles.css`; if a `:root` token is
  then unused, remove it (the styles test requires every token to be used).
- **4.5.3** `e2e/estimator.e2e.ts`: in `openFrozen()` and the two tests of 1.5, store
  `{ hours: fixtureHoursText, config: fixtureConfig }` under `website-packages.files` and open
  `/?files`. The tier-badge test, which made every soon row live, now makes a copy of the fixture
  config with every `status: "soon"` removed (items and options; a hidden one would stay hidden,
  as before), stores it, and builds the `catalog` its `wanted()` uses with
  `buildCatalogFrom(fixtureHoursText, thatConfig)`. The file's imports of `parseTable`,
  `serializeTable` and `fixtureText` go, and its comments say "with the frozen files" where they
  said "in a preview". No assertion changes.

### 4.6 The build and the workflows

- **4.6.1** `scripts/build.ts`: drop `--frozen`, the import of `checkFiles` and the writing of
  link codes. Before building: `buildCatalogFrom(text of src/hours.csv, config)` must not throw,
  and its `codes` must deep-equal `config.linkCodes` (the catalog also gives codes to ids it
  makes, such as `<id>-design` and `blog-*-count`, so this catches every item without a code);
  otherwise print the reason (the ids without a code) and exit 1. `src/catalog.ts` is loaded with
  `await import()` inside that `try`, for the reason 4.4.5 gives. Keep the CHANGELOG check. In
  step 1 the entry point stays `src/index.html` (step 2 adds the page).
- **4.6.2** `.github/workflows/verify.yml` and `release.yml`: `bun scripts/build.ts --frozen`
  becomes `bun scripts/build.ts`.

### 4.7 Tests in step 1

- **4.7.1** `test/fixture.ts`: exports `fixtureHoursText`, `fixtureConfig`, `rows`
  (`rowsFrom(parseHours(fixtureHoursText), fixtureConfig)`), `rules` (`rulesFrom`), `codes`
  (`fixtureConfig.linkCodes`), `fixtureCatalog`, `useFixture()`. Same meaning as before.
- **4.7.2** `test/prices.test.ts`: build `live` with `buildCatalogFrom(liveHoursText, config)`,
  and its `edited()` helper from the live rows changed by it:
  `buildCatalog(liveRows.map(change), rulesFrom(config), config.linkCodes)`, where
  `liveRows = rowsFrom(parseHours(liveHoursText), config)`. No test is added or changed there;
  its snapshot stays byte for byte (0.5). New file `test/calc-estimates.test.ts`, one test, "the
  calculations page's nine estimates", snapshotting this text:

  ```ts
  const short = { ai: "AI", nimbly: "Nimbly", custom: "Custom", none: "None" } as const;
  const designs = designChoices.filter((choice) => choice.kind !== "none");
  const lines = config.calcEstimates.flatMap((estimate) =>
    designs.map((design) => {
      const start = setTile(selectionForShape("essential"), design.id, true);
      const selection = estimate.adds
        .filter((id) => hasTile(id))
        .reduce((s, id) => setTile(s, id, true), start);
      const q = quote(selection);
      const kinds = [
        `design ${q.designHours}`,
        `build ${q.implementationHours}`,
        `content ${q.contentHours}`,
        `project ${q.projectHours}`,
      ].join(", ");
      return `${estimate.title} · ${short[design.kind]}: ${q.hours}h (${kinds}) ${q.label}`;
    }),
  );
  expect(lines.join("\n")).toMatchSnapshot();
  ```

  (run under the `src/` catalog, `withCatalog(live, …)`). Today it gives Starting estimate 66h /
  79h / 137h (Essential, Essential, Growth), + Blog and Search 76h / 93h / 165h (Essential,
  Essential, Growth), + Products 102h / 122h / 220h (Platform), AI / Nimbly / Custom.

- **4.7.3** `test/table.test.ts`: its `live` (the files in `src/`) becomes
  `rowsFrom(parseHours(liveHoursText), config)`, `rulesFrom(config)` and `config.linkCodes`. Tests
  that build a catalog from changed rows keep doing so with `buildCatalog(rows, rules, codes)` on
  the fixture's `rows`; where a test serialized a table only to parse it again, pass the rows
  directly. `applyCells` and `Cells` move into the test file, as a small helper that takes the
  same keys as before (`"sections build-ai"`, `"menu·Advanced option"`: the id, `·` and the option
  when the row has one, a space, the column), so no call changes. Delete the tests of removed
  features: the old file's text round trip and quoting (moved to 4.7.4),
  `parseOlderRules`/`addedRules`, and rule/code serializing. In "a cell or rule the app cannot
  take…", the assertions on the rules file go (an unknown rule, a file without a rule's row,
  `parseOlderRules`). In their place: `rulesFrom` of a config without `custom-package` throws,
  naming it (4.4.2), and a rule left empty is still refused by the catalog
  (`drafted({}, { "pm-none-design-percent": "" })` throws "Rule pm-none-design-percent must be a
  whole number"). Keep "a new item gets the next code ever given…" (`buildCatalog` still gives codes
  with `withCodes`; "a new row is a new item" relies on it). Every link test keeps its assertions
  ("these links mean these estimates…", "survives a new limit…", the renamed-option test), with
  only `applyCells`/`parseTable` replaced as above.
- **4.7.4** New `test/hours-file.test.ts`, on `src/hours.csv` and `config.ts`:
  - the header is exactly the 11 columns; each (id, option) is there once; an item's rows are
    next to each other
  - the ids of the file and the keys of `config.items` are the same set; every key of an item's
    `options` in the config is an option row of that item in the file
  - every id the catalog gives a code has one in the config:
    `buildCatalogFrom(liveHoursText, config).codes` deep-equals `config.linkCodes`; codes are
    unique; a snapshot of `config.linkCodes` (so a moved code shows in review)
  - an hour cell is a whole number from 0, and empty exactly in the cases of 4.1.3
  - `siteUrl` is the `og:url` of `src/index.html`, read from the file, and ends with `/`
  - `package` is empty, `growth`, `platform`, or one of them + ` from N` (N a whole number ≥ 1)
  - `help` has no `{…}` other than `{build}`
  - `serializeHours(parseHours(text))` equals the file's text (it is written the app's way); the
    failure message says: "Run bun scripts/hours-fmt.ts to write src/hours.csv in the app's
    layout"
  - Google Sheets: the same text with CRLF line ends, a BOM, no final line break and every cell
    quoted parses to the same rows
  - quoted cells keep their commas, quotes and line breaks: the `parseCsv` test of
    `test/table.test.ts`, moved as it is, and a row whose `help` is `One, "two"\nthree` comes back
    the same from `parseHours(serializeHours(rows))`
  - `buildCatalogFrom(liveHoursText, config)` does not throw
- **4.7.5** The same shape checks also run on `test/fixtures/hours.csv` with its config.

### 4.8 Done when (step 1)

- **4.8.1** 0.4 is green; the prices snapshot is unchanged; the only new snapshot files are those
  of `test/calc-estimates.test.ts` and `test/hours-file.test.ts`.
- **4.8.2** The estimator at `/` looks and works as before (open it, add a few items, Copy hours,
  Share link); `/calc/` shows the placeholder line.
- **4.8.3** `bun run build` writes `docs/` without errors.
- **4.8.4** Nothing names the old files or the preview any more:

  ```sh
  rg -n 'estimator\.csv|rules\.csv|link-codes\.csv|build\.ts --frozen' \
    src test e2e scripts .github playwright.config.ts bunfig.toml
  rg -n 'preview\.ts|inPreview|is-preview|preview-bar|\?preview|in a preview' src test e2e scripts
  ```

  The first prints only the two lines of `test/changelog.test.ts` (a made-up changelog that says
  `rules.csv`); the second prints nothing. `README.md` names them until step 3.

## 5. Step 2: the new calculations page

### 5.1 Two modes

- **5.1.1** On load, when the page's hostname is `localhost`, `127.0.0.1` or `[::1]` (the names
  `mayWrite()` accepts, written again in the page: it imports only types from `api.ts`, which is
  server code), the page fetches `api/hours` (relative to `/calc/`). A 200 response with JSON
  `{ hours: string }` means **local mode** (dev server): Old = that text. Anything else, and any
  other hostname, means **public mode**: Old = `liveHoursText` bundled into the page. So the
  published page asks for nothing and its console stays free of a 404; a build served on
  localhost (5.11.1) logs one, as expected.
- **5.1.2** Local mode only: the Save button and the paste field (5.3.3). In local mode the page
  fetches `api/hours` again when the window gets focus; if the text changed (edited in an editor or
  replaced by a Sheets download), it becomes Old: edits stay, are checked again (5.5.4), and the
  page redraws.
- **5.1.3** Config is the bundled `config` in both modes.
- **5.1.4** If the text from `api/hours` cannot be used (`parseHours` or `buildCatalogFrom`
  throws): on load, the page stays in local mode with Old = the bundled `liveHoursText`, Save is
  off, and the status line says in red "src/hours.csv can't be used: <message>. Showing the hours
  the page was built with."; on a later fetch, Old stays as it was and the same red line shows
  until a fetch succeeds. This is a guard for a file caught between two writes, not the way a
  broken file is found: the dev server bundles the same file, and `catalog.ts` builds its catalog
  from it as it loads, so a `src/hours.csv` the app cannot read stops both pages before this code
  runs, as a broken `estimator.csv` did at 291e83e. `bun scripts/hours-fmt.ts` names the problem
  (6.3). No change to `catalog.ts` for this.

### 5.2 Layout

- **5.2.1** `src/calc/index.html` stays (title "Calculations · Website packages", `noindex`,
  `../styles.css` then `./calc.css`). Page max width 1440px, centred, the app's cream ground.
- **5.2.2** Top to bottom: the header (5.3.1), the status line (5.3.2), the local bar (local mode
  only, 5.3.3), then a two-column grid: the sheet card on the left, as wide as its content; the
  Estimates card on the right, `minmax(460px, 1fr)`, sticky at the top of the window while the
  sheet scrolls (`position: sticky; top: 16px`, its own vertical scroll if taller than the
  window). Below 1100px wide the two stack (sheet first). The sheet card has no scroll of its own
  (the sheet is about 680px wide), so its sticky header rows stick to the window. Below 720px
  wide only, the sheet card scrolls sideways and its header rows are not sticky. The page itself
  never scrolls sideways.

### 5.3 Header, status line, local bar

- **5.3.1** Header: "Calculations" (the serif title of the old page), under it "Every hour of
  the estimator, from hours.csv." and a link "Open the estimator" (`../`). On the right, buttons:
  **Download hours.csv** (5.5.6), **Copy share link** (says "Link copied" for 2 seconds; off when
  there are no edits), and in local mode **Save to src/hours.csv** (the primary button; off when
  there are no edits; 5.7). Copy share link copies `location.href`, except on a local hostname
  (the three of 5.1.1), where it copies the published page's address with the page's hash,
  `siteUrl + "calc/" + location.hash` (4.2.7): a localhost address opens for nobody else. The
  published page may have other hours than the disk; a link says what each edit was made on, so
  the page that opens it marks those (5.5.4).
- **5.3.2** Status line: with edits, a yellow count chip, "edits, kept in this page's link", and an
  **Undo all** button (empties the edits and the hash). Without: "No edits. Change an hour or a
  package to see what it does to the estimates." Add, when there are any: "· N made on other
  hours" (5.5.4) and "· N of this link could not be used" (5.5.5). After a Save: "Saved to
  src/hours.csv" for 6 seconds. The dev server reloads the page when `src/hours.csv` changes (it
  did so at 291e83e too), so the page sets `sessionStorage["website-packages.saved"]` before
  sending, shows the message after the reload when it finds the flag, and removes it. This is the
  only browser storage the page uses.
- **5.3.3** Local bar (dashed edge): "Localhost:" a text field "Paste a shared link" and **Open**.
  Open takes the text after `#` of what was pasted (a whole URL or just the hash), and if it
  starts with `e1.`, makes it the page's hash with `history.pushState` and applies it, replacing
  the page's edits; otherwise the status line says "That link has no edits." and nothing
  changes. The page listens to `popstate` and `hashchange` and applies the hash it finds, so Back
  returns to the previous edits.

### 5.4 The sheet

- **5.4.1** Columns: Item | AI: Design, Build | Nimbly: Design, Build | Custom: Design, Build |
  Package. Two header rows (design names over Design/Build), sticky while scrolling; Design
  headings and design inputs in the design colour (`--design`), as the old page does.
- **5.4.2** Rows: every row of `hours.csv`, grouped and ordered exactly as the old page's
  table does (`placeInfo` and `itemRows` in `src/calc/calc.ts` at 291e83e): section rows "Site
  basics", "Shelf", "Blog", "Product catalogue", "Memberships" (titles only, no notes); an item
  with options has its name once with its options indented under it; an option named
  `Group: Option` sits under a small `Group` heading; the catalogue shows each source with its
  options, then its parts. No project management row, no status, type, start, max or tier.
  `catalogue-custom` is not a row of its own, as on the old page (`tableCard`): each source's
  Custom option row stands for it ("hours entered in the estimate"). It is the only row of
  `hours.csv` the sheet does not show; its `package` is edited in the file only.
- **5.4.3** Item cell: 150px wide, names wrap. Under the name, the caption of the old page's
  `captionOf()` ("Per template", "Source, with its options", …), without its two "… entered in
  the estimate" captions: the row's cell says that (5.4.4). Help text belongs to a row: an
  item without options has it on its name; an item with options has it on each option's name, and
  its heading (the name above the options) has none. A name whose row has help text is underlined
  with dots and opens the help popover (5.4.7); one with empty help has no underline and no
  popover.
- **5.4.4** Hour cells: a text input 46px wide, right-aligned, tabular figures,
  `inputmode="numeric"`, aria-label "<item>[ · <option>], <AI|Nimbly|Custom> <design|build>
  hours". A cell empty by 4.1.3 (b) shows "–" and is not editable. A row empty by 4.1.3 (a) shows
  one cell across the six columns: "hours entered in the estimate", in italics.
- **5.4.5** Package cell: a select Any / Growth / Platform, and, on rows whose config unit counts
  something (a unit that is not empty, `hours` or `build and design hours`), "from" with a small
  number input (empty: from the start). Its value maps to the CSV as Any `""`, Growth `growth`,
  Platform `platform`, Growth from 5 `growth from 5`.
- **5.4.6** Editing: a value is applied on every input event when it is valid (hours: 0 to 9999,
  digits only; package: as 5.4.5) and the catalog builds with it (`buildCatalogFrom` on Old with
  all edits); otherwise the input gets a red edge, the status line shows the app's message, and the
  value is not kept. Numbers are kept as `String(Number(value))`, so "05" is 5 and equal to an Old
  of 5 (not an edit). On blur, an input left invalid or empty shows its last valid value again and
  loses its red edge. Enter applies and moves to the same column one row down; Escape puts back
  the value from before the focus. Redrawing must keep focus and caret in the input being typed
  in.
- **5.4.7** Help popover: on hover or focus of the name, a dark popover (role `tooltip`, linked
  with `aria-describedby`, Escape closes) with the `help` text, `{build}` shown as a small code
  chip, and when the text has `{build}`, a second line "{build} in the app: AI 2h · Nimbly 2h ·
  Custom 4h" from the row's current (New) build hours. The old page's tooltip (`c-tip`,
  `showTip`) can be reused.
- **5.4.8** An edited value (New differs from Old): the input is yellow (`--tick`), with a small
  round ↺ button on its top-right corner showing Old's value struck through (aria-label "Put back
  <old>"); it removes that edit. The package cell has one ↺ for the select and "from" together.
- **5.4.9** An edit made on other hours (5.5.4): a dashed red edge (`--remove`) on the input, and
  its popover on hover/focus says "This link changed 3 → 6, but hours.csv has 4 now. 6 is used; ↺
  puts 4 back."

### 5.5 Edits and the link

- **5.5.1** An edit is `{ id, option, column, was, now }`: the cell, the Old value when the edit
  was made (or as the link says), and the new value. New = Old with each edit's `now`.
- **5.5.2** The page's hash is the edits, kept up to date with `history.replaceState` on every
  change (no hash when there are none). No `localStorage`. A hash that does not start with `e1.`
  (such as an old `/calc/#<estimate>` link) is ignored.
- **5.5.3** Format, in `src/calc/edits.ts` (pure functions `encodeEdits`, `decodeEdits`, unit
  tested):

  ```
  #e1.<edit>.<edit>…
  edit    <code>[-<option>]<column><was>~<now>
  code    the item's code in config.linkCodes (decimal)
  option  the option's place in that entry's options, from 1 (decimal); absent without options
  column  a ai-design · b ai-build · c nimbly-design · d nimbly-build · e custom-design ·
          f custom-build · p package
  value   hours: a whole number (decimal)
          package: n (Any) · g (growth) · p (platform), followed by the "from" number if any
  ```

  Edits are written sorted by code, option, column. Examples: Menu · Simple, AI design 1 → 4 is
  `43-1a1~4`; Sections, Nimbly build 2 → 3 is `42d2~3`; Page templates' package growth from 5 →
  growth from 3 is `41pg5~g3`; the four together with Sections, Custom build 4 → 3:
  `#e1.41pg5~g3.42d2~3.42f4~3.43-1a1~4`.

- **5.5.4** Reading a link, and whenever Old changes: an edit whose `now` equals Old is dropped;
  an edit whose `was` differs from Old is "made on other hours" (5.4.9) and still applied.
- **5.5.5** An edit that does not parse, names a code or option that does not exist, or a cell
  that cannot be edited (4.1.3), or that the catalog refuses, is skipped and counted (5.3.2).
  Two edits of the same cell: the last one counts.
- **5.5.6** Download: `serializeHours` of New, as a file named `hours.csv` (a Blob and an
  `<a download>`), in both modes.

### 5.6 The Estimates panel

- **5.6.1** For each of `config.calcEstimates` and each design AI, Nimbly, Custom (`designChoices`
  without `none`), the selection is made as the old page's `startWith` makes it:

  ```ts
  const start = setTile(selectionForShape("essential"), design.id, true);
  const selection = adds.filter((id) => hasTile(id)).reduce((s, id) => setTile(s, id, true), start);
  ```

  It is priced with `quote()`
  under the Old catalog and under the New one (`withCatalog`). Total = `hours`, Design =
  `designHours`, Build = `implementationHours`, Content = `contentHours`, Project =
  `projectHours`, package = `label` (the package's name, as the old page shows it).

- **5.6.2** Panel: heading "Estimates"; a key line: **Old** hours.csv · **New** with the edits on
  the left · a yellow sample "differs" · ▲ more hours · ▼ fewer. Then a grid: column heads AI,
  Nimbly, Custom; for each estimate row its title ("Starting estimate", "+ Blog and Search",
  "+ Products") across the grid, then three cards.
- **5.6.3** A card:
  - top line, left, large and bold: the total's change, "▲ 4h +6%" in `--remove` for more hours,
    "▼ 8h −6%" in `--content` for fewer, or "no change" in a faint colour. Percent = change ÷ Old
    total, rounded. Top line, right: the package; when Old and New differ, "~~Essential~~ →
    Growth" with Growth in yellow
  - a small table, columns Total, Design, Build, Project, and Content only when Old or New has
    content hours. Row "Old": Old's values in a faint colour. Row "New": New's values in bold, the
    total larger; each value that differs from Old on a yellow ground (separate pills, not one
    bar). Under the New row, for each value that differs, "▲ 3" or "▼ 7" in the colours above
  - when nothing in the card changed: the New row only, and "no change" on the top line
  - a card with a change has a faint yellow ground (`--tick` mixed into the card's white)
- **5.6.4** Example to check against (src/ on 2026-11-20, the four edits of 5.5.3): Starting
  estimate · AI: Old 66h (17, 34, 15) Essential, New 70h (20, 34, 16) Growth, "▲ 4h +6%";
  Starting estimate · Custom: Old 137h, New 129h (52, 54, 23), "▼ 8h −6%", Growth; + Products ·
  Nimbly: Old 122h, New 131h (44, 63, 24), "▲ 9h +7%", Platform.

### 5.7 Local save: `src/calc/api.ts` and `src/server.ts`

- **5.7.1** Route `/calc/api/hours` (dev server only):
  - `GET`: `{ hours: <text of src/hours.csv> }`, `cache-control: no-store`
  - `POST`, JSON body:

    ```ts
    type SavedEdit = { id: string; option: string; column: HoursColumn; value: string };
    type SaveBody = { edits: SavedEdit[] };
    ```

    `value` is the CSV cell's text: hours as digits, a package as `""`, `growth`, `platform` or
    `growth from 5` (not the link's `g5`). A body that is not JSON, not an object, or has no
    `edits` array: 400 `{ error: "No edits were sent" }`. It reads `src/hours.csv` from disk,
    sets each cell (an unknown row, a column that is not an hour column or `package`, a cell empty
    by 4.1.3, or a value that is not valid: 422 `{ error }` naming it, file untouched), checks the
    result with `parseHours` and `buildCatalogFrom` (422 with the message if it fails), writes
    `serializeHours` of it, answers `{ hours: <new text> }`

  - who may write: keep `mayWrite()` as it is (this machine, this page's origin, JSON); otherwise
    403 `{ error: "Only the calculations page on this machine can save" }`
  - one save at a time, and a read waits for a save in progress (keep the `oneAtATime` queue)
- **5.7.2** The page's Save sends its edits; on 200, Old = the returned text, the edits and the
  hash are emptied, and the status line says "Saved to src/hours.csv". On an error, the edits stay
  and the status line shows the message.

### 5.8 The build

- **5.8.1** `scripts/build.ts` builds both pages: entry points `src/index.html` and
  `src/calc/index.html`, into `docs/index.html` and `docs/calc/index.html` (check the output paths;
  shared chunks are fine). It prints "Wrote docs/index.html and docs/calc/index.html". Checked on
  2026-11-20 with Bun 1.4.5 and the old page: the two entry points give exactly those two files,
  the chunks land in `docs/`, and the calc page links them as `../chunk-….js` and `.css`.
- **5.8.2** The built calc page has no API: it runs in public mode (5.1.1).

### 5.9 Styles: `src/calc/calc.css`

- **5.9.1** Rewritten for this page only. Colours only through tokens of `src/styles.css` or the
  page's own custom properties made of them (enforced by `test/styles.test.ts`). Yellow is
  `--tick`, more hours `--remove`, fewer hours `--content`, design `--design`, project
  `--project`.

### 5.10 Tests in step 2

- **5.10.1** `test/edits.test.ts`: encode/decode round trip (hours, package with and without
  "from", items with and without options); the examples of 5.5.3 decode to those edits and encode
  back to the same text (this locks the format); bad input (wrong prefix, bad edit, unknown code
  or option, wrong value) is reported and skipped; the last of two edits of one cell counts.
- **5.10.2** `test/api.test.ts` on a temporary folder with a copy of `src/hours.csv`: GET gives
  the file; POST applies edits and writes the app's layout; a bad edit or a file the app cannot
  read is refused with 422 and leaves the file as it was; two saves at once run one after the
  other; a body with no edits is refused with 400; the "who may save" tests kept from step 1.
- **5.10.3** `test/page.test.ts`: the build of `src/calc/index.html` keeps its title and
  `noindex`.
- **5.10.4** `e2e/calc.e2e.ts` (dev server; expected prices computed in Node with `quote()` and
  `buildCatalogFrom`, as `e2e/estimator.e2e.ts` does):
  - every row of `hours.csv` is in the sheet, in the sections and order of 5.4.2; no status,
    type, start, max or tier
  - editing an hour: yellow, ↺ with the Old value, the hash has the edit, the Estimates cards
    show Old and New and the change; ↺ puts it back and the hash empties
  - a package edit (from 5 → from 3 on Page templates): the cards show Essential → Growth
  - a reload keeps the edits; opening a link with edits applies them; a link whose `was` differs
    from the file marks the cell (5.4.9); unreadable edits are counted
  - Copy share link copies the published page's address with the page's hash,
    `siteUrl + "calc/" + hash`, since the dev server is on localhost (grant clipboard permission);
    pasted into the local bar, that address applies the same edits; Download gives a `hours.csv`
    whose text is `serializeHours` of New
  - local mode: Save sends the edits (intercept `POST **/calc/api/hours` with `page.route`;
    never write the real file from a browser test), then the page shows "Saved" and no edits
  - public mode (`page.route` answers `api/hours` with 404): no Save button, no local bar
  - the help popover opens on hover and on keyboard focus and shows the `{build}` line
  - at 1440×900 the sheet and the Estimates card are side by side, the card stays in view when
    the sheet scrolls, and the page does not scroll sideways

### 5.11 Done when (step 2)

- **5.11.1** 0.4 is green. `bun run build` writes both pages; opening `docs/calc/index.html`
  through a static server shows public mode.
- **5.11.2** Checked in the browser at 1440×900 against 5.2 to 5.6 and the mockup.

## 6. Step 3: the README

- **6.1** Rewrite "Hours and rules: the files" for `src/hours.csv` (its columns, the 0 rule of
  4.1.3) and `src/config.ts` (what is in it; adding an item: a row, an `items` entry, the next link
  code by hand). Say that `id` and `option` must never be edited, in Sheets or anywhere: they tie
  a row to its config and to its link code (renaming an option breaks links). `item` (the name),
  `help`, the hours and `package` may be edited.
- **6.2** Rewrite "Changing them: the calculations page" for 5.1 to 5.7: public and local mode,
  editing, ↺, the share link, Download, Save, the Estimates panel.
- **6.3** A short "With Google Sheets" part: File → Import → Upload `hours.csv` (or open the
  downloaded one); edit; File → Download → Comma-separated values; replace `src/hours.csv`; run
  `bun scripts/hours-fmt.ts` (puts it in the app's layout, 4.4.5); run `bun test`: it shows the
  price changes, accept them with `bun test --update-snapshots`.
- **6.4** Update "The tests check three things apart" for the new fixture and tests; in "Links",
  name `config.linkCodes` instead of `link-codes.csv`; remove `--frozen` and `link-codes.csv`
  from "Releasing".
- **6.5** Add `bun scripts/hours-fmt.ts` to the table of "Commands". Done when
  `rg -n 'estimator\.csv|rules\.csv|link-codes|\?preview|build\.ts --frozen' README.md` prints
  nothing, and no sentence still says the calculations page is for the dev server only.

## 7. Out of scope

- **7.1** No change to how anything is priced, to the estimator's look, or to share links of
  estimates.
- **7.2** No editing of help text, names, statuses, rules or link codes on the page; they are
  edited in `hours.csv` (names, help) or `config.ts`.
- **7.3** No new dependencies.
- **7.4** No link from the estimator to the calculations page: it is reached by its address.
- **7.5** No message on the page for a `src/hours.csv` the app cannot read: it stops the dev
  server's pages as a broken file does today (5.1.4), and `bun scripts/hours-fmt.ts` names the
  problem.
