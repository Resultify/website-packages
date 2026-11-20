/* The published pages' heads, as bun run build writes them: the estimator's name, a description and
   a link preview for shared links, the favicon, and a main heading for screen readers; and the
   calculations page, published too, kept out of search. Builds into a folder of its own, so docs/
   is left as it is. */
import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import csvText from "../scripts/csv-text.ts";

test("the built page keeps its description, link preview, favicon and hidden main heading", async () => {
  const outdir = await mkdtemp(join(tmpdir(), "page-test-"));
  try {
    const result = await Bun.build({
      /* A path, not the URL's pathname: a space in the folder's name stays a space */
      entrypoints: [fileURLToPath(new URL("../src/index.html", import.meta.url))],
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

test("the built calculations page keeps its title and stays out of search", async () => {
  const outdir = await mkdtemp(join(tmpdir(), "page-test-"));
  try {
    const result = await Bun.build({
      entrypoints: [fileURLToPath(new URL("../src/calc/index.html", import.meta.url))],
      outdir,
      target: "browser",
      minify: true,
      plugins: [csvText],
    });
    expect(result.success).toBe(true);
    const html = await Bun.file(join(outdir, "index.html")).text();
    expect(html).toContain("<title>Calculations · Website packages</title>");
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  } finally {
    await rm(outdir, { recursive: true, force: true });
  }
});
