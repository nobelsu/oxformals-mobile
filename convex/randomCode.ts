/** Lowercase letters and digits without look-alikes (no i, l, o, 0, 1). */
export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}
