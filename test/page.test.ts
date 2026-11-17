/* The published page's head, as bun run build writes it: its name, a description and a link preview
   for shared links, the favicon, and a main heading for screen readers. Builds into a folder of its
   own, so docs/ is left as it is. */
import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import csvText from "../scripts/csv-text.ts";

test("the built page keeps its description, link preview, favicon and hidden main heading", async () => {
  const outdir = await mkdtemp(join(tmpdir(), "page-test-"));
  try {
    const result = await Bun.build({
      entrypoints: [new URL("../src/index.html", import.meta.url).pathname],
      outdir,
      target: "browser",
      minify: true,
      plugins: [csvText],
    });
    expect(result.success).toBe(true);
    const html = await Bun.file(join(outdir, "index.html")).text();
    const meta = (attr: string, name: string) =>
      html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]+)"`))?.[1];

    expect(html).toContain("<title>Website packages</title>");
    const description = meta("name", "description") ?? "";
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(meta("property", "og:title")).toBe("Website packages");
    expect(meta("property", "og:description")).toBe(description);
    expect(meta("property", "og:url")).toBe("https://resultify.github.io/website-packages/");

    const icon =
      html.match(/<link rel="icon" type="image\/svg\+xml" href="\.\/([^"]+)"/)?.[1] ?? "";
    expect(icon).toMatch(/^favicon-.+\.svg$/);
    expect(await Bun.file(join(outdir, icon)).text()).toContain("<svg");

    expect(html.match(/<h1\b[^>]*>([^<]*)<\/h1>/g)).toEqual([
      '<h1 class="vh">Website packages</h1>',
    ]);
  } finally {
    await rm(outdir, { recursive: true, force: true });
  }
});
