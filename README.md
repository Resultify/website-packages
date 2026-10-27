# Website packages

An interactive estimator for HubSpot CMS website projects. Pick the pieces a
site needs and it works out the package (Essential, Growth or Platform), the
HubSpot edition each piece requires, and the build, content and design hours.
The current selection is stored in the URL, so a link reproduces the estimate.

The hours in `src/catalog.ts` are guide values. Replace them before a real
proposal.

## Requirements

- [Bun](https://bun.sh) 1.3 or newer

## Getting started

```sh
bun install
bun run dev
```

The dev server runs at http://localhost:4173 with hot reload. Set `PORT` to use
another port.

## Scripts

| Command         | What it does                                          |
| --------------- | ----------------------------------------------------- |
| `bun run dev`   | Start the dev server with hot reload                  |
| `bun run start` | Start the server without hot reload                   |
| `bun test`      | Run the tests in `test/`                              |
| `bun run check` | Type-check with `tsc` and lint/format-check with Biome |
| `bun run build` | Build the static site into `docs/`                    |

## How the estimate works

- **Package.** Essential, Growth and Platform are not chosen directly. The
  package is the lowest tier that covers every selected option (see
  `packageFor` in `src/quote.ts`). For example, 5 or more page templates, a
  second language or HubDB raises it to Growth, and a product catalogue raises
  it to Platform.
- **HubSpot edition.** Each tile has an edition rule. The estimate shows the
  highest edition any selected tile needs. More than 30 website pages needs
  Professional.
- **Hours.** A tile costs its base hours plus per-unit hours for each unit
  above the ones included in the base. Some tiles use fixed modes or their own
  formula (languages, redirects).
- **Design and content hours** are reported separately from build hours.
  Design hours count only while Custom design is on.
- **Sharing.** The selection is written to the URL hash (`#s=…&w=…&b=…&t=…`).
  Copy the address to share or reopen an estimate.

## Changing hours and options

Everything priced lives in `src/catalog.ts`:

- `tiles` defines each option: its group, `baseHours`, `perUnitHours`,
  `includedInBase`, quantity limits and edition `rule`.
- `packageName` and `editionLabel` hold the display names.
- `starterPageCap` and `defaultWebsitePages` control the website-page limits.

Package thresholds live in `packageFor` in `src/quote.ts`. After changing
either file, run `bun test` and update the expectations in
`test/quote.test.ts` if the numbers moved on purpose.

## Contributing

1. Branch from an up-to-date `main`, e.g. `feat/…`, `fix/…` or `docs/…`.
2. Make the change and run `bun test` and `bun run check`.
3. If `src/` changed, run `bun run build` and commit `docs/` too.
4. Open a pull request against `main`. Use commit messages like
   `feat: …`, `fix: …`, `docs: …` or `build: …`.

## Project layout

```
src/
  catalog.ts        Packages, editions, tiles and their hours — edit pricing here
  quote.ts          Turns a selection into a package, edition and hour totals
  client.ts         Browser UI
  index.html        Page entry point
  styles.css        Styles
  server.ts         Bun dev server
scripts/build.ts    Static build for GitHub Pages
test/               Tests for the quote logic
docs/               Built site (committed, served by GitHub Pages)
```

## Deploying

The site is published from the `docs/` folder with GitHub Pages. After changing
anything in `src/`, run `bun run build` and commit the updated `docs/` folder
along with your change.
