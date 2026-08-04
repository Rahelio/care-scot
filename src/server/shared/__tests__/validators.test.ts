import { describe, it, expect } from "vitest";
import { paginationSchema } from "../validators";

// Several client-picker dropdowns (incident/safeguarding/complaint/survey/
// compliment/medication-error forms) request `limit: 200` to fetch "all
// active clients" for a <Select> in one page. When the cap here was 100,
// that request failed zod validation server-side and every one of those
// dropdowns silently rendered empty for any org with enough clients — caught
// live via e2e testing, not by inspection. This test pins the cap those
// forms actually rely on so it can't quietly regress back down.
describe("paginationSchema", () => {
  it("accepts limit: 200 (what the client-picker dropdowns request)", () => {
    expect(() => paginationSchema.parse({ limit: 200 })).not.toThrow();
  });

  it("rejects a limit above 200", () => {
    expect(() => paginationSchema.parse({ limit: 201 })).toThrow();
  });

  it("still rejects limit: 0 and defaults page/limit sensibly", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });
});
