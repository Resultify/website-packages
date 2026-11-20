/* The calculations page's edits and the link that holds them (src/calc/edits.ts). The examples are
   the plan's, and lock the link's format: a link sent once must keep opening the same edits. */
import { describe, expect, test } from "bun:test";
import {
  applyEdits,
  cellValue,
  checkEdits,
  decodeEdits,
  type Edit,
  encodeEdits,
  enteredUnits,
  isEditable,
  madeOnOther,
  packageText,
  setEdit,
} from "../src/calc/edits.ts";
import { buildCatalogFrom, designInputUnit } from "../src/catalog.ts";
import { parseHours, rowsFrom, serializeHours } from "../src/table.ts";
import { codes, fixtureConfig, fixtureHoursText } from "./fixture.ts";

const menuSimple: Edit = { id: "menu", option: "Simple", column: "ai-design", was: "1", now: "4" };
const sectionsNimbly: Edit = {
  id: "sections",
  option: "",
  column: "nimbly-build",
  was: "2",
  now: "3",
};
const sectionsCustom: Edit = {
  id: "sections",
  option: "",
  column: "custom-build",
  was: "4",
  now: "3",
};
const templatesPackage: Edit = {
  id: "templates",
  option: "",
  column: "package",
  was: "growth from 5",
  now: "growth from 3",
};

describe("the link", () => {
  test("the plan's examples read as those edits, and write back the same", () => {
    expect(encodeEdits([menuSimple], codes)).toBe("e1.43-1a1~4");
    expect(encodeEdits([sectionsNimbly], codes)).toBe("e1.42d2~3");
    expect(encodeEdits([templatesPackage], codes)).toBe("e1.41pg5~g3");
    const four = "e1.41pg5~g3.42d2~3.42f4~3.43-1a1~4";
    /* Written sorted by code, option and column, whatever order they were made in */
    expect(encodeEdits([menuSimple, sectionsCustom, templatesPackage, sectionsNimbly], codes)).toBe(
      four,
    );
    expect(decodeEdits(`#${four}`, codes)).toEqual({
      edits: [templatesPackage, sectionsNimbly, sectionsCustom, menuSimple],
      unread: 0,
    });
  });

  test("round trip: hours, packages with and without from, items with and without options", () => {
    const edits: Edit[] = [
      { id: "search", option: "Advanced", column: "custom-design", was: "6", now: "12" },
      { id: "search", option: "Advanced", column: "package", was: "growth", now: "platform" },
      { id: "hubdb", option: "", column: "package", was: "growth", now: "" },
      { id: "blog-setups", option: "", column: "package", was: "growth from 2", now: "growth" },
      { id: "header", option: "", column: "ai-build", was: "2", now: "0" },
      {
        id: "product-catalogue",
        option: "Dynamic pages: Multi-level",
        column: "nimbly-build",
        was: "30",
        now: "9999",
      },
    ];
    const text = encodeEdits(edits, codes);
    expect(text).toBe("e1.1pg2~g.9-2e6~12.9-2pg~p.16pg~n.20-4d30~9999.44b2~0");
    const back = decodeEdits(text, codes);
    expect(back.unread).toBe(0);
    expect(encodeEdits(back.edits, codes)).toBe(text);
    expect(new Set(back.edits.map((edit) => JSON.stringify(edit)))).toEqual(
      new Set(edits.map((edit) => JSON.stringify(edit))),
    );
    expect(encodeEdits([], codes)).toBe("");
  });

  test("a hash without the prefix holds no edits: an older /calc/#<estimate> link", () => {
    expect(decodeEdits("#SFMRoK0fw", codes)).toEqual({ edits: [], unread: 0 });
    expect(decodeEdits("", codes)).toEqual({ edits: [], unread: 0 });
  });

  test("a part it cannot read is skipped and counted: the rest still count", () => {
    const { edits, unread } = decodeEdits(
      [
        "e1.43-1a1~4",
        "nonsense",
        "999a1~2" /* no such code */,
        "43-9a1~2" /* no such option */,
        "43a1~2" /* menu has options */,
        "42-1a1~2" /* sections has none */,
        "42x1~2" /* no such column */,
        "42a1~two",
        "42a1~10000" /* more than four digits */,
        "41pg5~q3" /* no such package */,
        "41pg5~n3" /* any is from the start */,
        "41pg5~g0" /* from 1 */,
        "42b2~5",
      ].join("."),
      codes,
    );
    expect(unread).toBe(11);
    expect(edits).toEqual([
      menuSimple,
      { id: "sections", option: "", column: "ai-build", was: "2", now: "5" },
    ]);
  });

  test("two edits of one cell: the last counts", () => {
    const { edits } = decodeEdits("e1.43-1a1~4.42d2~3.43-1a1~6", codes);
    expect(edits).toEqual([sectionsNimbly, { ...menuSimple, now: "6" }]);
  });
});

describe("the edits", () => {
  const old = parseHours(fixtureHoursText);
  const read = rowsFrom(old, fixtureConfig);
  const works = (edits: readonly Edit[]) => {
    try {
      buildCatalogFrom(serializeHours(applyEdits(old, edits)), fixtureConfig);
      return true;
    } catch {
      return false;
    }
  };

  test("values are kept as hours.csv writes them", () => {
    expect(cellValue("ai-build", "05")).toBe("5");
    expect(cellValue("ai-build", " 7 ")).toBe("7");
    expect(cellValue("ai-build", "9999")).toBe("9999");
    for (const wrong of ["", "-1", "1.5", "10000", "x"]) {
      expect(cellValue("ai-build", wrong)).toBeNull();
    }
    expect(cellValue("package", "")).toBe("");
    expect(cellValue("package", "growth from 03")).toBe("growth from 3");
    expect(cellValue("package", "growth from 0")).toBeNull();
    expect(cellValue("package", "big")).toBeNull();
    expect(packageText("platform from 2")).toBe("Platform from 2");
    expect(packageText("")).toBe("Any");
  });

  test("the page edits hours a row has, and every package but the custom catalogue's", () => {
    expect(enteredUnits).toContain(designInputUnit);
    const row = (id: string, option = "") =>
      read.find((item) => item.id === id && item.option === option) ?? read[0]!;
    expect(isEditable(row("sections"), "ai-design")).toBe(true);
    expect(isEditable(row("kickoff"), "ai-design")).toBe(false);
    expect(isEditable(row("kickoff"), "ai-build")).toBe(true);
    expect(isEditable(row("content-hours"), "ai-build")).toBe(false);
    expect(isEditable(row("content-hours"), "package")).toBe(true);
    expect(isEditable(row("custom-integration"), "custom-design")).toBe(false);
    expect(isEditable(row("product-catalogue", "Custom"), "ai-build")).toBe(false);
    expect(isEditable(row("catalogue-custom"), "package")).toBe(false);
  });

  test("an edit back to the file's value is none; New is Old with the edits", () => {
    /* The fixture's Menu · Simple AI design is 1 */
    let edits = setEdit([], old, menuSimple, "4");
    expect(edits).toEqual([menuSimple]);
    edits = setEdit(edits, old, menuSimple, "1");
    expect(edits).toEqual([]);
    const sections = setEdit([], old, sectionsNimbly, "9");
    const changed = applyEdits(old, sections);
    expect(changed.find((row) => row.id === "sections")?.["nimbly-build"]).toBe("9");
    expect(changed.filter((row, index) => row !== old[index])).toHaveLength(1);
  });

  test("checked against the file: one equal to it goes, one on other hours stays and is marked, one it cannot take is counted", () => {
    /* Sections' Nimbly build is 4 in the fixture */
    const done: Edit = { ...menuSimple, was: "4", now: "1" };
    const other: Edit = { ...sectionsNimbly, was: "2", now: "6" };
    const entered: Edit = {
      id: "content-hours",
      option: "",
      column: "ai-build",
      was: "",
      now: "4",
    };
    const gone: Edit = { id: "nothing", option: "", column: "ai-build", was: "1", now: "2" };
    const refused: Edit = {
      id: "menu",
      option: "Advanced",
      column: "package",
      was: "growth",
      now: "growth from 2",
    };
    const result = checkEdits([done, other, entered, gone, refused], old, read, works);
    expect(result).toEqual({ edits: [other], dropped: 3 });
    expect(madeOnOther(result.edits, old)).toEqual([other]);
  });
});
