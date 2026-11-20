/* Who the dev server lets save src/hours.csv: only the calculations page on this machine. */
import { describe, expect, test } from "bun:test";
import { mayWrite } from "../src/calc/api.ts";

describe("who may save", () => {
  const request = (url: string, headers: Record<string, string>) =>
    new Request(url, { method: "POST", headers });
  const json = { "content-type": "application/json" };

  test("the calculations page on this machine", () => {
    const own = request("http://localhost:4173/calc/api/hours", {
      ...json,
      origin: "http://localhost:4173",
    });
    expect(mayWrite(own, "127.0.0.1")).toBe(true);
    expect(mayWrite(own, "::1")).toBe(true);
  });

  test("not another device, another site, a plain form, or a renamed host", () => {
    const own = { ...json, origin: "http://localhost:4173" };
    const url = "http://localhost:4173/calc/api/hours";
    expect(mayWrite(request(url, own), "192.168.1.20")).toBe(false);
    expect(mayWrite(request(url, own), undefined)).toBe(false);
    expect(mayWrite(request(url, { ...json, origin: "https://example.com" }), "127.0.0.1")).toBe(
      false,
    );
    expect(mayWrite(request(url, { ...json }), "127.0.0.1")).toBe(false);
    expect(
      mayWrite(
        request(url, { "content-type": "text/plain", origin: "http://localhost:4173" }),
        "127.0.0.1",
      ),
    ).toBe(false);
    /* A name that points here, as in DNS rebinding: its origin matches its own host */
    const rebound = "http://evil.example:4173/calc/api/hours";
    expect(
      mayWrite(request(rebound, { ...json, origin: "http://evil.example:4173" }), "127.0.0.1"),
    ).toBe(false);
  });
});
