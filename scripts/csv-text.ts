/* The tables (src/*.csv) and CHANGELOG.md are imported as text. The import says so
   (with { type: "text" }), but Bun's dev server forgets that when it rebuilds after the file changes,
   and serves the file's address instead. This plugin loads every .csv and .md as text, in the dev
   server (bunfig.toml) and the build. */
import type { BunPlugin } from "bun";

const csvText: BunPlugin = {
  name: "csv and md as text",
  setup(build) {
    build.onLoad({ filter: /\.(csv|md)$/ }, async ({ path }) => ({
      contents: `export default ${JSON.stringify(await Bun.file(path).text())};`,
      loader: "js",
    }));
  },
};

export default csvText;
