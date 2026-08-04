import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { determineDayType, getScheduleDayOfWeek } from "../financial";

// visit.visitDate is a @db.Date column, which Prisma returns as a
// UTC-midnight Date object. determineDayType/getScheduleDayOfWeek used to
// call .getDay() (local timezone) on it, which is the exact anti-pattern
// already identified and fixed in rota.ts's DAY_OF_WEEK_BY_JS_DAY — in a
// server running with a negative UTC offset (e.g. US timezones), a
// UTC-midnight Sunday reads as Saturday locally, applying the wrong
// billing rate. Node does respect runtime process.env.TZ changes for Date
// methods (verified directly), so these tests pin the fix by running the
// same UTC-midnight date under a negative-offset TZ and asserting the
// classification doesn't shift.
const ORIGINAL_TZ = process.env.TZ;

beforeEach(() => {
  process.env.TZ = "Pacific/Honolulu"; // UTC-10, no DST — a stable negative offset
});

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("determineDayType", () => {
  it("classifies a UTC-midnight Sunday as SUNDAY even under a negative-offset TZ", () => {
    const sunday = new Date("2026-08-02T00:00:00.000Z");
    expect(determineDayType(sunday, new Set())).toBe("SUNDAY");
  });

  it("classifies a UTC-midnight Saturday as SATURDAY even under a negative-offset TZ", () => {
    const saturday = new Date("2026-08-01T00:00:00.000Z");
    expect(determineDayType(saturday, new Set())).toBe("SATURDAY");
  });

  it("classifies a UTC-midnight weekday as WEEKDAY", () => {
    const monday = new Date("2026-08-03T00:00:00.000Z");
    expect(determineDayType(monday, new Set())).toBe("WEEKDAY");
  });

  it("classifies a date in the bank-holiday set as BANK_HOLIDAY even when it would otherwise be a weekday", () => {
    const monday = new Date("2026-08-03T00:00:00.000Z");
    expect(determineDayType(monday, new Set(["2026-08-03"]))).toBe("BANK_HOLIDAY");
  });

  it("bank holiday takes priority over weekend classification", () => {
    const sunday = new Date("2026-08-02T00:00:00.000Z");
    expect(determineDayType(sunday, new Set(["2026-08-02"]))).toBe("BANK_HOLIDAY");
  });
});

describe("getScheduleDayOfWeek", () => {
  it("returns SUNDAY for a UTC-midnight Sunday even under a negative-offset TZ", () => {
    expect(getScheduleDayOfWeek(new Date("2026-08-02T00:00:00.000Z"))).toBe("SUNDAY");
  });

  it("returns MONDAY for a UTC-midnight Monday even under a negative-offset TZ", () => {
    expect(getScheduleDayOfWeek(new Date("2026-08-03T00:00:00.000Z"))).toBe("MONDAY");
  });
});
