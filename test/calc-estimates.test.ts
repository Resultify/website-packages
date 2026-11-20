/* The estimates the calculations page compares (config.calcEstimates, with each design), priced
   with the files in src/. A change of hours in src/ changes this snapshot, as it does the price list
   of prices.test.ts: accept it with `bun test --update-snapshots`, for review in the commit. */
import { expect, test } from "bun:test";
import { buildCatalogFrom, designChoices, hasTile, withCatalog } from "../src/catalog.ts";
import { config } from "../src/config.ts";
import { quote, selectionForShape, setTile } from "../src/quote.ts";
import { liveHoursText } from "../src/table.ts";

const live = buildCatalogFrom(liveHoursText, config);

test("the calculations page's nine estimates", () => {
  const text = withCatalog(live, () => {
    const short = { ai: "AI", nimbly: "Nimbly", custom: "Custom", none: "None" } as const;
    const designs = designChoices.filter((choice) => choice.kind !== "none");
    const lines = config.calcEstimates.flatMap((estimate) =>
      designs.map((design) => {
        const start = setTile(selectionForShape("essential"), design.id, true);
        const selection = estimate.adds
          .filter((id) => hasTile(id))
          .reduce((s, id) => setTile(s, id, true), start);
        const q = quote(selection);
        const kinds = [
          `design ${q.designHours}`,
          `build ${q.implementationHours}`,
          `content ${q.contentHours}`,
          `project ${q.projectHours}`,
        ].join(", ");
        return `${estimate.title} · ${short[design.kind]}: ${q.hours}h (${kinds}) ${q.label}`;
      }),
    );
    return lines.join("\n");
  });
  expect(text).toMatchSnapshot();
});
