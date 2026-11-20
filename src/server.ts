/* The dev server: the estimator and the calculations page. The built site (bun run build) has the
   estimator only until the new calculations page is built with it. */
import calc from "./calc/index.html";
import homepage from "./index.html";

const port = Number(Bun.env.PORT ?? 4173);

Bun.serve({
  port,
  routes: {
    "/": homepage,
    "/calc/": calc,
    "/calc": Response.redirect("/calc/"),
  },
  development: true,
});

console.log(
  `Parcel is at http://localhost:${port}, calculations at http://localhost:${port}/calc/`,
);
