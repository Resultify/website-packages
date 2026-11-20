/* For the browser tests only: /?files prices with the hours.csv and config this browser's storage
   holds (e2e/estimator.e2e.ts puts the frozen files of test/fixtures there), so they check how the
   page prices, not what src/ costs today. Put in use before anything else reads the catalog, so the
   shelf and every price follow them. No bar and no message: no one opens it by hand.

   This module is imported first by the client. */
import { buildCatalogFrom, useCatalog } from "./catalog.ts";
import type { Config } from "./table.ts";

/** Where the tests leave the files. */
export const testFilesKey = "website-packages.files";
export type TestFiles = { hours: string; config: Config };

if (new URLSearchParams(location.search).has("files")) {
  try {
    const text = localStorage.getItem(testFilesKey);
    if (!text) throw new Error(`nothing is stored under ${testFilesKey}`);
    const files = JSON.parse(text) as TestFiles;
    useCatalog(buildCatalogFrom(files.hours, files.config));
  } catch (problem) {
    console.error(
      `?files: ${problem instanceof Error ? problem.message : String(problem)}. Pricing with the page's own files.`,
    );
  }
}
