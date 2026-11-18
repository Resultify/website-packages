/* What the dev server does for the calculations page: read the files, and save them once they can be
   read, only for the page on this machine. Works on a copy of the files in a folder of its own. */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkFiles, mayWrite, readTables, saveTables, tableRoute } from "../src/calc/api.ts";
import {
  applyCells,
  columns,
  parseCodes,
  parseTable,
  type Row,
  serializeTable,
} from "../src/table.ts";
import { fixtureText } from "./fixture.ts";

/* The files as the copy starts with them: the frozen ones, so a change made on the calculations
   page never changes what these tests save */
const tableText = fixtureText.table;
const rulesText = fixtureText.rules;
const codesText = fixtureText.codes;

const folders: string[] = [];
async function copyOfRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "parcel-api-"));
  folders.push(root);
  await Bun.write(join(root, "src/estimator.csv"), tableText);
  await Bun.write(join(root, "src/rules.csv"), rulesText);
  await Bun.write(join(root, "src/link-codes.csv"), codesText);
  return root;
}
afterAll(async () => {
  for (const folder of folders) await rm(folder, { recursive: true, force: true });
});

const rows = parseTable(tableText);
const edited = (table: string, rules = rulesText) => ({ table, rules });
/** Why a save was refused, or undefined when it was saved. */
async function refused(root: string, files: ReturnType<typeof edited>) {
  const result = await saveTables(root, files);
  return "error" in result ? result.error : undefined;
}
/** A new shelf item, with build hours. */
const newItem = (id: string): Row => ({
  ...(Object.fromEntries(columns.map((column) => [column, ""])) as Row),
  id,
  item: id,
  place: "shelf",
  "build-ai": "4",
});

describe("saving the files", () => {
  test("writes a table the app can read, in the file's own layout", async () => {
    const root = await copyOfRepo();
    const changed = serializeTable(applyCells(rows, { "sections build-ai": "6" }));
    expect(changed).not.toBe(tableText);
    /* Written another way (CRLF line ends): saved as the file is always written */
    const saved = await saveTables(root, edited(changed.replaceAll("\n", "\r\n")));
    const tables = await readTables(root);
    /* It answers with the files as it left them */
    expect(saved).toEqual(tables);
    expect(tables.saved.table).toBe(changed);
    expect(tables.saved.rules).toBe(rulesText);
    expect(tables.saved.codes).toBe(codesText);
    expect(tables.committed).toBeNull();
  });

  test("refuses a table or rules the app cannot read, and leaves the files as they were", async () => {
    const root = await copyOfRepo();
    const broken = serializeTable(applyCells(rows, { "sections build-ai": "many" }));
    expect(await refused(root, edited(broken))).toContain(
      "Sections: build-ai must be a whole number",
    );
    expect(await refused(root, edited("id,code\nx,1\n"))).toContain("columns must be");
    expect(
      await refused(
        root,
        edited(tableText, rulesText.replace("ai-feedback-each,3", "ai-feedback-each,x")),
      ),
    ).toContain("Rule ai-feedback-each");
    expect((await readTables(root)).saved).toEqual({
      table: tableText,
      rules: rulesText,
      codes: codesText,
    });
    expect(checkFiles(edited(tableText), codesText)).toEqual({
      table: tableText,
      rules: rulesText,
      codes: codesText,
    });
  });

  test("gives a new item the next link code, and writes it to link-codes.csv", async () => {
    const root = await copyOfRepo();
    const highest = Math.max(...parseCodes(codesText).map((entry) => entry.code));
    expect(
      await refused(root, edited(serializeTable([...rows, newItem("booking")]))),
    ).toBeUndefined();
    const saved = parseCodes((await readTables(root)).saved.codes);
    expect(saved.find((entry) => entry.id === "booking")?.code).toBe(highest + 1);
    expect(saved.length).toBe(parseCodes(codesText).length + 1);
  });

  test("two saves at once: one after the other, so each new item gets a code of its own", async () => {
    const root = await copyOfRepo();
    const highest = Math.max(...parseCodes(codesText).map((entry) => entry.code));
    /* Two tabs, each adding an item of its own, saved at the same moment */
    const [first, second] = await Promise.all([
      saveTables(root, edited(serializeTable([...rows, newItem("alpha")]))),
      saveTables(root, edited(serializeTable([...rows, newItem("beta")]))),
    ]);
    if ("error" in first || "error" in second) throw new Error("not saved");
    const codeOf = (codes: string, id: string) =>
      parseCodes(codes).find((entry) => entry.id === id)?.code;
    /* Each answers with the files as it left them: the first with its item */
    expect(first.saved.table).toContain("\nalpha,");
    expect(codeOf(first.saved.codes, "alpha")).toBe(highest + 1);
    /* The second came after: its table is the one on disk, and alpha keeps its code, so a link
       made with it never names beta */
    expect(second.saved.table).toContain("\nbeta,");
    expect(second.saved.table).not.toContain("\nalpha,");
    expect(codeOf(second.saved.codes, "alpha")).toBe(highest + 1);
    expect(codeOf(second.saved.codes, "beta")).toBe(highest + 2);
    expect((await readTables(root)).saved).toEqual(second.saved);
  });

  test("a read made while a save is writing waits for it: never the new table with the old rules", async () => {
    const root = await copyOfRepo();
    const table = serializeTable(applyCells(rows, { "sections build-ai": "6" }));
    const rules = rulesText.replace("ai-feedback-each,3", "ai-feedback-each,4");
    const saving = saveTables(root, edited(table, rules));
    const read = (await (await tableRoute(root).GET()).json()) as {
      saved: { table: string; rules: string };
    };
    expect(read.saved.table).toBe(table);
    expect(read.saved.rules).toBe(rules);
    await saving;
  });

  test("reads the table of the last commit from git", async () => {
    const tables = await readTables(join(import.meta.dir, ".."));
    expect(tables.saved.table.startsWith("id,item,")).toBe(true);
    /* null until the files are committed */
    expect(tables.committed === null || typeof tables.committed.table === "string").toBe(true);
  });
});

describe("what is sent", () => {
  test("a body that is no object, such as null, is refused as sending nothing", async () => {
    const root = await copyOfRepo();
    const local = { requestIP: () => ({ address: "127.0.0.1" }) } as unknown as Parameters<
      ReturnType<typeof tableRoute>["POST"]
    >[1];
    for (const body of ["null", "3", '"text"']) {
      const response = await tableRoute(root).POST(
        new Request("http://localhost:4173/calc/api/table", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:4173" },
          body,
        }),
        local,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "No table and rules were sent" });
    }
  });
});

describe("who may save", () => {
  const request = (url: string, headers: Record<string, string>) =>
    new Request(url, { method: "POST", headers });
  const json = { "content-type": "application/json" };

  test("the calculations page on this machine", () => {
    const own = request("http://localhost:4173/calc/api/table", {
      ...json,
      origin: "http://localhost:4173",
    });
    expect(mayWrite(own, "127.0.0.1")).toBe(true);
    expect(mayWrite(own, "::1")).toBe(true);
  });

  test("not another device, another site, a plain form, or a renamed host", () => {
    const own = { ...json, origin: "http://localhost:4173" };
    const url = "http://localhost:4173/calc/api/table";
    expect(mayWrite(request(url, own), "192.168.1.20")).toBe(false);
    expect(mayWrite(request(url, own), undefined)).toBe(false);
    expect(mayWrite(request(url, { ...json, origin: "https://example.com" }), "127.0.0.1")).toBe(
      false,
    );
    expect(mayWrite(request(url, { ...json }), "127.0.0.1")).toBe(false);
    expect(
      mayWrite(
        request(url, { "content-type": "text/plain", origin: "http://localhost:4173" }),
        "127.0.0.1",
      ),
    ).toBe(false);
    /* A name that points here, as in DNS rebinding: its origin matches its own host */
    const rebound = "http://evil.example:4173/calc/api/table";
    expect(
      mayWrite(request(rebound, { ...json, origin: "http://evil.example:4173" }), "127.0.0.1"),
    ).toBe(false);
  });
});
