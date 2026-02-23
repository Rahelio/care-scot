import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { lookupRate, type RateCardLineInput } from "../rate-lookup";

const lines: RateCardLineInput[] = [
  {
    dayType: "WEEKDAY",
    timeBandStart: null,
    timeBandEnd: null,
    ratePerHour: new Decimal("22.00"),
    carersRequired: 1,
  },
  {
    dayType: "SATURDAY",
    timeBandStart: null,
    timeBandEnd: null,
    ratePerHour: new Decimal("25.00"),
    carersRequired: 1,
  },
  {
    dayType: "SUNDAY",
    timeBandStart: null,
    timeBandEnd: null,
    ratePerHour: new Decimal("28.00"),
    carersRequired: 1,
  },
  {
    dayType: "BANK_HOLIDAY",
    timeBandStart: null,
    timeBandEnd: null,
    ratePerHour: new Decimal("33.00"),
    carersRequired: 1,
  },
  // Double-up line
  {
    dayType: "WEEKDAY",
    timeBandStart: null,
    timeBandEnd: null,
    ratePerHour: new Decimal("22.00"),
    carersRequired: 2,
  },
];

const timeBandLines: RateCardLineInput[] = [
  {
    dayType: "WEEKDAY",
    timeBandStart: "06:00",
    timeBandEnd: "20:00",
    ratePerHour: new Decimal("26.00"),
    carersRequired: 1,
  },
  {
    dayType: "WEEKDAY",
    timeBandStart: "20:00",
    timeBandEnd: "06:00",
    ratePerHour: new Decimal("30.00"),
    carersRequired: 1,
  },
];

describe("lookupRate", () => {
  it("returns weekday rate for a weekday visit", () => {
    const rate = lookupRate(lines, "WEEKDAY", "09:00", 1);
    expect(Number(rate)).toBe(22);
  });

  it("returns saturday rate", () => {
    const rate = lookupRate(lines, "SATURDAY", "10:00", 1);
    expect(Number(rate)).toBe(25);
  });

  it("returns sunday rate", () => {
    const rate = lookupRate(lines, "SUNDAY", "14:00", 1);
    expect(Number(rate)).toBe(28);
  });

  it("returns bank holiday rate", () => {
    const rate = lookupRate(lines, "BANK_HOLIDAY", "08:00", 1);
    expect(Number(rate)).toBe(33);
  });

  it("returns double-up rate for 2 carers", () => {
    const rate = lookupRate(lines, "WEEKDAY", "09:00", 2);
    expect(Number(rate)).toBe(22);
  });

  it("falls back to carersRequired=1 when exact carer count not found", () => {
    const rate = lookupRate(lines, "SATURDAY", "09:00", 2);
    expect(Number(rate)).toBe(25);
  });

  it("returns null for day type with no lines", () => {
    const singleLine: RateCardLineInput[] = [
      {
        dayType: "WEEKDAY",
        timeBandStart: null,
        timeBandEnd: null,
        ratePerHour: new Decimal("20.00"),
        carersRequired: 1,
      },
    ];
    const rate = lookupRate(singleLine, "SUNDAY", "10:00", 1);
    expect(rate).toBeNull();
  });

  it("returns null for empty lines array", () => {
    const rate = lookupRate([], "WEEKDAY", "09:00", 1);
    expect(rate).toBeNull();
  });

  it("matches daytime time band", () => {
    const rate = lookupRate(timeBandLines, "WEEKDAY", "09:00", 1);
    expect(Number(rate)).toBe(26);
  });

  it("matches overnight time band", () => {
    const rate = lookupRate(timeBandLines, "WEEKDAY", "22:00", 1);
    expect(Number(rate)).toBe(30);
  });

  it("matches early morning in overnight band", () => {
    const rate = lookupRate(timeBandLines, "WEEKDAY", "03:00", 1);
    expect(Number(rate)).toBe(30);
  });

  it("matches exact band start time", () => {
    const rate = lookupRate(timeBandLines, "WEEKDAY", "06:00", 1);
    expect(Number(rate)).toBe(26);
  });

  it("matches exact overnight band start", () => {
    const rate = lookupRate(timeBandLines, "WEEKDAY", "20:00", 1);
    expect(Number(rate)).toBe(30);
  });
});
