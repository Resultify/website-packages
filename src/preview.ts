/* The estimator with the calculations page's unsaved files, to try them before they are saved.
   Preview on that page puts the files in this browser's storage and opens /?preview. They are put
   in use here before anything else is read from them, so the shelf and every price follow them.
   Nothing is written to src/, and other browsers never see them.

   This module is imported first by the client. */
import { buildCatalog, useCatalog } from "./catalog.ts";
import { parseCodes, parseRules, parseTable } from "./table.ts";

/** Where the calculations page leaves the files for the preview. */
export const previewKey = "website-packages.preview";
/** The files, and the estimate the calculations page has chosen, as those files make it. */
export type PreviewFiles = { table: string; rules: string; codes: string; code: string };

/** The address of a preview of an estimate. */
export const previewAddress = (code: string) => `?preview#${code}`;

const asked = new URLSearchParams(location.search).has("preview");
/** This page is a preview of files that are not saved: what it prices is not for sharing. */
export const inPreview: boolean = asked;

function stored(): string | null {
  try {
    return localStorage.getItem(previewKey);
  } catch {
    return null;
  }
}

/** The estimate the calculations page gave this preview last. */
let given = "";

/** Puts the files to preview in use. Null when they are, or what went wrong. */
function usePreview(text: string | null): string | null {
  if (!text) return "There is nothing to preview. Open it from the calculations page";
  try {
    const files = JSON.parse(text) as PreviewFiles;
    given = files.code;
    useCatalog(
      buildCatalog(parseTable(files.table), parseRules(files.rules), parseCodes(files.codes)),
    );
    return null;
  } catch (problem) {
    return `The files to preview cannot be read: ${problem instanceof Error ? problem.message : String(problem)}`;
  }
}

const problem = asked ? usePreview(stored()) : null;

/** A bar over the page: this is a preview, nothing is saved, and the ways back. */
function bar(): HTMLElement {
  const node = document.createElement("div");
  node.className = problem ? "preview-bar is-off" : "preview-bar";
  node.setAttribute("role", "status");
  const text = document.createElement("span");
  const strong = document.createElement("b");
  strong.textContent = problem ? "No preview" : "Preview";
  text.append(
    strong,
    problem
      ? `${problem}. These are the saved files.`
      : "The calculations page's unsaved changes. Nothing here is saved.",
  );
  const back = document.createElement("a");
  back.href = `calc/${location.hash}`;
  back.textContent = "Calculations";
  const close = document.createElement("a");
  close.href = `./${location.hash}`;
  close.textContent = "Close preview";
  /* The estimate in the address changes as you work: the links take it when they are used */
  const follow = () => {
    back.href = `calc/${location.hash}`;
    close.href = `./${location.hash}`;
  };
  for (const link of [back, close]) link.addEventListener("click", follow);
  node.append(text, back, close);
  return node;
}

if (asked) {
  document.body.classList.add("is-preview");
  document.body.prepend(bar());
  /* The calculations page changed the files, or chose another estimate: show them. An estimate
     changed here is kept; one left as it was given takes the new one, so a change to what an
     estimate starts with shows too */
  window.addEventListener("storage", (event) => {
    if (event.key !== previewKey || !event.newValue) return;
    try {
      const next = (JSON.parse(event.newValue) as PreviewFiles).code;
      if (location.hash.slice(1) === given && next) history.replaceState(null, "", `#${next}`);
    } catch {}
    location.reload();
  });
}
