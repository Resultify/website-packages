# Website packages

## Requirements

- [Bun](https://bun.sh) 1.4.4 or newer: it runs the app and the unit tests, type-checks (`bun check`) and formats (`bun fmt`)
- For the browser tests: [Node.js](https://nodejs.org) (Playwright runs on Node) and Google Chrome

## Getting started

```sh
bun install
bun run dev
```

The dev server runs at http://localhost:4173 with hot reload, the calculations
page at http://localhost:4173/calc/. Set `PORT` to use another port.

## Commands

| Command                    | What it does                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bun run dev`              | Start the dev server with hot reload                                                                             |
| `bun run start`            | Start the server without hot reload                                                                              |
| `bun test`                 | Run the unit tests in `test/`                                                                                    |
| `bun run e2e`              | Run the browser tests in `e2e/` in Chrome; starts the server if none is running                                  |
| `bun check`                | Type-check                                                                                                       |
| `bun fmt`                  | Format the code; `bun fmt --check` only checks                                                                   |
| `bun run build`            | Build the estimator and the calculations page into `docs/`, to preview them; the Release workflow publishes them |
| `bun scripts/hours-fmt.ts` | Write `src/hours.csv` (or the file given) in the app's layout, or say what the app cannot read in it             |

The tests check three things apart:

- **How an estimate is priced.** These tests price with a copy of `hours.csv`
  and `config.ts` in `test/fixtures/`, taken on purpose and changed only by
  hand, and check exact hours, packages and links against it. Changing the
  files in `src/`, on the calculations page too, does not change them. Copy the
  files there again, and update the numbers, when the files change in a way a
  test should know of
- **The files in `src/`.** `test/hours-file.test.ts` checks both files, and the
  fixture's: the 11 columns of `hours.csv`, each row once, the items of
  `config.ts` in the file's order, whole hours wherever the estimate does not
  enter them, packages as the app writes them, the app's layout (a Google
  Sheets download reads the same), and a link code for everything. Every row
  and rule is read; every item and option, at its lowest and highest, is
  priced with every design; an estimate's hours must add up, and its link must
  give the same estimate back. The estimator's browser tests run on these
  files too
- **What the files in `src/` cost.** `test/prices.test.ts` prices them: the
  starting estimate with each design, the same with extra feedback rounds,
  variants and languages, and the hours of every basic with a quantity or
  options and of everything the shelf offers, with its parts: each option,
  each quantity at its start and at its most, with the package and tier it
  needs. `test/calc-estimates.test.ts` prices the calculations page's fifteen
  estimates, and checks that each preset's link opens one. The prices are kept in `test/__snapshots__/`, with the link codes.
  A change of hours, packages, limits or rules, saved from the calculations
  page too, fails these tests until you accept the new prices with
  `bun test --update-snapshots`; commit the snapshots with the files, so the
  price change shows in the review

The calculations page has its own tests: its edits and their link in
`test/edits.test.ts`, its Save in `test/api.test.ts`, and the page in
`e2e/calc.e2e.ts`, which never reads or writes `src/hours.csv`.

## Hours and rules: the files

The estimator is built from two files in `src/`:

| File                         | What it holds                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`hours.csv`](src/hours.csv) | The hours: one row for each item, or each option of an item (Menu has a Simple row and an Advanced row), with its help text and the package it needs |
| [`config.ts`](src/config.ts) | Everything else: where each item is shown and what it counts, the rules, the link codes, and the estimates of the calculations page                  |

`hours.csv` opens in Google Sheets as it is (see
[With Google Sheets](#with-google-sheets)). Its columns:

| Column                          | What it holds                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | The item's name in the code. The rows of one item share it. Not `project-management` or `ai-variants`: the estimate makes lines of its own with them |
| `item`                          | The item's name in the estimator                                                                                                                     |
| `option`                        | The option's name, empty on an item without options. `Dynamic pages: Simple` puts the option under a small heading. An option name cannot have `\|`  |
| `help`                          | The line under the name in the estimator, and the help on the calculations page. `{build}` shows the build hours for the estimate's design           |
| `ai-design`, `ai-build`         | Design and build hours with AI generated design: for each unit when the item counts something                                                        |
| `nimbly-design`, `nimbly-build` | The same with Nimbly design                                                                                                                          |
| `custom-design`, `custom-build` | The same with Custom design. With no design, the build hours are Custom's                                                                            |
| `package`                       | Empty: any package. `growth` or `platform`; `growth from 5` means from 5 on. On an option: while chosen                                              |

**Never change `id` or `option`**, in Google Sheets or anywhere: they tie a row
to its entry in `config.ts` and to its link code, and a renamed option breaks
the links that have it. `item`, `help`, the hours and `package` can be changed.

Every hour is a whole number from 0. A cell is empty only where the estimate
takes no hours from it: every hour cell of an item whose hours are entered in
the estimate (unit `hours` or `build and design hours`), and the design cells
of the kick-off and training (type `project`), which have no design hours. Every
other cell has a number, 0 too: an item coming soon or hidden has 0 hours for
now. The tests check this, and that the file is in the app's layout, as
`bun scripts/hours-fmt.ts` writes it.

`config.ts` has, for each `id` of `hours.csv`, in the file's order, an entry in
`items`. An option's own values go in its `options`, where the rows of one item
differ (`menu: { place: "basics", options: { Simple: { start: 1 } } }`):

| Key                    | What it holds                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `place`                | Where the estimator shows it: `basics`, `shelf`, `blog`, `catalogue` or `membership`. The basics, the Blog's and Memberships' items are fixed                                                                                                                                              |
| `type`                 | None: build hours. `content`: content hours, counted apart. `project`: Project hours, with project management. Shelf items choose; in the site basics it is fixed: `project` for the kick-off and training, none for the others                                                            |
| `status`               | None: live. `soon`: shown, locked. `hidden`: nowhere, left out of every estimate. Shelf items, the catalogue's sources, the parts added on their own, and each option                                                                                                                      |
| `unit`, `start`, `max` | What the item counts, the quantity it starts at, and the most. No unit: on or off. `hours`: hours are entered. `build and design hours`: both are entered, each in its field. The header, footer, setup and launch and kick-off take none, and no options: they are in every estimate once |
| `tier`                 | `professional` or `enterprise`; `enterprise from 3` means from 3 on. On an option: while chosen                                                                                                                                                                                            |

Next to `items`:

- `rules`: what is not hours per item: design variants, feedback rounds, the
  package each design needs, project management, languages and website pages.
  Every rule is there, even one left empty (a package rule with no package):
  a config without one is refused, so a lost rule can't quietly price a design
  with no package
- `linkCodes`: each item's number in a link, and the order of its options (see
  [Links](#links))
- `calcEstimates`: the calculations page's presets, each a title and the code
  of an estimator link (what follows its `#`)
- `siteUrl`, apart from `config`: the published site's address, for the
  calculations page's share link

Every number, in `hours.csv` and in `config.ts`, is a whole number: hours,
quantities and percents.

Every estimate has one of four designs. Each has its own build and design
hours; its feedback rounds and the package it needs are in the `rules` of
`config.ts`. Every design includes three feedback rounds; the estimator's
**Extra feedback** counts the ones past them, from 0:

- **AI generated**: a design generated in full by AI, with no Nimbly
  templates: a prototype first, to agree on the content structure and each
  template's wireframe, then whole designs from it (5 variants included, each
  one more half of the AI design hours, counted from 0 in **Extra variants**)
  for the client to pick one. Then 3h a feedback round. A share of the
  estimate's total comes off, by its package: 20% with Essential, 25% with
  Growth, 30% with Platform (the rules `ai-discount-essential-percent`,
  `ai-discount-growth-percent` and `ai-discount-platform-percent`), rounded
  down to whole hours, so the total rounds up as every share does: 20% of 51h
  is 41h. Design, Build, Content and Project keep their hours, and only the
  total is less. Its button has a sticker with the most a package gets ("up
  to −30%"; just "−20%" when every package gets the same). The Total panel
  shows the total after it large, with the one before it struck through
  beside it and a sticker with this estimate's share ("−25%"). Under them, in
  the wide sidebar only, each package's share, drawn as the package card's
  three dashes, this estimate's in yellow. Copy hours and the Hours breakdown
  list "AI design discount · 25%: −25h" over the total, and the calculations
  page's AI totals are after it
- **Nimbly**, the one a new estimate starts with: a designer adapts Nimbly's
  default templates to the client's brief. Then 3h a feedback round
- **Custom**: a designer creates a fully custom design from the client's brief.
  Then 5h a feedback round. Needs Growth
- **None**: the client provides the design. No design hours, and the build
  hours are Custom's. Needs Growth

**Read more**, after the note of AI generated, Nimbly and Custom, opens what
the design includes, step by step, with the numbers of the rules: the feedback
rounds and variants included, what more costs, and the package it needs. Its
words are `designDetails` in `src/estimator.ts`.

An estimate and its link hold the whole number of feedback rounds and
variants, not the extra ones: a link made when fewer were included opens with
at least the ones included now.

The site basics always have the kick-off meeting (3h, apart from setup and
launch), training (2 sessions of 2h) and project management: one share of the
estimate's design, build and content hours (not of the kick-off, training or
anything else of type `project`), rounded up, whatever the design: 15%, the
rule `pm-percent`. With no design, the client's design is still checked, handed
over and built from, so it also counts half the design hours Custom would have
for the same items, rounded up: the rule `pm-none-design-percent`, 50. None of
them has design hours.

Hours count in four groups: **Design**, **Build**, **Content** and
**Project**, the work around the site: the kick-off and training (type
`project` in `config.ts`) and project management. The name is `projectName` in
`src/catalog.ts`. The estimator shows Project in the total, the dot grid (in
blue), first on the site basics' title line (as Content is first on the
estimate's; their labels show from 1341px wide, their colour alone below) and
in a fold of its own in the site basics.

Design comes before Build everywhere: on the title lines (after Content or
Project), in each item's figures (Design over Build; with no design hours,
Build alone on the first line), on the shelf and its key, in the fields of
Custom integration, in the columns of `hours.csv` and of the calculations page.
The total on the left and the hours breakdown keep their own order.

An item with parts (the Blog, the Product catalogue, Memberships, and the site
basics' two folds) has its total on its first line, larger, each figure after
its label (Design, Build, or Project) as the column's head writes its sums. The
parts' figures under it are bare and lighter.

The shelf lists its items, the Blog, the Product catalogue and Memberships in
the order of their rows in `hours.csv` (an item's first row), in the group
of the package each needs; what is coming soon sits locked at the end of its
group, in the same order. To move one, move its rows, and its entry in the
`items` of `config.ts` with them.

**Copy hours** and **Hours breakdown** say the same, for a quote: the package
and tier, then Design (with the design chosen), Build, Content and Project,
each with its lines and hours, and the total. Feedback rounds, variants and
languages are listed even when all are included ("Feedback · 3 rounds:
included"); past that, with how many are extra ("5 rounds (3 included, 2
extra): 6h"). Project management is the last line of Project ("15% of 101h:
16h"; with no design "15% of 81h (60h + 50% of 41h client design): 13h").

In the catalogue, every item that is not a part is a source of products, with
the same options: `product-catalogue` (HubDB, the catalogue on the shelf),
`catalogue-crm` (CRM Object) and `catalogue-objects` (Custom Object). An
estimate's catalogue has one source; the estimator's Source buttons switch it,
keeping the option when the new source has it live. Each source has its own
hours, package and tier on each option, and is live while one of its options
is. The hours entered for Custom (`catalogue-custom`) go with whichever source.
A source added with no options is `soon` or `hidden` until it has some.

**Memberships** (HubSpot private content: pages and posts only signed-in
members see) is one card, counted as if the theme had the membership templates:

- `membership`: how members sign in, its options. **Invitation** (HubSpot emails
  members a link to set a password), **Self-registration** (visitors sign up
  and confirm their email), **SSO** (the client's identity provider, SAML or
  OpenID Connect, runs sign-in; no design hours). Each needs Content Hub
  Professional
- `membership-groups`: **Access groups**, always in with it, so many hours each.
  Professional allows 2; `enterprise from 3`
- `membership-social`: **Social sign-in** (Google or Microsoft), added on its
  own. Needs Enterprise, and does not go with SSO
- `membership-area`: **Member area**, pages with the member's own CRM data,
  added on its own, with its build and design hours entered

Recent blog posts, Favorite products, Related products, Social sign-in and
Member area, the parts added on their own, each have a status too, in
`config.ts`: `soon` shows them locked in their card, `hidden` takes them out.
The Blog's list and post templates and Memberships' access groups are always
in their card; the templates have a status on each option.

The blogs share one list template, one post template and one Recent blog posts
section. With more than one blog, each has a counter, up to one for each blog:
templates for the list and post templates, versions for Recent blog posts (a
blog with its own design of it). Their hours (build and design) count once for
each ("List template · Advanced · 2 templates", "Recent blog posts · 2
versions"). The counts are items of their own for the link (`blog-list-count`,
`blog-post-count`, `blog-recent-count`), made by the app, not rows of
`hours.csv`; their codes are in `linkCodes` too.

A new item takes, by hand:

- a row in `hours.csv` for it, or one for each of its options, in the order the
  estimator shows it
- an entry in the `items` of `config.ts`, in the same order
- a code in `linkCodes`: the next after the highest ever given, with its
  options in order. A new option of an item goes at the end of its list

A code is never given to anything else or changed, so items are not deleted:
set them to `hidden`. Only an item that is not committed yet can be taken out.
The tests and the build stop on an item without a code, naming it, and with the
row's or rule's name when something cannot be read.

## Changing the hours: the calculations page

The calculations page shows every hour and package of `hours.csv`, open to
change, and what a change does to fifteen estimates. It is published with the
estimator, at https://resultify.github.io/website-packages/calc/, and the dev
server has it at http://localhost:4173/calc/. The estimator has no link to it.

- **Old and New.** Old is the `hours.csv` the page has: the one it was
  published with, or on the dev server `src/hours.csv` as it is on disk. New is
  Old with the page's edits
- **The sheet** is laid out as the estimator is: **Site basics**, the
  **Shelf**, the **Blog**, the **Product catalogue** (its sources, each with
  its options, then its parts) and **Memberships**. An item with options has
  its name once, with its options under it. Each row has its design and build
  hours with AI, Nimbly and Custom design, and its package: Any, Growth or
  Platform, and "from" on an item that counts something. A hidden item is a
  row like any other
- **In development.** What the estimator shows locked (an item, source or
  option coming soon, and the parts of an item that is: all of Memberships) is
  striped over, its hours shown faint and not edited. A lock and "In
  development" sit on the section, item or option that is all of it. To
  change its hours, edit `hours.csv`; once it is live in `config.ts`, the page
  edits it too
- Not on the page: names, help, status, type, start, max, tier, rules, link
  codes, and new items. They are changed in `hours.csv` or `config.ts`. A row
  whose hours are entered in the estimate says so, with nothing to change; the
  kick-off and training have no design hours (–). The package of Custom in the
  Product catalogue (`catalogue-custom`) is changed in the file only
- **Help.** A name underlined with dots has a note in the estimator: hover
  over it, or focus it, to read it. It is the estimator's own words, as a new
  estimate shows them (with Nimbly design's build hours where `help` says
  `{build}`, the page's edits in them), and nothing more: change the note in
  `hours.csv` and both pages show the new one
- **Editing.** A change counts as you type, once it is a whole number from 0
  to 9999 and the app can price with it; otherwise the field has a red edge
  and the line under the title says why. Enter goes to the same column one row
  down; Escape puts back the value from before. A changed value is yellow, with
  a ↺ on it that shows Old's value and puts it back. **Undo all** takes back
  every edit
- **The link.** The edits live only in the page's address (`/calc/#e1.…`): a
  reload keeps them, Back goes to the edits before, and nothing is kept in the
  browser. **Copy share link** copies it; on the dev server, it copies the
  published page's address with the same edits, since a localhost address
  opens for no one else. Each edit in a link carries the value it was made on:
  where `hours.csv` has another value now, the field has a dashed red edge, a
  note on it says so, and the edit is still used. An edit the page cannot use
  (an item or option that is gone or in development, a value the app refuses)
  is left out and counted on the line under the title
- **Download hours.csv** gives the file with the edits, to replace
  `src/hours.csv` or to open in Google Sheets
- **Estimates.** The panel on the right prices fifteen estimates with Old and
  with New: five presets, from the starting estimate to one with the Blog,
  Search, custom forms and the Product catalogue, each a band of AI, Nimbly
  and Custom design, side by side where the panel is wide enough (at 1440px)
  and one under another where it is not. Each design has a tone, the shelf's
  muted colours, on its cards and on its columns in the sheet: AI lavender,
  Nimbly sage, Custom tan, Design a shade deeper than Build, a white gap
  between designs. Every other item in the sheet is on a cream stripe, and the
  row under the pointer, or with the cursor in it, on a deeper sand with a bar
  on its name. A preset is an estimator link (`calcEstimates` in
  `config.ts`, made with Nimbly design): the other designs take its design's
  place, with their own included feedback rounds and variants. To change one,
  make the estimate in the estimator and put its link's code in its place; a
  row's title opens its link in the estimator. A card leads with
  the change of the total ("▲ 4h +6%", "▼ 8h −6%" or "no change") and the
  package, old → new when it moves. Under it, an Old row and a New row of
  Total, Design, Build and Project, and Content when there is any; each value
  that moved is yellow, with how much
- **On the dev server** the page also has **Save to src/hours.csv**, and a bar
  to paste a shared link into: **Open** gives the page that link's edits in
  place of its own. Save writes the edits into `src/hours.csv`, once the app
  can read the result; the page reloads and says "Saved to src/hours.csv", and
  the estimator on the dev server uses the new hours at once. The page reads
  the file again when you come back to its window, so a change made in an
  editor shows there too; the page's edits stay, checked against it

To change the hours the site publishes: make the edits on either page, open
their link on the dev server (paste it in the bar) and Save. Run `bun test`: it
shows the price changes; accept them with `bun test --update-snapshots` and
commit `src/hours.csv` with the snapshots. It is published with the next
release (see [Releasing](#releasing)). To throw a save away:
`git checkout src/hours.csv`.

### With Google Sheets

1. In Google Sheets, **File → Import → Upload** `src/hours.csv`, or the
   `hours.csv` that Download gave.
2. Change what you need: `item`, `help`, the hours and `package`, never `id` or
   `option`.
3. **File → Download → Comma-separated values (.csv)**, and put the download in
   place of `src/hours.csv`.
4. Run `bun scripts/hours-fmt.ts`: it writes the file in the app's layout (a
   download has its own line ends and quoting), or says what the app cannot
   read in it.
5. Run `bun test`: it shows the price changes; accept them with
   `bun test --update-snapshots`, and commit them with the file.

## Links

An estimate's address is a short code after the `#`: the starting estimate is
five letters, such as `#eNn0g`. In order, it holds:

- a check of the rest, so a link cut short or mistyped is refused instead of
  opening another estimate
- one bit for the website pages (up to what Starter takes, or more: the two the
  estimator offers)
- the design, with its feedback rounds and AI variants
- a number for each site basic that has one (page templates, sections, menu,
  languages, training). The header, footer, setup and launch and kick-off are
  in every estimate once, and not in a link
- every other item that is in, by its code in `config.linkCodes`, with its
  number

The items of the shelf have the lowest codes, in the order of `hours.csv`, each
with its parts; a link carries a bit for each code up to its highest, or lists
the codes when it has a few high ones, whichever is shorter. Numbers count from
the least they can be, so the usual ones take one bit. A link keeps working when
hours, limits, the names of items or the order of rows change. See
`src/link.ts` and `encodeSelection` in `src/quote.ts`.

A link holds the estimate, not its hours: opened after the files have changed,
it shows the hours of the new files.

## Changelog

**Changelog**, under Reset in the sidebar, lists the releases in a dialog, each
with its sections (New, Fixed); under it is the app's name and version, with
Beta while the version is 0.x. Both are read from
[`CHANGELOG.md`](CHANGELOG.md) by [`src/changelog.ts`](src/changelog.ts).
release-please writes the file from the commit messages: don't edit it on
`main` by hand, only in a release PR (see [Releasing](#releasing)). Its lines
are for the people who use the estimator.

## Releasing

A release is made from a draft PR that
[release-please](https://github.com/googleapis/release-please) keeps open
(`.github/workflows/release.yml`):

1. Commits land on `main`.
2. release-please updates a draft PR titled `chore: release 0.3.0`. It holds
   the new `version` in `package.json` and a new top section in `CHANGELOG.md`:
   **New** for `feat` commits, **Fixed** for `fix`. Other types are left out.
   Every new commit on `main` rewrites the draft (a force-push), which loses
   any edits in it.
3. To release:
   1. Optionally, edit `CHANGELOG.md` in the draft: remove a duplicate, add a
      refactor worth mentioning, reword a line. Commit it as
      `docs: edit the release notes`. Edit last: a later commit on `main`
      throws the edit away.
   2. Click **Ready for review**. The full checks run on the PR: types, unit
      tests, browser tests and a build.
   3. **Squash-merge** the PR.
4. The Release workflow then tags `v0.3.0`, makes the GitHub release with the
   `0.3.0` section of `CHANGELOG.md` as its notes, checks the code, builds it
   and publishes it to GitHub Pages. What `CHANGELOG.md` holds at the merge is
   what ships.

Actions → Release → **Run workflow** publishes again by hand: a tag given, or
the latest release.

Versions stay 0.x: `feat` raises the minor version (0.2.0 → 0.3.0), `fix` the
patch (0.2.0 → 0.2.1), and a breaking change (`feat!`) the minor too. To reach
1.0.0, set `"release-as": "1.0.0"` in `release-please-config.json`, and remove
it after that release.

The release builds with `bun run build`, which writes the estimator and the
calculations page, and stops on an item without a code in `config.linkCodes`.

## Commit messages

Commit messages and PR titles follow one rule, checked by the Checks workflow
(`scripts/messages.ts`): `<type>[!]: <description>`, with no scope.

- The types: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `build`, `ops`
  and `chore`. `feat` and `fix` become lines of the changelog, in words for the
  people who use the estimator
- The description is imperative, starts with a lowercase letter and has no
  period at the end; the whole line is at most 100 characters
- Merge PRs with **squash** or **rebase**, never a merge commit, so a change is
  not listed twice. With squash, extra `feat:` or `fix:` lines at the end of the
  message add more changelog lines
- A fix to work that hasn't been released yet is a `refactor:`, so it doesn't
  show as a fix of something no one had

Pushes to `main` are checked after they land: the run turns red, nothing is
blocked.
