import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFiles } from "../src/calc/api.ts";
import { parseCodes } from "../src/table.ts";
import csvText from "./csv-text.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = join(root, "docs");

/* The files must be ones the app can read. An item added since the last build gets its link code,
   written into src/link-codes.csv so it is committed with the build and never given to another */
const read = (path: string) => Bun.file(join(root, path)).text();
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
