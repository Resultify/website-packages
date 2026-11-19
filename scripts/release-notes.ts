/* Prints a release's notes from CHANGELOG.md, for its GitHub release: the Release workflow passes
   them to gh release edit. Usage: bun scripts/release-notes.ts 0.3.0 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseNotes } from "../src/changelog.ts";

const version = process.argv[2];
if (!version) {
  console.error("Usage: bun scripts/release-notes.ts <version>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const notes = releaseNotes(await Bun.file(join(root, "CHANGELOG.md")).text(), version);
if (notes === undefined) {
  console.error(`CHANGELOG.md has no release ${version}`);
  process.exit(1);
}
console.log(notes);
