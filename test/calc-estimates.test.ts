/* The estimates the calculations page compares (the presets of config.calcEstimates, each with every
   design), priced with the files in src/. A change of hours in src/ changes this snapshot, as it
   does the price list of prices.test.ts: accept it with `bun test --update-snapshots`, for review
   in the commit. */
import { expect, test } from "bun:test";
import { buildCatalogFrom, designChoices, withCatalog } from "../src/catalog.ts";
import { discountKey } from "../src/calc/key.ts";
import { config } from "../src/config.ts";
import { decodeSelection, encodeSelection, quote, withDesign } from "../src/quote.ts";
import { liveHoursText } from "../src/table.ts";

const live = buildCatalogFrom(liveHoursText, config);

test("the key says AI's totals are after its discount: each band's share, one share when every band has it, nothing when none has one", () => {
  const keyWith = (shares: [number, number, number]) =>
    withCatalog(
      buildCatalogFrom(liveHoursText, {
        ...config,
        rules: {
          ...config.rules,
          "ai-discount-percent": shares[0],
          "ai-discount-band-2-from": 50,
          "ai-discount-band-2-percent": shares[1],
          "ai-discount-band-3-from": 100,
          "ai-discount-band-3-percent": shares[2],
        },
      }),
      discountKey,
    );
  expect(keyWith([20, 25, 30])).toBe(
    " · AI's Total is after its discount: 20% of the first 50h, 25% to 100h, 30% past 100h",
  );
  expect(keyWith([20, 20, 20])).toBe(" · AI's Total is after its discount: 20%");
  expect(keyWith([0, 0, 0])).toBeNull();
  /* A first band with none still lists every band: the discount starts past it */
  expect(keyWith([0, 10, 10])).toBe(
    " · AI's Total is after its discount: 0% of the first 50h, 10% to 100h, 10% past 100h",
  );
});

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
