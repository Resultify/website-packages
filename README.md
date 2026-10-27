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
