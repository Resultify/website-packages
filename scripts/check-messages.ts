/* Checks a PR's title and the commits in a range against the rule in scripts/messages.ts, for the
   Checks workflow. Each problem is a GitHub annotation and a plain line; any problem exits with 1.
   Usage: bun scripts/check-messages.ts [--title "<text>"] --range <from>..<to>
   A <from> of all zeros (a new branch pushed) checks <to> alone. */
import { parseArgs } from "node:util";
import { subjectProblem } from "./messages.ts";

const { values } = parseArgs({
  options: { title: { type: "string" }, range: { type: "string" } },
});
const [from, to] = values.range?.split("..") ?? [];
if (!from || !to) {
  console.error('Usage: bun scripts/check-messages.ts [--title "<text>"] --range <from>..<to>');
  process.exit(1);
}

const log = Bun.spawnSync(
  /^0+$/.test(from)
    ? ["git", "log", "--no-walk", "--no-merges", "--format=%h%x09%s", to]
    : ["git", "log", "--no-merges", "--format=%h%x09%s", `${from}..${to}`],
);
if (log.exitCode !== 0) {
  console.error(log.stderr.toString().trim());
  process.exit(1);
}
const commits = log.stdout
  .toString()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [sha = "", ...subject] = line.split("\t");
    return { sha, subject: subject.join("\t") };
  });

/* One line each: a title or subject with a line break in it can't start a workflow command */
const oneLine = (text: string) => text.replace(/[\r\n]+/g, " ");
/* A workflow command's message escapes these, as GitHub reads it */
const escape = (text: string) =>
  text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

let failed = 0;
const report = (kind: string, text: string, problem: string) => {
  failed++;
  console.log(`::error title=${kind}::${escape(`${text}: ${problem}`)}`);
  console.log(`${kind}: ${oneLine(text)}: ${problem}`);
};

if (values.title !== undefined) {
  const problem = subjectProblem(values.title);
  if (problem) report("PR title", values.title, problem);
}
for (const { sha, subject } of commits) {
  const problem = subjectProblem(subject);
  if (problem) report("Commit message", `${sha} ${subject}`, problem);
}

const checked = commits.length + (values.title === undefined ? 0 : 1);
if (failed) {
  console.log(`${failed} of ${checked} break the rule: see scripts/messages.ts`);
  process.exit(1);
}
console.log(`All ${checked} keep the rule`);
