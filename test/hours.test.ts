/* What Copy hours copies and Hours breakdown shows, for a quote: the same summary, with the frozen
   files of test/fixtures (see fixture.ts). */
import { describe, expect, test } from "bun:test";
import { hoursSummary, hoursText } from "../src/controls.ts";
import { quote, selectionForShape, setQuantity, setTile } from "../src/quote.ts";
import { useFixture } from "./fixture.ts";

useFixture();

const essential = () => selectionForShape("essential");

describe("Copy hours", () => {
  test("says the package and tier, then each group with its lines, the included ones too, and the total", () => {
    expect(hoursText(quote(essential()))).toBe(
      [
        "Essential package · Content Hub Starter",
        "- Design (Nimbly): 41h",
        "  - Page templates · 3 templates: 6h",
        "  - Sections · 8 sections: 24h",
        "  - Menu · Simple: 2h",
        "  - Global header: 2h",
        "  - Global footer: 3h",
        "  - Setup and launch: 4h",
        "  - Feedback · 1 round: included",
        "- Build: 60h",
        "  - Page templates · 3 templates: 6h",
        "  - Sections · 8 sections: 32h",
        "  - Menu · Simple: 3h",
        "  - Global header: 3h",
        "  - Global footer: 4h",
        "  - Setup and launch: 12h",
        "  - Languages · 1 language: included",
        "- Project: 23h",
        "  - Kick-off meeting: 3h",
        "  - Training · 2 sessions: 4h",
        "  - Project management · 15% of 101h: 16h",
        "- Total: 124h",
      ].join("\n"),
    );
  });

  test("past the included ones, says how many are included and how many are extra", () => {
    const ai = setTile(essential(), "ai-design", true);
    const more = setQuantity(
      setQuantity(setQuantity(ai, "ai-design", 3), "ai-feedback", 4),
      "languages",
      2,
    );
    const text = hoursText(quote(more));
    expect(text).toContain("- Design (AI generated): 36h");
    expect(text).toContain("  - Variants · 3 designs (2 included, 1 extra): 9h");
    expect(text).toContain("  - Feedback · 4 rounds (1 included, 3 extra): 9h");
    expect(text).toContain("  - Languages · 2 languages (1 included, 1 extra): 14h");
    /* With AI generated, the variants are a line even when all are included */
    expect(hoursText(quote(ai))).toContain("  - Variants · 2 designs: included");
  });

  test("with no design, says the client provides it; content of one line is the group alone", () => {
    const none = setTile(essential(), "no-design", true);
    const withContent = setQuantity(setTile(none, "content-hours", true), "content-hours", 12);
    const text = hoursText(quote(withContent));
    expect(text).toStartWith("Growth package · Content Hub Starter\n- Design (None): 0h\n");
    expect(text).toContain("  - Provided by the client\n");
    expect(text).not.toContain("Feedback");
    /* Build 60h and content 12h, and half the 41h design Custom would have (21h): project
       management 15% of 93h (13.95, so 14h), not of the kick-off and training (7h). Project comes
       after Content */
    expect(text).toContain(
      "  - Project management · 15% of 93h (72h + 50% of 41h client design): 14h\n",
    );
    expect(text).toContain("- Content: 12h\n- Project: 21h\n");
    expect(text).toEndWith("- Total: 93h");
  });

  test("with no design, design hours entered for an item stay as lines under the note", () => {
    const none = setTile(setTile(essential(), "no-design", true), "custom-integration", true);
    const entered = setQuantity(none, "custom-integration-design", 5);
    expect(hoursText(quote(entered))).toStartWith(
      [
        "Growth package · Content Hub Starter",
        "- Design (None): 5h",
        "  - Provided by the client",
        "  - Custom integration: 5h",
        "- Build:",
      ].join("\n"),
    );
  });

  test("every group adds up to its hours, and the groups to the total", () => {
    const busy = [
      "search",
      "blog-setups",
      "hubdb",
      "product-catalogue",
      "content-hours",
      "migrate-pages",
      "cookie-banner",
      "custom-integration",
    ].reduce((selection, id) => setTile(selection, id, true), essential());
    const summary = hoursSummary(quote(setQuantity(busy, "content-hours", 20)));
    let total = 0;
    for (const group of summary.groups) {
      const sum = group.lines.reduce(
        (all, line) => all + (typeof line.hours === "number" ? line.hours : 0),
        0,
      );
      /* A group of one line named as the group shows no lines */
      if (group.lines.length > 0) expect(sum).toBe(group.hours);
      total += group.hours;
    }
    expect(total).toBe(summary.total);
  });
});
