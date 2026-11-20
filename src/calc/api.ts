/* The calculations page's link to src/hours.csv on this machine. Served by the dev server only
   (src/server.ts); the published page has no server, and saves nothing.

   GET  gives the file as it is on disk.
   POST sets cells of it, once the app can read the result, one save at a time, writes it in the
        app's layout and gives the file as it left it. */
import { join } from "node:path";
import type { Server } from "bun";
import { config } from "../config.ts";
import { type HoursColumn, parseHours, rowsFrom, serializeHours } from "../table.ts";
import { cellValue, editColumns, isEditable } from "./edits.ts";

/** A cell to save: value is the cell's text as hours.csv has it ("growth from 5", not the link's g5). */
export type SavedEdit = { id: string; option: string; column: HoursColumn; value: string };
export type SaveBody = { edits: SavedEdit[] };

export const hoursPath = "src/hours.csv";

/* One save at a time, from reading the file to reading back what it wrote, and a read only between
   saves. Two saves at once (two tabs) would otherwise both read the same file and the second would
   undo the first; a read during a save could get a file half written */
let saving: Promise<unknown> = Promise.resolve();
export function oneAtATime<Result>(run: () => Promise<Result>): Promise<Result> {
  const next = saving.then(run);
  saving = next.catch(() => undefined);
  return next;
}

const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const localNames = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Only this page, opened on this machine, may write the files: not another device on the network,
    and not another site open in the same browser. */
export function mayWrite(request: Request, address: string | undefined): boolean {
  const url = new URL(request.url);
  return (
    address !== undefined &&
    loopback.has(address) &&
    localNames.has(url.hostname) &&
    request.headers.get("origin") === url.origin &&
    (request.headers.get("content-type") ?? "").startsWith("application/json")
  );
}

const message = (problem: unknown) =>
  problem instanceof Error ? problem.message : String(problem);

/** hours.csv's text with the cells set, or why it cannot be: a row or cell the page does not edit, a
    value the cell cannot take, or a file the app cannot read, before or after. */
export async function withEdits(
  text: string,
  edits: readonly SavedEdit[],
): Promise<{ hours: string } | { error: string }> {
  try {
    const rows = parseHours(text);
    const read = rowsFrom(rows, config);
    for (const edit of edits) {
      const name = edit.option ? `${edit.id} · ${edit.option}` : edit.id;
      const at = rows.findIndex((row) => row.id === edit.id && row.option === edit.option);
      const row = rows[at];
      const own = read[at];
      if (!row || !own) return { error: `hours.csv has no row ${name}` };
      const column = editColumns.find((item) => item === edit.column);
      if (!column) {
        return { error: `${name}: ${edit.column} is not a column the page edits` };
      }
      if (!isEditable(own, column)) {
        return { error: `${name}: ${column} is not set in hours.csv` };
      }
      const value = cellValue(column, String(edit.value));
      if (value === null) return { error: `${name}: ${column} cannot be "${edit.value}"` };
      row[column] = value;
    }
    const written = serializeHours(rows);
    /* Imported here: catalog.ts builds its catalog from src/hours.csv as it loads, and a file it
       cannot read would otherwise stop the dev server, not only this save */
    const { buildCatalogFrom } = await import("../catalog.ts");
    buildCatalogFrom(written, config);
    return { hours: written };
  } catch (problem) {
    return { error: message(problem) };
  }
}

/** Sets the cells in the file on disk, once the app can read the result. */
export function saveEdits(
  root: string,
  edits: readonly SavedEdit[],
): Promise<{ hours: string } | { error: string }> {
  return oneAtATime(async () => {
    const path = join(root, hoursPath);
    const result = await withEdits(await Bun.file(path).text(), edits);
    if ("hours" in result) await Bun.write(path, result.hours);
    return result;
  });
}

/** What a POST sent, when it is a list of edits. */
function editsOf(sent: unknown): SavedEdit[] | null {
  if (!sent || typeof sent !== "object") return null;
  const edits = (sent as { edits?: unknown }).edits;
  if (!Array.isArray(edits)) return null;
  return edits.map((edit) => {
    const item = (edit && typeof edit === "object" ? edit : {}) as Record<string, unknown>;
    const text = (key: string) => (typeof item[key] === "string" ? item[key] : "");
    return {
      id: text("id"),
      option: text("option"),
      column: text("column") as HoursColumn,
      value: text("value"),
    };
  });
}

export function hoursRoute(root: string) {
  return {
    async GET() {
      try {
        /* After a save in progress, never during one */
        const hours = await oneAtATime(() => Bun.file(join(root, hoursPath)).text());
        return Response.json({ hours }, { headers: { "cache-control": "no-store" } });
      } catch (problem) {
        return Response.json(
          { error: `${hoursPath} cannot be read: ${message(problem)}` },
          { status: 500, headers: { "cache-control": "no-store" } },
        );
      }
    },
    async POST(request: Request, server: Server<undefined>) {
      if (!mayWrite(request, server.requestIP(request)?.address)) {
        return Response.json(
          { error: "Only the calculations page on this machine can save" },
          { status: 403 },
        );
      }
      let edits: SavedEdit[] | null = null;
      try {
        edits = editsOf(await request.json());
      } catch {
        edits = null;
      }
      if (!edits) return Response.json({ error: "No edits were sent" }, { status: 400 });
      const result = await saveEdits(root, edits);
      return "error" in result ? Response.json(result, { status: 422 }) : Response.json(result);
    },
  };
}
