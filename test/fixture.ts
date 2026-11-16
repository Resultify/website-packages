/* A copy of the files in src/ (estimator.csv, rules.csv, link-codes.csv), copied on 2026-11-16 and
   changed only by hand. The pricing tests check exact hours against it, so they test how an
   estimate is priced, and a change made on the calculations page does not move their numbers.

   Pricing tests call useFixture() first. The tests of the files in src/ read those instead. */
import { buildCatalog, type Catalog, useCatalog } from "../src/catalog.ts";
import { parseCodes, parseRules, parseTable } from "../src/table.ts";
import codesText from "./fixtures/link-codes.csv" with { type: "text" };
import tableText from "./fixtures/estimator.csv" with { type: "text" };
import rulesText from "./fixtures/rules.csv" with { type: "text" };

export const fixtureText = { table: tableText, rules: rulesText, codes: codesText };
export const rows = parseTable(tableText);
export const rules = parseRules(rulesText);
export const codes = parseCodes(codesText);
export const fixtureCatalog: Catalog = buildCatalog(rows, rules, codes);

/** Prices with the frozen files from here on. */
export function useFixture(): void {
  useCatalog(fixtureCatalog);
}
