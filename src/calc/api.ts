/* The calculations page's link to the files the estimator is built from. Served by the dev server
   only (src/server.ts); the built site has no calculations page.

   GET  gives the files as saved on disk, and the table and rules as they are in the last commit.
   POST saves a table and rules, once the app can read them, with the link codes they need. */
import { join } from "node:path";
import type { Server } from "bun";
import { buildCatalog } from "../catalog.ts";
import {
  parseCodes,
  parseRules,
  parseTable,
  serializeCodes,
  serializeRules,
  serializeTable,
} from "../table.ts";

/** What the page edits: the items and the rules. */
export type Edited = { table: string; rules: string };

export type Tables = {
  /** The files as they are on disk, the link codes with them. */
  saved: Edited & { codes: string };
  /** The table and rules in the last commit, or null when there are none yet. */
  committed: Edited | null;
};

const paths = {
  table: "src/estimator.csv",
  rules: "src/rules.csv",
  codes: "src/link-codes.csv",
} as const;

/** The files as they are written, with every item's link code, or why the app cannot use them. */
export function checkFiles(
  edited: Edited,
  codesText: string,
): { table: string; rules: string; codes: string } | { error: string } {
  try {
    const rows = parseTable(edited.table);
    const rules = parseRules(edited.rules);
    const catalog = buildCatalog(rows, rules, parseCodes(codesText));
    return {
      table: serializeTable(rows),
      rules: serializeRules(rules),
      codes: serializeCodes(catalog.codes),
    };
  } catch (problem) {
    return { error: problem instanceof Error ? problem.message : String(problem) };
  }
}

async function committed(root: string, path: string): Promise<string | null> {
  const git = Bun.spawn(["git", "-C", root, "show", `HEAD:${path}`], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const text = await new Response(git.stdout).text();
  return (await git.exited) === 0 ? text : null;
}

export async function readTables(root: string): Promise<Tables> {
  const read = (path: string) => Bun.file(join(root, path)).text();
  const [table, rules, codes, oldTable, oldRules] = await Promise.all([
    read(paths.table),
    read(paths.rules),
    read(paths.codes),
    committed(root, paths.table),
    committed(root, paths.rules),
  ]);
  return {
    saved: { table, rules, codes },
    committed: oldTable !== null && oldRules !== null ? { table: oldTable, rules: oldRules } : null,
  };
}

export async function saveTables(root: string, edited: Edited): Promise<{ error?: string }> {
  const codes = await Bun.file(join(root, paths.codes)).text();
  const checked = checkFiles(edited, codes);
  if ("error" in checked) return checked;
  await Bun.write(join(root, paths.table), checked.table);
  await Bun.write(join(root, paths.rules), checked.rules);
  if (checked.codes !== codes) await Bun.write(join(root, paths.codes), checked.codes);
  return {};
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

export function tableRoute(root: string) {
  return {
    async GET() {
      return Response.json(await readTables(root), { headers: { "cache-control": "no-store" } });
    },
    async POST(request: Request, server: Server<undefined>) {
      if (!mayWrite(request, server.requestIP(request)?.address)) {
        return Response.json(
          { error: "Only the calculations page on this machine can save" },
          { status: 403 },
        );
      }
      let body: Partial<Edited> = {};
      try {
        body = (await request.json()) as Partial<Edited>;
      } catch {
        body = {};
      }
      if (typeof body.table !== "string" || typeof body.rules !== "string") {
        return Response.json({ error: "No table and rules were sent" }, { status: 400 });
      }
      const result = await saveTables(root, { table: body.table, rules: body.rules });
      return result.error
        ? Response.json(result, { status: 422 })
        : Response.json(await readTables(root));
    },
  };
}
