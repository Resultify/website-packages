import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { defineConfig } from "@playwright/test";

/* The tests run the app’s own logic in Node, and the app reads its hours from src/hours.csv and
   its releases from CHANGELOG.md. Bun imports a .csv or .md as text; Node needs to be told how. */
registerHooks({
  load(url, context, nextLoad) {
    if (!/\.(csv|md)$/.test(url)) return nextLoad(url, context);
    const text = readFileSync(new URL(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(text)};`,
    };
  },
});

/* The page in a browser: e2e/*.e2e.ts, in the installed Chrome (nothing to download), against the app's
   own server on its default port. A running `bun run dev` is used as it is. Playwright runs on Node:
   `bun run e2e` starts it with Node, through its shebang. */
/* The app’s port, as the server takes it: PORT, or 4173 */
const port = Number(process.env.PORT ?? 4173);

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "bun src/server.ts",
    url: `http://localhost:${port}/`,
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
  },
});
