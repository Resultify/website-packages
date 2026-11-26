/* What changed in the estimator, for the people who use it: CHANGELOG.md, newest first. A release's
   section tells the changes since the last release. The older releases came from release-please,
   with its headings, links and sections. The first release is the version the sidebar shows under
   Changelog. A release's notes give the values it shipped with, such as 15%: a rule changed later
   doesn't rewrite them. */
import changelogText from "../CHANGELOG.md" with { type: "text" };

export type Section = { title: string; items: readonly string[] };

export type Release = {
  /** As in the file: 0.3.1. */
  version: string;
  /** Shown after "v": 0.2 for 0.2.0, 0.3.1 for 0.3.1. */
  label: string;
  /** The day it shipped, as YYYY-MM-DD. */
  date: string;
  /** Beta while the major version is 0. */
  stage?: string;
  sections: readonly Section[];
};

export const appName = "Website packages";

/* A release's heading: "## 0.5.0 Beta (2026-11-26)" (Beta while the major version is 0),
   "## [0.3.0](compare link) (2026-11-20)" as release-please wrote it, the same with ### for a patch
   as its older versions wrote it, or "## 0.2.0 (2026-11-19)" */
const versionHeading =
  /^#{2,3} (?:\[(\d+\.\d+\.\d+)\]\([^)]*\)|(\d+\.\d+\.\d+))(?: Beta)? \((\d{4}-\d{2}-\d{2})\)$/;
/* A ## or ### line whose text starts with a version is meant as a release's heading */
const looksLikeVersion = /^#{2,3} \[?\d+\.\d+\.\d+/;

function headingOf(line: string): { version: string; date: string } | undefined {
  const match = line.trimEnd().match(versionHeading);
  if (!match) return undefined;
  return { version: (match[1] ?? match[2])!, date: match[3]! };
}

/* The links release-please puts after an item, " ([#12](…))" for the PR and " ([1a2b3c4](…))" for
   the commit, and ", closes [#5](…)" for an issue the commit closes */
const trailingLinks = /(?:\s*\(\[[^\]]*\]\([^)]*\)\)|,? closes(?: \[[^\]]*\]\([^)]*\))+)+$/i;

/** An item's words as the dialog shows them, without release-please's links and markup. */
function itemText(markdown: string): string {
  const text = markdown
    .trim()
    .replace(trailingLinks, "")
    .replace(/^\*\*[^*]+:\*\* /, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`/g, "")
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type OpenSection = { line: number; title: string; skip: boolean; items: string[] };
type OpenRelease = { line: number; version: string; date: string; sections: OpenSection[] };

/** The releases in CHANGELOG.md's text, newest first. Throws on what it can't read, naming the line. */
export function parseChangelog(text: string): Release[] {
  const lines = text.split(/\r?\n/);
  const problem = (index: number, what: string) =>
    new Error(`line ${index + 1}, ${what}: ${lines[index]!.trim()}`);
  const releases: Release[] = [];
  let release: OpenRelease | undefined;
  let section: OpenSection | undefined;
  /* The line before is an item's, so a line of text under it continues the item */
  let inItem = false;

  const close = () => {
    if (!release) return;
    const empty = release.sections.find((open) => !open.skip && !open.items.length);
    if (empty) throw problem(empty.line, "a section with no items");
    const sections = release.sections
      .filter((open) => !open.skip)
      .map((open) => ({ title: open.title, items: open.items.map(itemText) }));
    if (!sections.length) throw problem(release.line, "a release with no items");
    const [major, minor, patch] = release.version.split(".");
    releases.push({
      version: release.version,
      label: patch === "0" ? `${major}.${minor}` : release.version,
      date: release.date,
      ...(major === "0" ? { stage: "Beta" } : {}),
      sections,
    });
  };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      inItem = false;
      return;
    }
    const heading = headingOf(line);
    if (heading) {
      close();
      release = { line: index, ...heading, sections: [] };
      section = undefined;
      inItem = false;
      return;
    }
    if (looksLikeVersion.test(line)) throw problem(index, "a release's heading needs (YYYY-MM-DD)");
    /* Text before the first release, such as the file's title */
    if (!release) return;
    if (line.startsWith("#")) {
      const title = line.match(/^### (.+)$/)?.[1]?.trim();
      if (!title)
        throw problem(index, "a heading that is not a release's (##) or a section's (###)");
      /* release-please lists a breaking change here and under its own type too */
      section = { line: index, title, skip: /breaking/i.test(title), items: [] };
      release.sections.push(section);
      inItem = false;
      return;
    }
    const item = line.match(/^[*-] (.+)$/)?.[1];
    if (item !== undefined) {
      if (!section) throw problem(index, "an item outside a section");
      section.items.push(item);
      inItem = true;
      return;
    }
    if (section?.skip) return;
    if (!inItem || !section) throw problem(index, "not a heading or an item");
    section.items.push(`${section.items.pop()} ${line.trim()}`);
  });
  close();
  if (!releases.length) throw new Error("no release: its heading is ## 0.2.0 (YYYY-MM-DD)");
  return releases;
}

export const releases: readonly Release[] = parseChangelog(changelogText);

export const currentRelease = releases[0] as Release;

/** A release's day as people write it: 17 November 2026. */
export function releaseDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
