/**
 * The short link: an estimate as a few letters after the # of the address.
 *
 * It holds which tasks are in (by their code in the table) and their numbers, nothing else. So a
 * link survives every change to the table except a code that is given to another task.
 *
 * The bytes, written in the web's base64 alphabet:
 *   1. version, and how extra blogs share templates (two bits)
 *   2. website pages
 *   3. which tasks are in, one of two ways, whichever is shorter (the version says which):
 *      version 1: how many bytes of task bits follow, then the bits: one for each code, on when
 *                 the task is in. Short while the codes in the estimate are low
 *      version 2: how many tasks are in, then each code as its step from the one before. Short
 *                 for a few tasks with high codes
 *   4. one bit for each task that is in: on when its number is not 1
 *   5. those numbers, in the order of their codes
 *
 * Numbers take as few bytes as they need (seven bits each), so there is no highest code.
 */

export type Packed = {
  /** 0 to 3 */
  mode: number;
  pages: number;
  /** Code and number of each task in the estimate. */
  entries: readonly (readonly [code: number, value: number])[];
};

/** Task bits, or task steps. */
const bitsVersion = 1;
const stepsVersion = 2;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function toText(bytes: readonly number[]): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    out += alphabet[a >> 2];
    out += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += alphabet[c & 63];
  }
  return out;
}

function toBytes(text: string): number[] | null {
  if (text.length % 4 === 1) return null;
  const bytes: number[] = [];
  let bits = 0;
  let held = 0;
  for (const char of text) {
    const value = alphabet.indexOf(char);
    if (value === -1) return null;
    held = (held << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((held >> bits) & 255);
      held &= (1 << bits) - 1;
    }
  }
  return bytes;
}

/** A whole number in as few bytes as it needs: seven bits each, the eighth says "more follows". */
function pushNumber(bytes: number[], value: number): void {
  let rest = Math.max(0, Math.round(value));
  do {
    const low = rest % 128;
    rest = Math.floor(rest / 128);
    bytes.push(rest > 0 ? low | 128 : low);
  } while (rest > 0);
}

export function packLink(input: Packed): string {
  const entries = [...input.entries]
    .filter(([code]) => Number.isInteger(code) && code >= 1)
    .sort((a, b) => a[0] - b[0]);
  const start = (version: number) => {
    const bytes = [(version << 2) | (input.mode & 3)];
    pushNumber(bytes, input.pages);
    return bytes;
  };

  /* Version 1: a bit for every code up to the highest */
  const bits = start(bitsVersion);
  const size = Math.ceil((entries.at(-1)?.[0] ?? 0) / 8);
  const taskBits = new Array<number>(size).fill(0);
  for (const [code] of entries) {
    const bit = code - 1;
    taskBits[bit >> 3] = (taskBits[bit >> 3] ?? 0) | (1 << (bit & 7));
  }
  pushNumber(bits, size);
  bits.push(...taskBits);

  /* Version 2: the codes themselves, each as its step from the one before */
  const steps = start(stepsVersion);
  pushNumber(steps, entries.length);
  let last = 0;
  for (const [code] of entries) {
    pushNumber(steps, code - last);
    last = code;
  }

  const numberBits = new Array<number>(Math.ceil(entries.length / 8)).fill(0);
  const numbers: number[] = [];
  entries.forEach(([, value], index) => {
    if (value === 1) return;
    numberBits[index >> 3] = (numberBits[index >> 3] ?? 0) | (1 << (index & 7));
    pushNumber(numbers, value);
  });
  const shorter = steps.length < bits.length ? steps : bits;
  return toText([...shorter, ...numberBits, ...numbers]);
}

/** Null for anything that is not a link this version wrote. */
export function unpackLink(text: string): Packed | null {
  const bytes = toBytes(text);
  if (!bytes || bytes.length < 3) return null;
  let at = 0;
  const next = () => bytes[at++];
  const readNumber = (): number | null => {
    let value = 0;
    let scale = 1;
    for (;;) {
      const byte = next();
      if (byte === undefined || scale > 2 ** 28) return null;
      value += (byte & 127) * scale;
      if (byte < 128) return value;
      scale *= 128;
    }
  };

  const head = next() ?? 0;
  const version = head >> 2;
  const pages = readNumber();
  if (pages === null) return null;
  const codes: number[] = [];
  if (version === bitsVersion) {
    const size = readNumber();
    if (size === null || at + size > bytes.length) return null;
    for (let index = 0; index < size * 8; index += 1) {
      if (((bytes[at + (index >> 3)] ?? 0) >> (index & 7)) & 1) codes.push(index + 1);
    }
    at += size;
  } else if (version === stepsVersion) {
    const count = readNumber();
    if (count === null || count > bytes.length) return null;
    let last = 0;
    for (let index = 0; index < count; index += 1) {
      const step = readNumber();
      if (step === null || step < 1) return null;
      last += step;
      codes.push(last);
    }
  } else return null;
  const flags = at;
  at += Math.ceil(codes.length / 8);
  if (at > bytes.length) return null;
  const entries: [number, number][] = [];
  for (const [index, code] of codes.entries()) {
    let value: number | null = 1;
    if (((bytes[flags + (index >> 3)] ?? 0) >> (index & 7)) & 1) value = readNumber();
    if (value === null) return null;
    entries.push([code, value]);
  }
  if (at !== bytes.length) return null;
  return { mode: head & 3, pages, entries };
}

/** The code in a link, an address, or the code itself. */
export function codeIn(text: string): string {
  const trimmed = text.trim();
  const hash = trimmed.lastIndexOf("#");
  return hash === -1 ? trimmed : trimmed.slice(hash + 1);
}
