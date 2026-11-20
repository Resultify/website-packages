/* The dev server: the estimator, and the calculations page, which can save its edits to
   src/hours.csv on this machine. The built site (bun run build) has both pages, and saves nothing. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hoursRoute } from "./calc/api.ts";
import calc from "./calc/index.html";
import homepage from "./index.html";

const port = Number(Bun.env.PORT ?? 4173);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

Bun.serve({
  port,
  routes: {
    "/": homepage,
    "/calc/": calc,
    "/calc": Response.redirect("/calc/"),
    "/calc/api/hours": hoursRoute(root),
  },
  development: true,
});

console.log(
  `Parcel is at http://localhost:${port}, calculations at http://localhost:${port}/calc/`,
);
