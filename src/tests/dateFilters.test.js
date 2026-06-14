/**
 * Date-filter tests — covers the shared date-range helpers used by the
 * History, Reports and Dashboard date filters.
 *
 * The key correctness property: a <input type="date"> value ("YYYY-MM-DD")
 * must be interpreted as LOCAL midnight, not UTC midnight, otherwise the
 * "from" boundary drops the first hours of the day in +offset timezones (IST).
 *
 * Run with `TZ=Asia/Kolkata` to also exercise the IST-boundary regression.
 */
import { describe, it, expect } from "vitest";
import { startOfDayMs, endOfDayMs, inDateRange } from "../utils";

const D = "2026-06-14";
// Local-time reference instants for that calendar day (TZ-independent: built
// from local Y/M/D components, so they match whatever zone the runner is in).
const localMidnight  = new Date(2026, 5, 14, 0, 0, 0, 0).getTime();
const localMorning   = new Date(2026, 5, 14, 0, 30, 0, 0).getTime();   // 00:30
const localNoon      = new Date(2026, 5, 14, 12, 0, 0, 0).getTime();
const localLateNight = new Date(2026, 5, 14, 23, 30, 0, 0).getTime();  // 23:30
const localEnd       = new Date(2026, 5, 14, 23, 59, 59, 999).getTime();
const prevDayLate    = new Date(2026, 5, 13, 23, 30, 0, 0).getTime();
const nextDayEarly   = new Date(2026, 5, 15, 0, 30, 0, 0).getTime();

describe("startOfDayMs / endOfDayMs", () => {
  it("parses YYYY-MM-DD as LOCAL midnight (not UTC midnight)", () => {
    expect(startOfDayMs(D)).toBe(localMidnight);
  });
  it("end-of-day is local 23:59:59.999", () => {
    expect(endOfDayMs(D)).toBe(localEnd);
  });
  it("returns null for empty / null / undefined", () => {
    expect(startOfDayMs("")).toBeNull();
    expect(startOfDayMs(null)).toBeNull();
    expect(startOfDayMs(undefined)).toBeNull();
    expect(endOfDayMs("")).toBeNull();
  });
  it("returns null for an unparseable string", () => {
    expect(startOfDayMs("not-a-date")).toBeNull();
  });
});

describe("inDateRange — inclusive bounds", () => {
  it("includes a timestamp at local noon on the from/to date", () => {
    expect(inDateRange(localNoon, D, D)).toBe(true);
  });
  it("includes the exact start-of-day boundary", () => {
    expect(inDateRange(localMidnight, D, D)).toBe(true);
  });
  it("includes the exact end-of-day boundary", () => {
    expect(inDateRange(localEnd, D, D)).toBe(true);
  });
  it("excludes the day before and the day after", () => {
    expect(inDateRange(prevDayLate, D, D)).toBe(false);
    expect(inDateRange(nextDayEarly, D, D)).toBe(false);
  });

  it("REGRESSION: a 00:30 entry on the from-date is INCLUDED", () => {
    // Old code used `new Date('2026-06-14').getTime()` (UTC midnight) as the
    // lower bound, which in IST (+05:30) sits at 05:30 local and wrongly
    // dropped this 00:30 entry. The helper must include it.
    expect(inDateRange(localMorning, D, D)).toBe(true);
  });
  it("REGRESSION: a 23:30 entry on the to-date is INCLUDED", () => {
    expect(inDateRange(localLateNight, D, D)).toBe(true);
  });

  it("open-ended: only a from bound", () => {
    expect(inDateRange(localNoon, D, null)).toBe(true);
    expect(inDateRange(prevDayLate, D, null)).toBe(false);
    expect(inDateRange(nextDayEarly, D, null)).toBe(true);
  });
  it("open-ended: only a to bound", () => {
    expect(inDateRange(localNoon, null, D)).toBe(true);
    expect(inDateRange(nextDayEarly, null, D)).toBe(false);
    expect(inDateRange(prevDayLate, null, D)).toBe(true);
  });
  it("no bounds: always true", () => {
    expect(inDateRange(localNoon, null, null)).toBe(true);
    expect(inDateRange(localNoon, "", "")).toBe(true);
  });

  it("multi-day range includes both endpoints' days", () => {
    expect(inDateRange(new Date(2026, 5, 10, 9).getTime(), "2026-06-10", "2026-06-20")).toBe(true);
    expect(inDateRange(new Date(2026, 5, 20, 22).getTime(), "2026-06-10", "2026-06-20")).toBe(true);
    expect(inDateRange(new Date(2026, 5, 21, 1).getTime(), "2026-06-10", "2026-06-20")).toBe(false);
  });
});

describe("proves the fix vs. the old UTC-midnight approach (only bites in +offset zones)", () => {
  it("in a UTC-ahead timezone, the old lower bound would have excluded the 00:30 entry", () => {
    const aheadOfUtc = new Date().getTimezoneOffset() < 0; // e.g. IST = -330
    const oldLowerBound = new Date(D).getTime();           // UTC midnight (the bug)
    const newLowerBound = startOfDayMs(D);                  // local midnight (the fix)
    if (aheadOfUtc) {
      expect(localMorning < oldLowerBound).toBe(true);      // old: excluded
      expect(localMorning >= newLowerBound).toBe(true);     // new: included
    } else {
      // In UTC / behind-UTC zones both behave the same; nothing to prove.
      expect(newLowerBound).toBeLessThanOrEqual(localMorning);
    }
  });
});

describe("History page predicate (manual range overrides period pills)", () => {
  // Mirrors HistoryPage's filter: manual range wins, else rolling period cutoff.
  const predicate = (ts, from, to, cutoff) =>
    !from && !to ? ts >= cutoff : inDateRange(ts, from, to);

  it("falls back to the rolling cutoff when no manual dates", () => {
    const cutoff = localNoon - 1;
    expect(predicate(localNoon, "", "", cutoff)).toBe(true);
    expect(predicate(localNoon - 1000, "", "", cutoff)).toBe(false);
  });
  it("ignores the cutoff once a manual range is set", () => {
    // A far-future cutoff would exclude everything, but the manual range wins.
    const cutoff = Date.now() + 10 * 86400000;
    expect(predicate(localNoon, D, D, cutoff)).toBe(true);
  });
});
