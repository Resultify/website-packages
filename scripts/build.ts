/* Builds the estimator and the calculations page into docs/, once src/hours.csv and src/config.ts are files the app can read
   and every item has its link code in config.ts. */
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.ts";
import csvText from "./csv-text.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = join(root, "docs");
const read = (path: string) => Bun.file(join(root, path)).text();

/* The page shows CHANGELOG.md's releases, and its first one as the version: it must read, and be
   the version in package.json */
try {
  /* Reading the module reads CHANGELOG.md, and throws as the page would */
  const { currentRelease } = await import("../src/changelog.ts");
  const { version } = JSON.parse(await read("package.json")) as { version?: string };
  if (currentRelease.version !== version) {
    throw new Error(
      `its first release is ${currentRelease.version}, package.json's version is ${version}`,
    );
  }
} catch (error) {
  console.error(`CHANGELOG.md: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

/* The files must be ones the app can read, and config.linkCodes must hold every code the catalog
   gives: one it had to make up would be given again to the next new item, and a link sent before
   would open that one. The catalog also gives codes to lines it makes (<id>-design, blog-*-count),
   so this finds those too */
try {
  /* catalog.ts builds its catalog from src/hours.csv as it loads, and throws there when the app
     cannot read it: imported here, so the build can say so */
  const { buildCatalogFrom } = await import("../src/catalog.ts");
  const catalog = buildCatalogFrom(await read("src/hours.csv"), config);
  if (!Bun.deepEquals(catalog.codes, config.linkCodes)) {
    const known = new Map(config.linkCodes.map((entry) => [entry.id, entry.options]));
    const missing = catalog.codes.flatMap((entry) => {
      const options = known.get(entry.id);
      if (!options) return [entry.id];
      return entry.options
        .filter((option) => !options.includes(option))
        .map((option) => `${entry.id} · ${option}`);
    });
    throw new Error(
      `config.linkCodes has no code for ${missing.join(", ")}: give a new item the next code after the highest, and a new option the end of its item's list`,
    );
  }
} catch (error) {
  console.error(`src/: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  /* The estimator, and the calculations page in calc/: published, it saves nothing (no server) */
  entrypoints: [join(root, "src/index.html"), join(root, "src/calc/index.html")],
  outdir,
  target: "browser",
  minify: true,
  plugins: [csvText],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await Bun.write(join(outdir, ".nojekyll"), "");
for (const page of ["index.html", "calc/index.html"]) {
  if (!(await Bun.file(join(outdir, page)).exists())) {
    console.error(`The build wrote no docs/${page}`);
    process.exit(1);
  }
}
console.log("Wrote docs/index.html and docs/calc/index.html");
