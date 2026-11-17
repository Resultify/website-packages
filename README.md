# Website packages

## Requirements

- [Bun](https://bun.sh) 1.4.4 or newer: it runs the app and the unit tests, type-checks (`bun check`) and formats (`bun fmt`)
- For the browser tests: [Node.js](https://nodejs.org) (Playwright runs on Node) and Google Chrome

## Getting started

```sh
bun install
bun run dev
```

The dev server runs at http://localhost:4173 with hot reload. Set `PORT` to use
another port.

## Commands

| Command         | What it does                                                                    |
| --------------- | ------------------------------------------------------------------------------- |
| `bun run dev`   | Start the dev server with hot reload                                            |
| `bun run start` | Start the server without hot reload                                             |
| `bun test`      | Run the unit tests in `test/`                                                   |
| `bun run e2e`   | Run the browser tests in `e2e/` in Chrome; starts the server if none is running |
| `bun check`     | Type-check                                                                      |
| `bun fmt`       | Format the code; `bun fmt --check` only checks                                  |
| `bun run build` | Build the static site into `docs/`                                              |

The tests check two things apart:

- **How an estimate is priced.** These tests price with a copy of the three
  files in `test/fixtures/`, taken on purpose and changed only by hand, and
  check exact hours, packages and links against it. Changing hours or rules on
  the calculations page does not change them. Copy the files there again, and
  update the numbers, when the files change in a way a test should know of
- **The files in `src/`.** Every row and rule is read; every item and option,
  at its lowest and highest, is priced with every design; an estimate's hours
  must add up, and its link must give the same estimate back. The estimator's
  browser tests run on these files too

## Hours and rules: the files

The estimator is built from three files in `src/`:

| File                                   | What it holds                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`estimator.csv`](src/estimator.csv)   | One row for each item, or each option of an item (Menu has a Simple row and an Advanced row)                    |
| [`rules.csv`](src/rules.csv)           | What is not hours per item: design variants, feedback rounds, packages and project management, languages, pages |
| [`link-codes.csv`](src/link-codes.csv) | Each item's and option's number in a link. Kept by the app: never edit it, and commit it with the rest          |

The columns of `estimator.csv`:

| Column                                        | What it holds                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                          | The item's name in the code. The rows of one item share it                                                                                                                      |
| `item`, `option`                              | The names in the estimator. `Dynamic pages: Simple` puts the option under a small heading                                                                                       |
| `place`                                       | Where the estimator shows it: `basics`, `shelf`, `blog`, `catalogue` or `membership`. The basics, the Blog's and Memberships' rows are fixed                                    |
| `type`                                        | Empty: build hours. `content`: content hours, counted apart (shelf). `project`: Project hours, with project management (site basics and shelf)                                  |
| `status`                                      | Empty: live. `soon`: shown, locked. `hidden`: nowhere, left out of every estimate. Shelf items, the catalogue's sources, the parts added on their own, and each option          |
| `unit`, `start`, `max`                        | What the item counts, the quantity it starts at, and the most. Empty unit: on or off. `hours`: hours are entered. `build and design hours`: both are entered, each in its field |
| `build-ai`, `build-nimbly`, `build-custom`    | Build hours for each design choice (no design takes Custom's): for each unit when the item counts something                                                                     |
| `design-ai`, `design-nimbly`, `design-custom` | Design hours for AI generated, Nimbly and Custom design, the same way                                                                                                           |
| `package`, `tier`                             | `growth` or `platform`; `professional` or `enterprise`. `growth from 5` means from 5 on. On an option: while chosen                                                             |
| `note`                                        | The line under the name, edited in the file only. `{build}` shows the build hours for the design choice                                                                         |

Every estimate has one of four designs. Each has its own build and design
hours; its feedback rounds and the package it needs are in `rules.csv`. Every
design includes one feedback round:

- **AI generated**: AI generates variants (2 included, each one more half of
  the AI design hours) from Nimbly's default templates and the client's brief.
  Then 3h a feedback round
- **Nimbly**, the one a new estimate starts with: a designer adapts Nimbly's
  default templates to the client's brief. Then 3h a feedback round
- **Custom**: a designer creates a fully custom design from the client's brief.
  Then 5h a feedback round. Needs Growth
- **None**: the client provides the design. No design hours, and the build
  hours are Custom's. Needs Growth

The site basics always have the kick-off meeting (3h, apart from setup and
launch), training (2 sessions of 2h) and project management: one share of the
estimate's design, build and content hours (not of the kick-off, training or
anything else of type `project`), rounded up, whatever the design: 15%, the
rule `pm-percent`. None of them has design hours.

Hours count in four groups: **Design**, **Build**, **Content** and
**Project**, the work around the site: the kick-off and training (type
`project` in the table) and project management. The name is `projectName` in
`src/catalog.ts`. The estimator shows Project in the total, the dot grid (in
blue), first on the site basics' title line (as Content is first on the
estimate's; their labels show from 1341px wide, their colour alone below) and
in a fold of its own in the site basics.

Design comes before Build everywhere: on the title lines (after Content or
Project), in each item's figures (Design over Build; with no design hours,
Build alone on the first line), on the shelf and its key, in the fields of
Custom integration and in the calculations page's columns. The total on the
left and the hours breakdown keep their own order.

An item with parts (the Blog, the Product catalogue, Memberships, and the site
basics' two folds) has its total on its first line, larger, each figure after
its label (Design, Build, or Project) as the column's head writes its sums. The
parts' figures under it are bare and lighter.

The shelf lists its items, the Blog, the Product catalogue and Memberships in
the order of their rows in `estimator.csv` (an item's first row), in the group
of the package each needs; what is coming soon sits locked at the end of its
group, in the same order. To move one, move its rows.

**Copy hours** and **Hours breakdown** say the same, for a quote: the package
and tier, then Design (with the design chosen), Build, Content and Project,
each with its lines and hours, and the total. Feedback rounds, variants and
languages are listed even when all are included ("Feedback · 1 round:
included"); past that, with how many are extra ("3 rounds (1 included, 2
extra): 6h"). Project management is the last line of Project ("15% of 101h:
16h").

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
Member area, the parts added on their own, each have a status too: `soon` shows
them locked in their card, `hidden` takes them out. The Blog's list and post
templates and Memberships' access groups are always in their card; the
templates have a status on each option.

The blogs share one list template, one post template and one Recent blog posts
section. With more than one blog, each has a counter, up to one for each blog:
templates for the list and post templates, versions for Recent blog posts (a
blog with its own design of it). Their hours (build and design) count once for
each ("List template · Advanced · 2 templates", "Recent blog posts · 2
versions"). The counts are items of their own for the link (`blog-list-count`,
`blog-post-count`, `blog-recent-count`), made by the app, not rows of the
table.

A new row is a new item on the shelf. It gets the next link code by itself:
Save on the calculations page and `bun run build` add it to `link-codes.csv`.
A code is never given to anything else, so items are not deleted: set them to
`hidden`. Only an item that is not committed yet can be taken out. The build
stops with the row's or rule's name when something cannot be read.

## Changing them: the calculations page

With `bun run dev` running, http://localhost:4173/calc/ shows every number and
rule, open to change. It is part of the dev server only; the published site has
no calculations page.

- Each estimate on the page is priced with the files in the last commit and
  with the files on the page. The estimates are a grid, all in sight: a column
  for each design (AI, Nimbly, Custom) and three rows, the starting estimate,
  then with the Blog and Search, then with the Product catalogue too, each item
  at what it starts with. They are made from the files they are priced with, so
  a change to what an estimate starts with shows in them. A cell has the hours,
  their difference from the last commit, the package and the tier; the chosen
  one's hours by kind and its link are under the grid. Above it is the estimate
  in the address, `/calc/#<code>`, when it is none of the nine
- A number that differs from the last commit is yellow; a dashed edge means it
  is not saved yet. Unsaved changes survive a reload of the tab
- The table is laid out as the estimator is: **Site basics**, the **Shelf**,
  the **Blog**, the **Product catalogue** (its sources, each with its options,
  and its parts) and **Memberships**. An item with options has its name once,
  with its options under it; the radio in Start marks the one it starts with
- **Type** says where an item's hours count: Build, Content or Project on the
  shelf, Build or Project in the site basics. **Status** is on each item of the shelf, on each part added on its
  own, and on each option: Live, Soon
  (shown, locked) or Hidden. An item with options is hidden when all of them
  are, and locked when none is live: so is a source of products
- The **Design**, **Project** and **Languages** panels on the left hold
  `rules.csv`. Design has each design's feedback rounds and, under **Each
  design**, the package it needs. Project has project management's share.
  Project management is also a row of the site basics in the table, with its
  hours in the chosen estimate
- **Add an item** puts a new item at the end of the shelf, as Build or Content.
  Its hours are fixed, for each unit, or entered in the estimate (an empty
  hours field). Until it is committed, **Remove** takes it out again
- **Preview** opens the estimator with the files on the page, saved or not, at
  `/?preview`, under a yellow bar, with the chosen estimate. It follows every
  change made on the page, and the estimate chosen, until you close it; an
  estimate changed in the preview is kept. Nothing is written: the files stay
  in this browser, and the estimator without `?preview` keeps the saved ones.
  The preview has no Share link
- **Undo** takes back one change; **Discard** throws away every edit not saved,
  in one click
- **Save** writes `estimator.csv` and `rules.csv`, and `link-codes.csv` when an
  item is new, once the app can read them. The estimator on the dev server uses
  them at once
- To publish, run `bun run build` and commit `src/` with `docs/`. To throw away
  everything since the last commit: `git checkout src/`

Editing the files in an editor works too: the page reads them again when you
come back to it.

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
- every other item that is in, by its code in `link-codes.csv`, with its number

The items of the shelf have the lowest codes, in the table's order, each with
its parts; a link carries a bit for each code up to its highest, or lists the
codes when it has a few high ones, whichever is shorter. Numbers count from the
least they can be, so the usual ones take one bit. A link keeps working when
hours, limits, names or the order of rows change. See `src/link.ts` and
`encodeSelection` in `src/quote.ts`.

A link holds the estimate, not its hours: opened after the files have changed,
it shows the hours of the new files.

## Deploying

The site is published from the `docs/` folder with GitHub Pages. After changing
anything in `src/`, including the `.csv` files, run `bun run build` and
commit the updated `docs/` folder along with your change.
