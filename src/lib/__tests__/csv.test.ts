import { describe, it, expect } from "vitest";
import { escapeCsv, buildCsv } from "../csv";

describe("escapeCsv", () => {
  it("passes plain values through unchanged", () => {
    expect(escapeCsv("Mary MacDonald")).toBe("Mary MacDonald");
    expect(escapeCsv(42)).toBe("42");
  });

  it("returns an empty string for null/undefined", () => {
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    expect(escapeCsv("Smith, John")).toBe('"Smith, John"');
    expect(escapeCsv('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
  });

  // Excel/Sheets treats a cell starting with =, +, -, or @ as a formula —
  // free-text fields (client names, complaint/incident descriptions) are
  // user-entered and land directly in CSV exports.
  for (const prefix of ["=", "+", "-", "@"]) {
    it(`neutralizes a formula-injection payload starting with '${prefix}'`, () => {
      const payload = `${prefix}SUM(1+1)`;
      const escaped = escapeCsv(payload);
      expect(escaped.startsWith("'")).toBe(true);
      expect(escaped).toContain(payload);
    });
  }

  it("does not treat a mid-string formula character as dangerous", () => {
    expect(escapeCsv("Total = 5")).toBe("Total = 5");
  });

  it("quotes a neutralized formula value that also contains a comma", () => {
    expect(escapeCsv("=A1,B1")).toBe('"\'=A1,B1"');
  });
});

describe("buildCsv", () => {
  it("joins headers and rows with newlines, escaping each cell", () => {
    const csv = buildCsv(["Name", "Note"], [["Mary MacDonald", "=cmd|/c calc"]]);
    expect(csv).toBe('Name,Note\nMary MacDonald,\'=cmd|/c calc');
  });
});
