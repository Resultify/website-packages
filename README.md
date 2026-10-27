# Website packages

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

## Deploying

The site is published from the `docs/` folder with GitHub Pages. After changing
anything in `src/`, run `bun run build` and commit the updated `docs/` folder
along with your change.

dmh
