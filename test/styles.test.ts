/* The stylesheet's tokens: every colour is set once, in :root, and every token is used. Reads the files;
   no browser needed. */
import { expect, test } from "bun:test";

const read = (file: string) => Bun.file(new URL(`../src/${file}`, import.meta.url)).text();

test("every colour comes from a token in the :root of src/styles.css, and every token is used", async () => {
  const css = await read("styles.css");
  const ts = (
    await Promise.all(["estimator.ts", "client.ts", "controls.ts", "icons.ts", "dom.ts"].map(read))
  ).join("\n");
  const root = css.match(/:root \{([\s\S]*?)\n\}/);
  expect(root).not.toBeNull();
  const rest = css.slice((root?.index ?? 0) + (root?.[0].length ?? 0));
  expect(rest.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi) ?? []).toEqual([]);
  expect(ts.match(/#[0-9a-f]{6}\b|\brgba?\(/gi) ?? []).toEqual([]);
  const values = Object.fromEntries(
    [...(root?.[1] ?? "").matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      (m[2] ?? "").trim(),
    ]),
  );
  const used = new Set([...css.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1] ?? ""));
  expect([...used].filter((name) => !(name in values))).toEqual([]);
  expect(Object.keys(values).filter((name) => !used.has(name))).toEqual([]);
});
