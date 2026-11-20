/* A copy of the files in src/ (hours.csv, config.ts), as they were on 2026-11-16, and changed only
   by hand. The pricing tests check exact hours against it, so they test how an estimate is priced,
   and a change of the hours in src/ does not move their numbers.

   Pricing tests call useFixture() first. The tests of the files in src/ read those instead. */
import { buildCatalogFrom, type Catalog, useCatalog } from "../src/catalog.ts";
import { parseHours, rowsFrom, rulesFrom } from "../src/table.ts";
import { config } from "./fixtures/config.ts";
import hoursText from "./fixtures/hours.csv" with { type: "text" };

export const fixtureHoursText: string = hoursText;
export const fixtureConfig = config;
export const rows = rowsFrom(parseHours(hoursText), config);
export const rules = rulesFrom(config);
export const codes = config.linkCodes;
export const fixtureCatalog: Catalog = buildCatalogFrom(hoursText, config);

/** Prices with the frozen files from here on. */
export function useFixture(): void {
  useCatalog(fixtureCatalog);
}
