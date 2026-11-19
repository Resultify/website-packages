/* What changed in the estimator, for the people who use it: newest first. The first release is the
   version the sidebar shows under Changelog. Add a release at the top when one ships. A release's
   notes give the values it shipped with, such as 15%: a rule changed later doesn't rewrite them. */

export type Release = {
  version: string;
  /** The day it shipped, as YYYY-MM-DD. */
  date: string;
  /** Beta while the estimator is still taking shape. */
  stage?: string;
  changes: readonly string[];
};

export const appName = "Website packages";

export const releases: readonly Release[] = [
  {
    version: "0.2",
    date: "2026-11-19",
    stage: "Beta",
    changes: [
      "A new layout: the total, the package and the HubSpot tier on the left, then Design and the site basics, the features in the estimate, and a shelf of everything that can be added, grouped by the package it needs.",
      "Four designs to choose from: AI generated, Nimbly, Custom and None, each with its own hours, feedback rounds and, for AI generated, variants.",
      "Project hours apart: the kick-off, training and project management, which is 15% of the design, build and content hours. With no design, it also counts half the design hours Custom would have, since the client's design still has to be checked and built from.",
      "Several blogs, with a counter for the list and post templates and for Recent blog posts when blogs have designs of their own.",
      "The Product catalogue, with its complexity (Module based, Dynamic pages or Custom), Favorite products and Related products.",
      "Custom forms counted form by form; Custom integration with its build and design hours entered.",
      "The Pro and Ent badges follow the option or quantity chosen.",
      "An item's total is labelled, apart from its parts' hours, and Design comes before Build everywhere.",
      "Shorter links to share.",
      "Coming soon, shown locked on the shelf: Memberships, Forms with external data, CRM Object and Custom Object sections, and CRM Object or Custom Object as the catalogue's source.",
    ],
  },
  {
    version: "0.1",
    date: "2026-10-27",
    changes: [
      "The first estimator: a package, the site basics and extra features, with design and build hours.",
      "Copy hours and the hours breakdown, as text for a quote.",
      "Published on the web.",
    ],
  },
];

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
