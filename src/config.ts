/**
 * What the estimator needs besides hours. The hours of each item, its help text and the package it
 * needs are in hours.csv; everything else is here:
 *
 *   items          where each item is shown, its type, status (soon, hidden), unit, start, max
 *                  and HubSpot tier. A value on an option is that option's own
 *   rules          design variants and feedback rounds, the package each design needs, project
 *                  management, languages and website pages
 *   linkCodes      each item's number in a share link, and the order of its options
 *   calcEstimates  the calculations page's presets: links from the estimator, each priced with
 *                  every design
 *
 * Adding an item takes a row in hours.csv (one for each option), an entry in items, and a code in
 * linkCodes: the next after the highest ever given. A code is never reused or changed, and an
 * option's place in its list never moves, or links sent before open another estimate.
 */
import type { Config } from "./table.ts";

/** The published site's address, as the og:url of index.html has it. */
export const siteUrl = "https://resultify.github.io/website-packages/";

export const config: Config = {
  items: {
    templates: { place: "basics", unit: "templates", start: 3, max: 50 },
    sections: { place: "basics", unit: "sections", start: 10, max: 100 },
    menu: { place: "basics", options: { Simple: { start: 1 } } },
    header: { place: "basics" },
    footer: { place: "basics" },
    setup: { place: "basics" },
    kickoff: { place: "basics", type: "project" },
    training: { place: "basics", type: "project", unit: "sessions", start: 2, max: 40 },
    "blog-setups": {
      place: "blog",
      unit: "blogs",
      start: 1,
      max: 100,
      tier: "professional from 2",
    },
    "blog-list": { place: "blog" },
    "blog-post": { place: "blog" },
    "blog-recent": { place: "blog" },
    "custom-forms": { place: "shelf", unit: "forms", start: 1, max: 20 },
    search: { place: "shelf" },
    "landing-templates": { place: "shelf", unit: "templates", start: 1, max: 50 },
    "content-hours": { place: "shelf", type: "content", unit: "hours", start: 0, max: 900 },
    "migrate-posts": { place: "shelf", type: "content", unit: "hours", start: 0, max: 900 },
    "migrate-pages": { place: "shelf", type: "content", unit: "hours", start: 0, max: 900 },
    system: { place: "shelf" },
    "external-forms": {
      place: "shelf",
      status: "soon",
      options: { HubDB: { tier: "professional" }, "External API": { tier: "enterprise" } },
    },
    hubdb: { place: "shelf", unit: "modules", start: 1, max: 50, tier: "professional" },
    "crm-section": {
      place: "shelf",
      status: "soon",
      unit: "modules",
      start: 1,
      max: 50,
      tier: "professional",
    },
    "crm-custom-section": {
      place: "shelf",
      status: "soon",
      unit: "modules",
      start: 1,
      max: 50,
      tier: "enterprise",
    },
    "cookie-banner": { place: "shelf" },
    "product-catalogue": {
      place: "catalogue",
      tier: "professional",
      options: { "Dynamic pages: Simple": { start: 1 }, Custom: { unit: "hours" } },
    },
    "catalogue-custom": { place: "catalogue", unit: "hours", start: 0, max: 900 },
    "catalogue-crm": {
      place: "catalogue",
      status: "soon",
      tier: "professional",
      options: { "Dynamic pages: Simple": { start: 1 }, Custom: { unit: "hours" } },
    },
    "catalogue-objects": {
      place: "catalogue",
      status: "soon",
      tier: "enterprise",
      options: { "Dynamic pages: Simple": { start: 1 }, Custom: { unit: "hours" } },
    },
    "favorite-products": { place: "catalogue", unit: "sections", start: 1, max: 50 },
    "related-products": { place: "catalogue" },
    "custom-integration": {
      place: "shelf",
      unit: "build and design hours",
      start: 0,
      max: 900,
      tier: "professional",
    },
    membership: {
      place: "membership",
      status: "soon",
      tier: "professional",
      options: { Invitation: { start: 1 } },
    },
    "membership-groups": {
      place: "membership",
      unit: "access groups",
      start: 1,
      max: 100,
      tier: "enterprise from 3",
    },
    "membership-social": { place: "membership", status: "soon", tier: "enterprise" },
    "membership-area": {
      place: "membership",
      status: "soon",
      unit: "build and design hours",
      start: 0,
      max: 900,
    },
  },
  rules: {
    // AI design variants: how many are included, the most, and each one's share
    "ai-variants-included": 5,
    "ai-variants-max": 20,
    "ai-variant-percent": 50,
    // With AI design, a share of the estimate's hours comes off its total only, in bands: this
    // share of its first hours, then each band's share of the hours from where it starts. They are
    // added up and rounded down to whole hours, so more hours never cost less. Its Design, Build,
    // Content and Project hours stay as they are. A band's share is at least the one before it;
    // 0 in every band is no discount
    "ai-discount-percent": 20,
    "ai-discount-band-2-from": 50,
    "ai-discount-band-2-percent": 25,
    "ai-discount-band-3-from": 100,
    "ai-discount-band-3-percent": 30,
    // Feedback rounds of each design: included, hours each, the most
    "ai-feedback-included": 3,
    "ai-feedback-each": 3,
    "ai-feedback-max": 20,
    "nimbly-feedback-included": 3,
    "nimbly-feedback-each": 3,
    "nimbly-feedback-max": 20,
    "custom-feedback-included": 3,
    "custom-feedback-each": 5,
    "custom-feedback-max": 20,
    // The package each design needs: empty is any package
    "ai-package": "",
    "nimbly-package": "",
    "custom-package": "growth",
    "none-package": "growth",
    // Project management: a share of the hours; with no design, a share of the design hours too
    "pm-percent": 15,
    "pm-none-design-percent": 50,
    // Languages: included, the second one's hours, each further one's, the most, and from how
    // many on it needs Growth, and Professional
    "languages-included": 1,
    "languages-second": 14,
    "languages-each": 6,
    "languages-max": 60,
    "languages-growth-from": 2,
    "languages-professional-from": 51,
    // Website pages: the start, the most, and from how many it needs Professional
    "pages-start": 25,
    "pages-max": 200,
    "pages-professional-from": 31,
  },
  linkCodes: [
    { id: "blog-setups", code: 1, options: [] },
    { id: "blog-list", code: 2, options: ["Simple", "Advanced"] },
    { id: "blog-list-count", code: 3, options: [] },
    { id: "blog-post", code: 4, options: ["Simple", "Advanced"] },
    { id: "blog-post-count", code: 5, options: [] },
    { id: "blog-recent", code: 6, options: [] },
    { id: "blog-recent-count", code: 7, options: [] },
    { id: "custom-forms", code: 8, options: [] },
    { id: "search", code: 9, options: ["Simple", "Advanced"] },
    { id: "landing-templates", code: 10, options: [] },
    { id: "content-hours", code: 11, options: [] },
    { id: "migrate-posts", code: 12, options: [] },
    { id: "migrate-pages", code: 13, options: [] },
    { id: "system", code: 14, options: [] },
    { id: "external-forms", code: 15, options: ["HubDB", "External API"] },
    { id: "hubdb", code: 16, options: [] },
    { id: "crm-section", code: 17, options: [] },
    { id: "crm-custom-section", code: 18, options: [] },
    { id: "cookie-banner", code: 19, options: [] },
    {
      id: "product-catalogue",
      code: 20,
      options: [
        "Module based",
        "Dynamic pages: Simple",
        "Dynamic pages: Filtered",
        "Dynamic pages: Multi-level",
        "Custom",
      ],
    },
    { id: "catalogue-custom", code: 21, options: [] },
    {
      id: "catalogue-crm",
      code: 22,
      options: [
        "Module based",
        "Dynamic pages: Simple",
        "Dynamic pages: Filtered",
        "Dynamic pages: Multi-level",
        "Custom",
      ],
    },
    {
      id: "catalogue-objects",
      code: 23,
      options: [
        "Module based",
        "Dynamic pages: Simple",
        "Dynamic pages: Filtered",
        "Dynamic pages: Multi-level",
        "Custom",
      ],
    },
    { id: "favorite-products", code: 24, options: [] },
    { id: "related-products", code: 25, options: [] },
    { id: "custom-integration", code: 26, options: [] },
    { id: "custom-integration-design", code: 27, options: [] },
    { id: "membership", code: 28, options: ["Invitation", "Self-registration", "SSO"] },
    { id: "membership-groups", code: 29, options: [] },
    { id: "membership-social", code: 30, options: [] },
    { id: "membership-area", code: 31, options: [] },
    { id: "membership-area-design", code: 32, options: [] },
    { id: "ai-design", code: 33, options: [] },
    { id: "ai-feedback", code: 34, options: [] },
    { id: "nimbly-design", code: 35, options: [] },
    { id: "nimbly-feedback", code: 36, options: [] },
    { id: "custom-design", code: 37, options: [] },
    { id: "custom-feedback", code: 38, options: [] },
    { id: "no-design", code: 39, options: [] },
    { id: "languages", code: 40, options: [] },
    { id: "templates", code: 41, options: [] },
    { id: "sections", code: 42, options: [] },
    { id: "menu", code: 43, options: ["Simple", "Advanced"] },
    { id: "header", code: 44, options: [] },
    { id: "footer", code: 45, options: [] },
    { id: "setup", code: 46, options: [] },
    { id: "kickoff", code: 47, options: [] },
    { id: "training", code: 48, options: [] },
  ],
  /* Each a link's code from the estimator, made with Nimbly design. The page prices it with every
     design: AI and Custom take Nimbly's place, with their own feedback rounds and variants */
  calcEstimates: [
    /* 3 templates, 10 sections: the estimate the estimator starts with */
    { title: "Starting estimate", link: "ELYrS" },
    /* 4 templates, 10 sections, the Blog */
    { title: "Blog", link: "qLIK0Pr4" },
    /* 3 templates, 10 sections, the Blog, 1 custom form, Search, over 30 pages */
    { title: "Blog, Forms and Search", link: "brYrQVq_w" },
    /* 4 templates, 16 sections, the Blog, 2 custom forms, Search, over 30 pages, Advanced menu,
       Blog list, Blog post and Search: Growth */
    { title: "Advanced Blog, Search and Menu", link: "WrIEFQVq6VI" },
    /* 5 templates, 18 sections, as above with 3 custom forms, and the Product catalogue (HubDB,
       Filtered) with Favorite and Related products: Platform */
    { title: "Products", link: "2rKElUVpKLJpWng" },
  ],
};
