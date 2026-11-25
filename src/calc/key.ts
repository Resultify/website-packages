/* The Estimates card's key, the part that does not draw: apart from calc.ts, which starts the page
   when it is imported, so the tests can read it. */
import { aiDiscountBands } from "../catalog.ts";

/** The AI discount's bands, for the key: "20% of the first 50h, 25% to 100h, 30% past 100h", one
    share when every band has it, and none when no band has one. */
export function discountKey(): string | null {
  const bands = aiDiscountBands();
  if (bands.every((band) => band.percent === 0)) return null;
  const same = bands.every((band) => band.percent === bands[0]?.percent);
  const list = same
    ? `${bands[0]?.percent}%`
    : bands
        .map((band, index) => {
          const next = bands[index + 1];
          if (!next) return `${band.percent}% past ${band.from}h`;
          return index === 0
            ? `${band.percent}% of the first ${next.from}h`
            : `${band.percent}% to ${next.from}h`;
        })
        .join(", ");
  return ` · AI's Total is after its discount: ${list}`;
}
