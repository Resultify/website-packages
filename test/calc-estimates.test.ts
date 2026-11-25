/* The estimates the calculations page compares (the presets of config.calcEstimates, each with every
   design), priced with the files in src/. A change of hours in src/ changes this snapshot, as it
   does the price list of prices.test.ts: accept it with `bun test --update-snapshots`, for review
   in the commit. */
import { expect, test } from "bun:test";
import { buildCatalogFrom, designChoices, withCatalog } from "../src/catalog.ts";
import { config } from "../src/config.ts";
import { decodeSelection, encodeSelection, quote, withDesign } from "../src/quote.ts";
import { liveHoursText } from "../src/table.ts";

const live = buildCatalogFrom(liveHoursText, config);

test("every preset's link opens an estimate in the estimator, and gives the same link back", () => {
  withCatalog(live, () => {
    for (const preset of config.calcEstimates) {
      const linked = decodeSelection(preset.link);
      expect(linked, preset.title).not.toBeNull();
      if (linked) expect(encodeSelection(linked), preset.title).toBe(preset.link);
    }
  });
});

test("the calculations page's fifteen estimates", () => {
  const text = withCatalog(live, () => {
    const short = { ai: "AI", nimbly: "Nimbly", custom: "Custom", none: "None" } as const;
    const designs = designChoices.filter((choice) => choice.kind !== "none");
    const lines = config.calcEstimates.flatMap((preset) =>
      designs.map((design) => {
        const linked = decodeSelection(preset.link);
        if (!linked) throw new Error(`${preset.title} has no link`);
        const q = quote(withDesign(linked, design.id));
        const kinds = [
          `design ${q.designHours}`,
          `build ${q.implementationHours}`,
          `content ${q.contentHours}`,
          `project ${q.projectHours}`,
        ].join(", ");
        /* The total the page shows, as the estimator gives it: after AI design's discount */
        const off = q.discount
          ? `, ${q.hours}h less ${q.discount.hours}h, ${q.discount.percent}%`
          : "";
        return `${preset.title} · ${short[design.kind]}: ${q.totalHours}h (${kinds}${off}) ${q.label}`;
      }),
    );
    return lines.join("\n");
  });
  expect(text).toMatchSnapshot();
});
