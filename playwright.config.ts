import { defineConfig } from "@playwright/test";

/* The page in a browser: e2e/*.e2e.ts, in the installed Chrome (nothing to download), against the app's
   own server on its default port. A running `bun run dev` is used as it is. Playwright runs on Node:
   `bun run e2e` starts it with Node, through its shebang. */
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "bun src/server.ts",
    url: "http://localhost:4173/",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
  },
});
