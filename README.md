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

## Hours and rules: the files

The estimator is built from three files in `src/`:

| File                                   | What it holds                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`estimator.csv`](src/estimator.csv)   | One row for each item, or each option of an item (Menu has a Simple row and an Advanced row)           |
| [`rules.csv`](src/rules.csv)           | The few prices that are not hours per item: design variants and feedback rounds, languages, pages      |
| [`link-codes.csv`](src/link-codes.csv) | Each item's and option's number in a link. Kept by the app: never edit it, and commit it with the rest |

The columns of `estimator.csv`:

| Column                                        | What it holds                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`                                          | The item's name in the code. The rows of one item share it                                                          |
| `item`, `option`                              | The names in the estimator. `Dynamic pages: Simple` puts the option under a small heading                           |
| `place`                                       | Where the estimator shows it: `basics`, `shelf`, `blog` or `catalogue`. The basics and the Blog's rows are fixed    |
| `type`                                        | Empty: build hours. `content`: content hours, counted apart. Items of the shelf only                                |
| `status`                                      | Empty: live. `soon`: shown, locked. `hidden`: nowhere, left out of every estimate. Shelf items, and each option     |
| `unit`, `start`, `max`                        | What the item counts, the quantity it starts at, and the most. Empty unit: on or off. `hours`: hours are entered    |
| `build-ai`, `build-design`, `build-custom`    | Build hours for each design choice (no design takes Custom's): for each unit when the item counts something         |
| `design-ai`, `design-design`, `design-custom` | Design hours for AI generated, Design (for later) and Custom design, the same way                                   |
| `package`, `tier`                             | `growth` or `platform`; `professional` or `enterprise`. `growth from 5` means from 5 on. On an option: while chosen |
| `note`                                        | The line under the name, edited in the file only. `{build}` shows the build hours for the design choice             |

In the catalogue, `product-catalogue` is the HubDB source with its options;
any other row there that is not a part is a source to come (CRM Object,
Custom Object), `soon` or `hidden` until the estimator has options for it.

A new row is a new item on the shelf. It gets the next link code by itself:
Save on the calculations page and `bun run build` add it to `link-codes.csv`.
A code is never given to anything else, so items are not deleted: set them to
`hidden`. Only an item that is not committed yet can be taken out. The build
stops with the row's or rule's name when something cannot be read.

A few rules are code, not cells: they are listed at the bottom of the left
column of the calculations page.

## Changing them: the calculations page

With `bun run dev` running, http://localhost:4173/calc/ shows every number and
rule, open to change. It is part of the dev server only; the published site has
no calculations page.

- Each estimate on the page is priced with the files in the last commit and
  with the files on the page, side by side. The estimates are the links in
  [`src/scenarios.csv`](src/scenarios.csv), and the one in the address:
  `/calc/#<code>`
- A number that differs from the last commit is yellow; a dashed edge means it
  is not saved yet. Unsaved changes survive a reload of the tab
- The table is laid out as the estimator is: **Site basics**, the **Shelf**,
  the **Blog** and the **Product catalogue** (HubDB with its options, the
  sources to come, and its parts). An item with options has its name once,
  with its options under it; the radio in Start marks the one it starts with
- **Type** (Build or Content) on each item of the shelf says where its hours
  count. **Status** is on each item of the shelf and on each option: Live,
  Soon (shown, locked) or Hidden. An item with options is hidden when all of
  them are, and locked when none is live
- The **Design** and **Languages** panels on the left hold `rules.csv`
- **Add an item** puts a new item at the end of the shelf, as Build or Content.
  Its hours are fixed, for each unit, or entered in the estimate (an empty
  hours field). Until it is committed, **Remove** takes it out again
- **Save** writes `estimator.csv` and `rules.csv`, and `link-codes.csv` when an
  item is new, once the app can read them. The estimator on the dev server uses
  them at once
- To publish, run `bun run build` and commit `src/` with `docs/`. To throw away
  everything since the last commit: `git checkout src/`

Editing the files in an editor works too: the page reads them again when you
come back to it.

## Links

An estimate's address is a short code after the `#`, for example
`#BBkC_wGDAAMIAg`. It holds which items are in, by their link code, and their
numbers. So a link keeps working when hours, limits, names or the order of rows
change. There is no highest code: a link with a few high codes lists them
instead of carrying a bit for every code below them, so it stays short.

A link holds the estimate, not its hours: opened after the files have changed,
it shows the hours of the new files.

## Deploying

The site is published from the `docs/` folder with GitHub Pages. After changing
anything in `src/`, including the `.csv` files, run `bun run build` and
commit the updated `docs/` folder along with your change.
