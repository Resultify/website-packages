/* The rule for commit messages and PR titles that the Checks workflow applies. */
import { expect, test } from "bun:test";
import { subjectProblem } from "../scripts/messages.ts";

test.each([
  "feat: add a changelog dialog",
  "feat!: drop old links",
  "chore: release 0.3.0",
  "fix: keep counters on reset (#12)",
  "docs: edit the release notes",
  `fix: ${"x".repeat(95)}`,
])("keeps the rule: %s", (subject) => {
  expect(subjectProblem(subject)).toBeUndefined();
});

test.each([
  ["Update CHANGELOG.md", /start with a type/],
  ["feat(calc): x", /start with a type/],
  ["feat: Add x", /lowercase/],
  ["feat:  add x", /one space/],
  ["feat: add x.", /period/],
  ["wip", /start with a type/],
  [`fix: ${"x".repeat(96)}`, /at most 100 characters, not 101/],
])("breaks the rule: %s", (subject, problem) => {
  expect(subjectProblem(subject)).toMatch(problem);
});

test("the number GitHub adds when it squashes doesn't count towards the 100 characters", () => {
  expect(subjectProblem(`fix: ${"x".repeat(95)} (#1234)`)).toBeUndefined();
});
