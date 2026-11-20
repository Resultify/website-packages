/* What the dev server does for the calculations page: give src/hours.csv, and save edits to it once
   the app can read the result, only for the page on this machine. Works on a copy of the file in a
   folder of its own. */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "bun";
import { hoursPath, hoursRoute, mayWrite, type SavedEdit, saveEdits } from "../src/calc/api.ts";
import { liveHoursText, parseHours } from "../src/table.ts";

const folders: string[] = [];
async function copyOfRepo(text = liveHoursText): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "parcel-api-"));
  folders.push(root);
  await Bun.write(join(root, hoursPath), text);
  return root;
}
afterAll(async () => {
  for (const folder of folders) await rm(folder, { recursive: true, force: true });
});

const onDisk = (root: string) => Bun.file(join(root, hoursPath)).text();
const cell = (text: string, id: string, option: string, column: SavedEdit["column"]) =>
  parseHours(text).find((row) => row.id === id && row.option === option)?.[column];

const url = "http://localhost:4173/calc/api/hours";
const json = { "content-type": "application/json" };
const fromThisMachine = {
  requestIP: () => ({ address: "127.0.0.1" }),
} as unknown as Server<undefined>;
const post = (body: string) =>
  new Request(url, {
    method: "POST",
    headers: { ...json, origin: "http://localhost:4173" },
    body,
  });

describe("reading the file", () => {
  test("GET gives src/hours.csv as it is on disk", async () => {
    const root = await copyOfRepo();
    const response = await hoursRoute(root).GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ hours: liveHoursText });
  });
});

describe("saving edits", () => {
  test("sets the cells and writes the file in the app's layout", async () => {
    /* Written another way (CRLF line ends): saved as the file is always written */
    const root = await copyOfRepo(liveHoursText.replaceAll("\n", "\r\n"));
    const edits: SavedEdit[] = [
      { id: "menu", option: "Simple", column: "ai-design", value: "4" },
      { id: "templates", option: "", column: "package", value: "growth from 3" },
    ];
    const response = await hoursRoute(root).POST(post(JSON.stringify({ edits })), fromThisMachine);
    expect(response.status).toBe(200);
    const saved = await onDisk(root);
    expect(await response.json()).toEqual({ hours: saved });
    expect(cell(saved, "menu", "Simple", "ai-design")).toBe("4");
    expect(cell(saved, "templates", "", "package")).toBe("growth from 3");
    /* Every other line as it was */
    const before = liveHoursText.split("\n");
    const after = saved.split("\n");
    expect(after.filter((line, index) => line !== before[index])).toHaveLength(2);
  });

  test("refuses an edit it cannot make, and leaves the file as it was", async () => {
    const root = await copyOfRepo();
    const refused = async (edit: SavedEdit) => {
      const result = await saveEdits(root, [edit]);
      return "error" in result ? result.error : "";
    };
    expect(await refused({ id: "nothing", option: "", column: "ai-build", value: "1" })).toBe(
      "hours.csv has no row nothing",
    );
    expect(await refused({ id: "menu", option: "Simple", column: "help", value: "x" })).toContain(
      "not a column the page edits",
    );
    expect(await refused({ id: "kickoff", option: "", column: "ai-design", value: "2" })).toContain(
      "not set in hours.csv",
    );
    expect(await refused({ id: "sections", option: "", column: "ai-build", value: "1.5" })).toBe(
      'sections: ai-build cannot be "1.5"',
    );
    /* The catalog's own checks: a menu counts nothing, so its package has no "from" */
    expect(
      await refused({ id: "menu", option: "Advanced", column: "package", value: "growth from 2" }),
    ).toContain('no "from"');
    expect(await onDisk(root)).toBe(liveHoursText);
    const response = await hoursRoute(root).POST(
      post(JSON.stringify({ edits: [{ id: "menu", option: "", column: "ai-build", value: "1" }] })),
      fromThisMachine,
    );
    expect(response.status).toBe(422);
  });

  test("refuses to save into a file the app cannot read", async () => {
    const broken = liveHoursText.replace("id,item,", "id,name,");
    const root = await copyOfRepo(broken);
    const response = await hoursRoute(root).POST(
      post(
        JSON.stringify({
          edits: [{ id: "sections", option: "", column: "ai-build", value: "3" }],
        }),
      ),
      fromThisMachine,
    );
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toContain("columns must be");
    expect(await onDisk(root)).toBe(broken);
  });

  test("two saves at once: one after the other, so neither undoes the other", async () => {
    const root = await copyOfRepo();
    const [first, second] = await Promise.all([
      saveEdits(root, [{ id: "sections", option: "", column: "ai-build", value: "6" }]),
      saveEdits(root, [{ id: "header", option: "", column: "nimbly-build", value: "7" }]),
    ]);
    expect("hours" in first && "hours" in second).toBe(true);
    const saved = await onDisk(root);
    expect(cell(saved, "sections", "", "ai-build")).toBe("6");
    expect(cell(saved, "header", "", "nimbly-build")).toBe("7");
  });

  test("a body with no edits is refused as sending nothing", async () => {
    const root = await copyOfRepo();
    for (const body of ["null", "[]", "{}", '{"edits":"x"}', "not json"]) {
      const response = await hoursRoute(root).POST(post(body), fromThisMachine);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "No edits were sent" });
    }
    expect(await onDisk(root)).toBe(liveHoursText);
  });

  test("another device is refused before anything is read", async () => {
    const root = await copyOfRepo();
    const elsewhere = {
      requestIP: () => ({ address: "192.168.1.20" }),
    } as unknown as Server<undefined>;
    const response = await hoursRoute(root).POST(post('{"edits":[]}'), elsewhere);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Only the calculations page on this machine can save",
    });
  });
});

describe("who may save", () => {
  const request = (headers: Record<string, string>, to = url) =>
    new Request(to, { method: "POST", headers });

  test("the calculations page on this machine", () => {
    const own = request({ ...json, origin: "http://localhost:4173" });
    expect(mayWrite(own, "127.0.0.1")).toBe(true);
    expect(mayWrite(own, "::1")).toBe(true);
  });

  test("not another device, another site, a plain form, or a renamed host", () => {
    const own = { ...json, origin: "http://localhost:4173" };
    expect(mayWrite(request(own), "192.168.1.20")).toBe(false);
    expect(mayWrite(request(own), undefined)).toBe(false);
    expect(mayWrite(request({ ...json, origin: "https://example.com" }), "127.0.0.1")).toBe(false);
    expect(mayWrite(request({ ...json }), "127.0.0.1")).toBe(false);
    expect(
      mayWrite(
        request({ "content-type": "text/plain", origin: "http://localhost:4173" }),
        "127.0.0.1",
      ),
    ).toBe(false);
    /* A name that points here, as in DNS rebinding: its origin matches its own host */
    const rebound = "http://evil.example:4173/calc/api/hours";
    expect(
      mayWrite(request({ ...json, origin: "http://evil.example:4173" }, rebound), "127.0.0.1"),
    ).toBe(false);
  });
});
