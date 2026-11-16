/* The dev server: the estimator, and the calculations page, which edits src/estimator.csv on this
   machine. The built site (bun run build) has the estimator only. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tableRoute } from "./calc/api.ts";
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
    "/calc/api/table": tableRoute(root),
  },
  development: true,
});

console.log(
  `Parcel is at http://localhost:${port}, calculations at http://localhost:${port}/calc/`,
);
