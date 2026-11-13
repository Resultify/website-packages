/* Building the page: one element with its attributes, listeners and children. */

export type Kid = Node | string | number | null | undefined | false | readonly Kid[];

type Props = {
  class?: string | null | undefined;
  data?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, (event: Event) => void>>;
  /** Any other attribute. true sets it empty; false, null and undefined leave it out. */
  [attribute: string]: unknown;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...kids: Kid[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "data") Object.assign(node.dataset, value);
    else if (key === "on") {
      for (const [type, listener] of Object.entries(value as Record<string, EventListener>)) {
        node.addEventListener(type, listener);
      }
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  append(node, kids);
  return node;
}

function append(node: Node, kids: readonly Kid[]): void {
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false || kid === "") continue;
    if (Array.isArray(kid)) append(node, kid);
    else node.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}
