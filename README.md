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

## Deploying

The site is published from the `docs/` folder with GitHub Pages. After changing
anything in `src/`, run `bun run build` and commit the updated `docs/` folder
along with your change.
