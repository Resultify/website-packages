/* Builds the estimator into docs/. With --frozen, as the Release workflow runs it, it builds only
   what is committed: an item without a link code stops it instead of being given one. */
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkFiles } from "../src/calc/api.ts";
import { parseCodes } from "../src/table.ts";
import csvText from "./csv-text.ts";

const { values: flags } = parseArgs({ options: { frozen: { type: "boolean", default: false } } });

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

/* The files must be ones the app can read. An item added since the last build gets its link code,
   written into src/link-codes.csv so it is committed with the build and never given to another */
const codes = await read("src/link-codes.csv");
const checked = checkFiles(
  { table: await read("src/estimator.csv"), rules: await read("src/rules.csv") },
  codes,
);
if ("error" in checked) {
  console.error(`src/: ${checked.error}`);
  process.exit(1);
}
if (checked.codes !== codes) {
  const known = new Set(parseCodes(codes).map((entry) => entry.id));
  const given = parseCodes(checked.codes)
    .filter((entry) => !known.has(entry.id))
    .map((entry) => `${entry.id} ${entry.code}`);
  if (flags.frozen) {
    console.error(`src/link-codes.csv has no code for: ${given.join(", ")}`);
    console.error("Run bun run build and commit src/link-codes.csv.");
    process.exit(1);
  }
  await Bun.write(join(root, "src/link-codes.csv"), checked.codes);
  console.log(
    `Gave link codes in src/link-codes.csv${given.length ? `: ${given.join(", ")}` : ""}`,
  );
}

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  /* The estimator only: the calculations page is for the dev server (src/server.ts) */
  entrypoints: [join(root, "src/index.html")],
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
console.log("Wrote docs/index.html");
