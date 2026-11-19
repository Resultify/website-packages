/* The prices of the files in src/, the ones the estimator is built with: the starting estimate with
   each design, the same with extra feedback rounds, variants and languages, and what every item
   and option adds. The pricing tests use the frozen files of test/fixtures instead (see
   fixture.ts), so they test how an estimate is priced; these test what it costs.

   A change of hours, a rule or a limit in src/, on the calculations page too, changes these
   snapshots: the test fails until the new prices are accepted with `bun test --update-snapshots`,
   and the accepted prices are in the commit, for review. */
import { describe, expect, test } from "bun:test";
import {
  buildCatalog,
  designChoices,
  getTile,
  isAlwaysOn,
  ownerOf,
  type Tile,
  tiles,
  withCatalog,
} from "../src/catalog.ts";
import { hoursText } from "../src/controls.ts";
import { quote, type Selection, selectionForShape, setQuantity, setTile } from "../src/quote.ts";
import {
  liveCodesText,
  liveRulesText,
  liveText,
  parseCodes,
  parseRules,
  parseTable,
} from "../src/table.ts";

const live = buildCatalog(
  parseTable(liveText),
  parseRules(liveRulesText),
  parseCodes(liveCodesText),
);

/** The starting estimate with a design. */
const withDesign = (id: string): Selection => setTile(selectionForShape("essential"), id, true);

/** Each design with what it prices. */
function byDesign(price: (design: string) => string): string {
  return designChoices.map((choice) => `## ${choice.label}\n${price(choice.id)}`).join("\n\n");
}

/** An item that can be added on its own: not a basic, a design or a rule, not a count or the
    design hours of another, not hours entered by hand, and neither it nor its owner coming or
    hidden. */
function addable(item: Tile): boolean {
  return (
    !isAlwaysOn(item.id) &&
    item.group !== "design" &&
    item.id !== "languages" &&
    !item.counts &&
    !item.designOf &&
    !item.hourInput &&
    !item.disabled &&
    !item.hidden &&
    !getTile(owner(item)).disabled &&
    !getTile(owner(item)).hidden
  );
}

/** The item a part goes with, or the item itself. */
const owner = (item: Tile): string => ownerOf(item.id) ?? item.id;

/** The estimate with an item in, at the quantity it starts at or with an option, its owner in
    first. An item that doesn't come in fails the test, so a price never reads 0 by mistake. */
function adding(selection: Selection, item: Tile, mode?: number): Selection {
  const first = owner(item);
  const withOwner =
    first !== item.id && selection.tiles[first] === undefined
      ? adding(selection, getTile(first))
      : selection;
  const added = setTile(withOwner, item.id, true);
  const result = mode === undefined ? added : setQuantity(added, item.id, mode);
  if (result.tiles[item.id] !== (mode ?? item.initial)) {
    throw new Error(`${item.label} did not come in${mode === undefined ? "" : ` as ${mode}`}`);
  }
  return result;
}

/** An item's own design and build hours in an estimate. */
function itemHours(selection: Selection, id: string): string {
  const lines = quote(selection).lines.filter((line) => line.item === id);
  const sum = (design: boolean) =>
    lines
      .filter((line) => (line.bucket === "design") === design)
      .reduce((total, line) => total + line.openHours, 0);
  return `${sum(true)} + ${sum(false)}`;
}

describe("the prices of the files in src/", () => {
  test("the starting estimate, with each design", () => {
    const text = withCatalog(live, () =>
      byDesign((design) => hoursText(quote(withDesign(design)))),
    );
    expect(text).toMatchSnapshot();
  });

  test("the starting estimate with 3 feedback rounds, 4 AI variants and 3 languages", () => {
    const text = withCatalog(live, () =>
      byDesign((design) => {
        const choice = designChoices.find((item) => item.id === design);
        let selection = withDesign(design);
        if (choice?.feedbackId) selection = setQuantity(selection, choice.feedbackId, 3);
        if (choice?.kind === "ai") selection = setQuantity(selection, design, 4);
        selection = setQuantity(selection, "languages", 3);
        return hoursText(quote(selection));
      }),
    );
    expect(text).toMatchSnapshot();
  });

  test("what each item and option adds, as design + build hours with each design", () => {
    const text = withCatalog(live, () => {
      const lines = [
        "Item · option · quantity: " + designChoices.map((choice) => choice.label).join(", "),
      ];
      for (const item of tiles.filter(addable)) {
        const modes = (item.modes ?? []).filter((mode) => !mode.disabled && !mode.customHours);
        const options = item.modes
          ? modes.map((mode) => ({
              name: mode.group ? `${mode.group}: ${mode.label}` : mode.label,
              value: mode.value,
            }))
          : [{ name: "", value: undefined }];
        for (const option of options) {
          const prices = designChoices.map((choice) => {
            const selection = adding(withDesign(choice.id), item, option.value);
            return itemHours(selection, item.id);
          });
          const count = item.unit && !item.modes ? ` · ${item.initial} ${item.unit}` : "";
          lines.push(
            `${item.label}${option.name ? ` · ${option.name}` : ""}${count}: ${prices.join(", ")}`,
          );
        }
      }
      return lines.join("\n");
    });
    expect(text).toMatchSnapshot();
  });
});
