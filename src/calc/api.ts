/* What the dev server needs to let the calculations page save src/hours.csv on this machine: who may
   write, and one save at a time. The built site has no server, so its page saves nothing. */

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
