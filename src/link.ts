/**
 * The short link: an estimate as a few letters after the # of the address.
 *
 * Each letter of the web's base64 alphabet holds six bits. The bits, in order:
 *   1. a check: CRC-6 of every bit after it, so a link cut short or mistyped is refused instead of
 *      opening another estimate
 *   2. one bit: on when the site has more website pages than Starter takes
 *   3. two bits: the design, by its place in the app's list of designs
 *   4. the fixed numbers, as many as the design and the site basics take, in the app's order: the
 *      design's feedback rounds and variants, then each basic that has a number or options
 *   5. which items are in, by their code in config.linkCodes, in the shorter of two layouts, and one
 *      bit that says which:
 *        0  how many codes the next bits cover, then a bit for each code from 1: on when it is in.
 *           Short while the codes in the estimate are low
 *        1  how many items are in, then each code as its step from the one before. Short for a
 *           few items with high codes
 *   6. a number for each item that is in, in the order of the codes
 *   7. zeros to the end of the letter
 *
 * Numbers are Elias gamma codes: as many zeros as the number has bits after its first, then its
 * bits. 1 is "1", 2 is "010", 7 is "00111": small numbers take few bits, and there is no highest.
 * The app writes each number from 1 up, as its distance from the least it can be, so the usual ones
 * take a bit or three. Which numbers mean what is the app's: see encodeSelection in quote.ts.
 */

export type Packed = {
  /** More website pages than Starter takes. */
  over: boolean;
  /** The design: its place in the list, 0 to 3. */
  design: number;
  /** The design's numbers and the site basics', each 1 or more. */
  fixed: readonly number[];
  /** Code and number (1 or more) of each item in the estimate. */
  entries: readonly (readonly [code: number, value: number])[];
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const checkBits = 6;

/** A whole number of 1 or more, as an Elias gamma code. */
function pushGamma(bits: number[], value: number): void {
  const binary = Math.max(1, Math.round(value)).toString(2);
  for (let index = 1; index < binary.length; index += 1) bits.push(0);
  for (const digit of binary) bits.push(digit === "1" ? 1 : 0);
}

/** CRC-6 (x⁶ + x + 1) of the bits: six bits that change when any of them does. */
function check(bits: readonly number[]): number {
  let crc = 0;
  for (const bit of bits) {
    const top = ((crc >> 5) & 1) ^ bit;
    crc = (crc << 1) & 63;
    if (top) crc ^= 0b000011;
  }
  return crc;
}

export function packLink(input: Packed): string {
  const bits: number[] = [input.over ? 1 : 0, (input.design >> 1) & 1, input.design & 1];
  for (const value of input.fixed) pushGamma(bits, value);

  const entries = [...input.entries]
    .filter(([code]) => Number.isInteger(code) && code >= 1)
    .sort((a, b) => a[0] - b[0]);
  /* Layout 0: a bit for every code up to the highest */
  const covered: number[] = [0];
  const highest = entries.at(-1)?.[0] ?? 0;
  pushGamma(covered, highest + 1);
  const inSet = new Set(entries.map(([code]) => code));
  for (let code = 1; code <= highest; code += 1) covered.push(inSet.has(code) ? 1 : 0);
  /* Layout 1: the codes themselves, each as its step from the one before */
  const steps: number[] = [1];
  pushGamma(steps, entries.length + 1);
  let last = 0;
  for (const [code] of entries) {
    pushGamma(steps, code - last);
    last = code;
  }
  bits.push(...(steps.length < covered.length ? steps : covered));
  for (const [, value] of entries) pushGamma(bits, value);

  while ((bits.length + checkBits) % 6 !== 0) bits.push(0);
  const crc = check(bits);
  const all = [
    ...Array.from({ length: checkBits }, (_, index) => (crc >> (5 - index)) & 1),
    ...bits,
  ];
  let out = "";
  for (let index = 0; index < all.length; index += 6) {
    let value = 0;
    for (let bit = 0; bit < 6; bit += 1) value = (value << 1) | (all[index + bit] ?? 0);
    out += alphabet[value];
  }
  return out;
}

/** Null for anything that is not a link this version wrote. fixedCount: how many fixed numbers a
    design has. */
export function unpackLink(text: string, fixedCount: (design: number) => number): Packed | null {
  const all: number[] = [];
  for (const char of text) {
    const value = alphabet.indexOf(char);
    if (value === -1) return null;
    for (let bit = 5; bit >= 0; bit -= 1) all.push((value >> bit) & 1);
  }
  if (all.length < 12) return null;
  let crc = 0;
  for (let index = 0; index < checkBits; index += 1) crc = (crc << 1) | (all[index] ?? 0);
  const bits = all.slice(checkBits);
  if (check(bits) !== crc) return null;

  let at = 0;
  const read = (): number | null => (at < bits.length ? (bits[at++] as number) : null);
  const readGamma = (): number | null => {
    let zeros = 0;
    for (;;) {
      const bit = read();
      if (bit === null || zeros > 40) return null;
      if (bit === 1) break;
      zeros += 1;
    }
    let value = 1;
    for (let index = 0; index < zeros; index += 1) {
      const bit = read();
      if (bit === null) return null;
      value = value * 2 + bit;
    }
    return value;
  };

  const over = read();
  const high = read();
  const low = read();
  if (over === null || high === null || low === null) return null;
  const design = (high << 1) | low;
  const count = fixedCount(design);
  if (count < 0) return null;
  const fixed: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = readGamma();
    if (value === null) return null;
    fixed.push(value);
  }

  const layout = read();
  if (layout === null) return null;
  const codes: number[] = [];
  if (layout === 0) {
    const highest = readGamma();
    if (highest === null) return null;
    for (let code = 1; code < highest; code += 1) {
      const bit = read();
      if (bit === null) return null;
      if (bit === 1) codes.push(code);
    }
  } else {
    const items = readGamma();
    if (items === null || items - 1 > bits.length) return null;
    let last = 0;
    for (let index = 0; index < items - 1; index += 1) {
      const step = readGamma();
      if (step === null) return null;
      last += step;
      codes.push(last);
    }
  }

  const entries: [number, number][] = [];
  for (const code of codes) {
    const value = readGamma();
    if (value === null) return null;
    entries.push([code, value]);
  }
  /* Only the zeros that fill the last letter may be left */
  if (bits.length - at >= 6 || bits.slice(at).some((bit) => bit === 1)) return null;
  return { over: over === 1, design, fixed, entries };
}

/** The code in a link, an address, or the code itself. */
export function codeIn(text: string): string {
  const trimmed = text.trim();
  const hash = trimmed.lastIndexOf("#");
  return hash === -1 ? trimmed : trimmed.slice(hash + 1);
}
