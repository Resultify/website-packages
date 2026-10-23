import homepage from "./index.html";

const port = Number(Bun.env.PORT ?? 4173);

Bun.serve({
  port,
  routes: {
    "/": homepage,
  },
  development: true,
});

console.log(`Parcel is at http://localhost:${port}`);
