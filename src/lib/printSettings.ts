/**
 * printSettings.ts — stores the user's preferred print format in localStorage.
 * Per-device preference (not per-shop) — a thermal printer is plugged into a
 * specific computer, so the format follows the device, not the account.
 */

export type PrintFormat = "a4" | "thermal";

const KEY = "rp_print_format";
const DEFAULT: PrintFormat = "a4";

export function getPrintFormat(): PrintFormat {
  const v = localStorage.getItem(KEY);
  return v === "thermal" ? "thermal" : DEFAULT;
}

export function setPrintFormat(fmt: PrintFormat): void {
  localStorage.setItem(KEY, fmt);
}
