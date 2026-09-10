import { randomInt } from "node:crypto";

// No 0/O or 1/I: hard to misread when copied off a phone screen.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Short, unguessable invite code (33^8 combinations) - readable enough to type or read aloud. */
export function generateShareCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
