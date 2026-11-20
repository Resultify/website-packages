/* The shape of hours.csv and config.ts, in src/ and in test/fixtures: the file a person edits, in a
   spreadsheet too, so every change to it is checked here before the app reads it. What the hours
   cost is in prices.test.ts and calc-estimates.test.ts. */
import { describe, expect, test } from "bun:test";
import { buildCatalogFrom } from "../src/catalog.ts";
import { config, siteUrl } from "../src/config.ts";
import {
  type Config,
  hoursColumns,
  type HoursRow,
  liveHoursText,
  parseCsv,
  parseHours,
  rowsFrom,
  serializeHours,
} from "../src/table.ts";
import { fixtureConfig, fixtureHoursText } from "./fixture.ts";

const hourColumns = hoursColumns.filter((column) => /-(design|build)$/.test(column));
/** Units whose hours are entered in the estimate, not set in the file. */
const entered = ["hours", "build and design hours"];

const files: { path: string; text: string; config: Config }[] = [
  { path: "src/hours.csv", text: liveHoursText, config },
  { path: "test/fixtures/hours.csv", text: fixtureHoursText, config: fixtureConfig },
];

for (const file of files) {
  describe(file.path, () => {
    const rows = parseHours(file.text);
    const name = (row: HoursRow) => (row.option ? `${row.id} · ${row.option}` : row.id);

    test("has the 11 columns, each row once, and an item's rows together", () => {
      expect(parseCsv(file.text)[0]).toEqual([...hoursColumns]);
      const names = rows.map(name);
      expect(names.filter((item, index) => names.indexOf(item) !== index)).toEqual([]);
      const ids = rows.map((row) => row.id).filter((id, index, all) => id !== all[index - 1]);
      expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    });

    test("has the items of config.ts, and config.ts names only options the file has", () => {
      expect([...new Set(rows.map((row) => row.id))]).toEqual(Object.keys(file.config.items));
      const unknown = Object.entries(file.config.items).flatMap(([id, item]) =>
        Object.keys(item.options ?? {})
          .filter((option) => !rows.some((row) => row.id === id && row.option === option))
          .map((option) => `${id} · ${option}`),
      );
      expect(unknown).toEqual([]);
    });

    test("has whole hours from 0, empty only where the estimate takes them", () => {
      const read = rowsFrom(rows, file.config);
      const wrong: string[] = [];
      rows.forEach((row, index) => {
        const { unit, type } = read[index] ?? { unit: "", type: "" };
        for (const column of hourColumns) {
          const empty =
            entered.includes(unit) || (type === "project" && column.endsWith("-design"));
          const value = row[column];
          if (empty ? value !== "" : !/^(0|[1-9]\d*)$/.test(value)) {
            wrong.push(`${name(row)} ${column}: "${value}"${empty ? ", must be empty" : ""}`);
          }
        }
      });
      expect(wrong).toEqual([]);
    });

    test("needs a package as the app writes it, and its help has only {build} in braces", () => {
      const wrong = rows.flatMap((row) => [
        ...(/^((growth|platform)( from [1-9]\d*)?)?$/.test(row.package)
          ? []
          : [`${name(row)} package: "${row.package}"`]),
        ...[...row.help.matchAll(/\{[^}]*\}?/g)]
          .map((match) => match[0])
          .filter((braces) => braces !== "{build}")
          .map((braces) => `${name(row)} help: ${braces}`),
      ]);
      expect(wrong).toEqual([]);
    });

    test("is written in the app's layout", () => {
      expect(
        serializeHours(rows) === file.text
          ? ""
          : `Run bun scripts/hours-fmt.ts${file.path === "src/hours.csv" ? "" : ` ${file.path}`} to write ${file.path} in the app's layout`,
      ).toBe("");
    });

    test("reads the same from a Google Sheets download: CRLF, a BOM, every cell quoted", () => {
      const quoted = parseCsv(file.text).map((cells) =>
        cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      );
      expect(parseHours(`﻿${quoted.join("\r\n")}`)).toEqual(rows);
    });

    test("makes a catalog, with a link code for everything in it", () => {
      const catalog = buildCatalogFrom(file.text, file.config);
      expect(catalog.codes).toEqual(file.config.linkCodes);
      const numbers = file.config.linkCodes.map((entry) => entry.code);
      expect(new Set(numbers).size).toBe(numbers.length);
      const ids = file.config.linkCodes.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
}

describe("src/", () => {
  test("the link codes: a code that moves shows here", () => {
    const lines = config.linkCodes.map(
      (entry) =>
        `${entry.code} ${entry.id}${entry.options.length ? `: ${entry.options.join(" | ")}` : ""}`,
    );
    expect(lines.join("\n")).toMatchSnapshot();
  });

  test("siteUrl is the published address, the og:url of index.html", async () => {
    const page = await Bun.file(new URL("../src/index.html", import.meta.url)).text();
    expect(page.match(/property="og:url" content="([^"]+)"/)?.[1]).toBe(siteUrl);
    expect(siteUrl.endsWith("/")).toBe(true);
  });
});

describe("quoted cells", () => {
  test("keep their commas, quotes and line breaks", () => {
    expect(parseCsv('a,"b, ""c""\nd",e\n\nf')).toEqual([["a", 'b, "c"\nd', "e"], ["f"]]);
    const odd = parseHours(liveHoursText).map((row) => ({ ...row }));
    (odd[0] as HoursRow).help = 'One, "two"\nthree';
    expect(parseHours(serializeHours(odd))).toEqual(odd);
  });

  test("a file with other columns is refused, naming the right ones", () => {
    expect(() => parseHours("id,item,note\nmenu,Menu,\n")).toThrow(
      `hours.csv's columns must be: ${hoursColumns.join(", ")}`,
    );
  });
});
