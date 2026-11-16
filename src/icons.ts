/* The page's line icons, the Resultify mark and the HubSpot sprocket. All take their colour from CSS. */
import { hubspotSprocketPath } from "./product-icons.ts";

const SVG = "http://www.w3.org/2000/svg";

const paths = {
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
  pages: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  sections:
    '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  globe:
    '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>',
  layers: '<path d="m12 4 9 5-9 5-9-5z"/><path d="m3 14 9 5 9-5"/>',
  rocket:
    '<path d="M12 3c4 2 5 6 4 10l-4 4-4-4C7 9 8 5 12 3z"/><circle cx="12" cy="9" r="1.6"/><path d="M8 17l-2 3M16 17l2 3"/>',
  feedback: '<path d="M5 5h14v10H10l-5 4z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  variants: '<rect x="4" y="8" width="11" height="11" rx="2"/><path d="M9 5h9a2 2 0 0 1 2 2v9"/>',
  tick: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  cross: '<path d="M7 7l10 10M17 7 7 17"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  included: '<path d="m3 13 4 4L16 8M11 16l1 1 9-9"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
} as const;

export type IconName = keyof typeof paths;

export function icon(name: IconName, className = "ic"): SVGSVGElement {
  const node = document.createElementNS(SVG, "svg");
  node.setAttribute("class", className);
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", "1.7");
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  node.innerHTML = paths[name];
  return node;
}

/** The Resultify mark: a plate with the R cut out, both coloured by the page. */
export function logo(): SVGSVGElement {
  const node = document.createElementNS(SVG, "svg");
  node.setAttribute("class", "rlogo");
  node.setAttribute("viewBox", "0 0 1024 1024");
  node.setAttribute("aria-hidden", "true");
  node.innerHTML =
    '<rect width="1024" height="1024"/><path d="M552.9,565.79c67.3-27.7,114.5-87.1,114.5-159.9,0-94.2-75.8-170.2-168.7-170.2H366.9v95H490.2c41,0,76.6,34.8,76.6,76.8,0,44.3-35.6,80.7-76.6,80.7H366.9V573h82.3L552.1,782.8c1.6,3.1,5.4,7.1,12.4,7.1h81.2c13.1,0,18.6-12.6,13.1-22.9Z"/>';
  return node;
}

export function sprocket(): SVGSVGElement {
  const node = document.createElementNS(SVG, "svg");
  node.setAttribute("class", "spk");
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", hubspotSprocketPath);
  node.append(path);
  return node;
}
