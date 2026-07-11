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
/** Keep only digits, cap at 6 — for onChange of a pincode field. */
export const cleanPincode = (v: string): string => (v || "").replace(/\D/g, "").slice(0, 6);

/** PAN: 5 letters, 4 digits, 1 letter — e.g. ABCDE1234F. */
export const isValidPan = (v: string): boolean => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test((v || "").trim().toUpperCase());
export const cleanPan = (v: string): string => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

/** IFSC: 4 letters, a 0, then 6 alphanumerics — e.g. SBIN0016443. */
export const isValidIfsc = (v: string): boolean => /^[A-Z]{4}0[A-Z0-9]{6}$/.test((v || "").trim().toUpperCase());
export const cleanIfsc = (v: string): string => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);

/** Bank account number: 9–18 digits. */
export const isValidAccountNo = (v: string): boolean => /^\d{9,18}$/.test((v || "").trim());
export const cleanAccountNo = (v: string): string => (v || "").replace(/\D/g, "").slice(0, 18);

/** Email — basic RFC-ish check. */
export const isValidEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

/** HSN/SAC code: 4–8 digits. */
export const isValidHsn = (v: string): boolean => /^\d{4,8}$/.test((v || "").trim());
export const cleanHsn = (v: string): string => (v || "").replace(/\D/g, "").slice(0, 8);

/** Vehicle registration: uppercase alphanumerics + spaces, capped at 15. */
export const cleanVehicleReg = (v: string): string => (v || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 15);
