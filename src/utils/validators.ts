// Shared input-format validators (India).

/** Indian mobile: exactly 10 digits, starting 6-9. */
export const isValidMobile = (v: string): boolean => /^[6-9]\d{9}$/.test((v || "").trim());

/** Keep only digits, cap at 10 — for onChange of a mobile field. */
export const cleanMobile = (v: string): string => (v || "").replace(/\D/g, "").slice(0, 10);

/**
 * GSTIN: 15 chars — 2-digit state code, 10-char PAN (5 letters, 4 digits,
 * 1 letter), 1 entity digit/letter, the literal 'Z', 1 check digit/letter.
 * e.g. 27AABCU9603R1ZX
 */
export const isValidGstin = (v: string): boolean =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test((v || "").trim().toUpperCase());

/** Uppercase, strip invalid chars, cap at 15 — for onChange of a GSTIN field. */
export const cleanGstin = (v: string): string => (v || "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);

/** Indian PIN code: exactly 6 digits, not starting with 0. */
export const isValidPincode = (v: string): boolean => /^[1-9]\d{5}$/.test((v || "").trim());
