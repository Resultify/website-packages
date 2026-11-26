/* The rule for commit messages and PR titles: "<type>[!]: <description>", with no scope. The
   description starts with a lowercase letter and has no period at the end; the line is at most 100
   characters. feat and fix decide the next version. */

export const commitTypes = [
  "feat",
  "fix",
  "refactor",
  "style",
  "test",
  "docs",
  "build",
  "ops",
  "chore",
] as const;

const format = new RegExp(`^(${commitTypes.join("|")})(!)?: (.+)$`);

/** Why a commit's subject or a PR's title breaks the rule, or undefined when it keeps it. */
export function subjectProblem(subject: string): string | undefined {
  /* GitHub adds the PR's number when it squashes */
  const line = subject.replace(/ \(#\d+\)$/, "");
  const description = line.match(format)?.[3];
  if (description === undefined) {
    return `start with a type, then ": " (${commitTypes.join(", ")})`;
  }
  if (/^\s/.test(description)) return 'one space after ": "';
  if (/^\p{Lu}/u.test(description)) return "start the description with a lowercase letter";
  if (description.endsWith(".")) return "no period at the end";
  if (line.length > 100) return `at most 100 characters, not ${line.length}`;
  return undefined;
}
