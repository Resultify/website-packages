/* CHANGELOG.md as the app reads it: the releases in the Changelog dialog and the version under it,
   and a release's notes for its GitHub release. */
import { expect, test } from "bun:test";
import packageJson from "../package.json";
import { parseChangelog, releaseNotes, releases } from "../src/changelog.ts";

/* As release-please writes it: a new version over the seeded ones, a patch in the ### heading its
   older versions wrote, links after each item, a scope, and a breaking change listed twice */
const notes030 = `### ⚠ BREAKING CHANGES

* drop the old links ([#14](https://github.com/o/r/issues/14)) ([abc1234](https://github.com/o/r/commit/abc1234))

### New

* add a changelog dialog ([#12](https://github.com/o/r/issues/12)) ([1a2b3c4](https://github.com/o/r/commit/1a2b3c4))
* drop the old links ([#14](https://github.com/o/r/issues/14)) ([abc1234](https://github.com/o/r/commit/abc1234))
* **calc:** show \`rules.csv\` in **one** [panel](https://example.com) ([9f8e7d6](https://github.com/o/r/commit/9f8e7d6)), closes [#5](https://github.com/o/r/issues/5)

### Fixed

* keep counters on reset ([#13](https://github.com/o/r/issues/13)) ([5e6f7a8](https://github.com/o/r/commit/5e6f7a8))`;

const notes021 = `### Fixed

* round project management up
  when the design is None ([0b1c2d3](https://github.com/o/r/commit/0b1c2d3))`;

const fixture = `# Changelog

## [0.3.0](https://github.com/o/r/compare/v0.2.1...v0.3.0) (2026-12-01)

${notes030}

### [0.2.1](https://github.com/o/r/compare/v0.2.0...v0.2.1) (2026-11-24)

${notes021}

## 0.2.0 (2026-11-19)

### New

- A new layout.
`;

test("reads release-please's headings, sections and items", () => {
  const read = parseChangelog(fixture);
  expect(read.map(({ version, label, date, stage }) => ({ version, label, date, stage }))).toEqual([
    { version: "0.3.0", label: "0.3", date: "2026-12-01", stage: "Beta" },
    { version: "0.2.1", label: "0.2.1", date: "2026-11-24", stage: "Beta" },
    { version: "0.2.0", label: "0.2", date: "2026-11-19", stage: "Beta" },
  ]);
  /* The breaking change is under New already: its own section is left out */
  expect(read[0]!.sections).toEqual([
    {
      title: "New",
      items: ["Add a changelog dialog", "Drop the old links", "Show rules.csv in one panel"],
    },
    { title: "Fixed", items: ["Keep counters on reset"] },
  ]);
  /* A line under an item continues it */
  expect(read[1]!.sections).toEqual([
    { title: "Fixed", items: ["Round project management up when the design is None"] },
  ]);
  expect(read[2]!.sections).toEqual([{ title: "New", items: ["A new layout."] }]);
});

test("a version from 1.0.0 on has no Beta", () => {
  const [release] = parseChangelog("## 1.0.0 (2027-01-04)\n\n### New\n\n* go live\n");
  expect(release).toEqual({
    version: "1.0.0",
    label: "1.0",
    date: "2027-01-04",
    sections: [{ title: "New", items: ["Go live"] }],
  });
});

test.each([
  ["# Changelog\n\nNothing yet.\n", /^no release/],
  ["## 0.3.0 (2026-12-01)\n\n", /^line 1, a release with no items: ## 0\.3\.0/],
  ["## 0.3.0 (2026-12-01)\n\n### New\n\n### Fixed\n\n* x\n", /^line 3, a section with no items/],
  ["## 0.3.0 (2026-12-01)\n\n### ⚠ BREAKING CHANGES\n\n* x\n", /^line 1, a release with no items/],
  ["## 0.3.0 (2026-12-01)\n\n* x\n", /^line 3, an item outside a section: \* x/],
  ["# Changelog\n\n## 0.3.0\n\n### New\n\n* x\n", /^line 3, a release's heading needs/],
  ["## 0.3.0 (2026-12-01)\n\n### New\n\nSome words\n", /^line 5, not a heading or an item/],
  ["## 0.3.0 (2026-12-01)\n\n## Notes\n", /^line 3, a heading that is not a release's/],
])("refuses what it can't read, naming the line: %#", (text, problem) => {
  expect(() => parseChangelog(text)).toThrow(problem);
});

test("a release's notes are its markdown, as written, for its GitHub release", () => {
  expect(releaseNotes(fixture, "0.3.0")).toBe(notes030);
  expect(releaseNotes(fixture, "0.2.1")).toBe(notes021);
  expect(releaseNotes(fixture, "0.2.0")).toBe("### New\n\n- A new layout.");
  expect(releaseNotes(fixture, "9.9.9")).toBeUndefined();
});

test("CHANGELOG.md reads; its first release is package.json's version; each has a day and items", () => {
  expect(releases.length).toBeGreaterThan(0);
  expect(releases[0]!.version).toBe(packageJson.version);
  for (const release of releases) {
    expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(release.sections.flatMap((section) => section.items).length).toBeGreaterThan(0);
  }
});
