/* Writes src/hours.csv (or the file given) in the app's layout, once the app can read it: as a
   spreadsheet's download comes back, with its own line ends and quoting, it would fail the tests
   that keep the file in one layout, and every line would show as changed in a review.

   bun scripts/hours-fmt.ts [path] */
import { join, relative } from "node:path";
import { config } from "../src/config.ts";
import { parseHours, serializeHours } from "../src/table.ts";

const root = join(import.meta.dir, "..");
const path = process.argv[2] ?? join(root, "src/hours.csv");
/* Named as typed from here, or in full when it is elsewhere */
const near = relative(process.cwd(), path);
const name = near && !near.startsWith("..") ? near : path;

try {
  const text = await Bun.file(path).text();
  const rows = parseHours(text);
  const written = serializeHours(rows);
  /* Imported here, not on top: catalog.ts builds its own catalog from src/hours.csv as it loads,
     and throws there when the app cannot read that file, before this could say what is wrong */
  const { buildCatalogFrom } = await import("../src/catalog.ts");
  buildCatalogFrom(written, config);
  if (written === text) {
    console.log(`${name}: already in the app's layout`);
  } else {
    await Bun.write(path, written);
    console.log(`${name}: rewritten in the app's layout`);
  }
} catch (error) {
  console.error(`${name}: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
