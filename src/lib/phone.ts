// North-American (NANP) phone helpers — pure, safe for client and server.

/**
 * Normalises a Canadian / US number to "+1 (416) 555-0123", or returns null when it isn't a valid
 * NANP number (10 digits, optional leading 1; area code and exchange can't start with 0 or 1).
 */
export function normalizeNaPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw || !/^[+()\d\s.-]{10,25}$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const isValidNaPhone = (input: string | null | undefined) => normalizeNaPhone(input) !== null;
