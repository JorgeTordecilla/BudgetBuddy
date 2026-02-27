import { describe, expect, it } from "vitest";

import { API_BASE_URL, APP_ENV } from "@/config";

describe("config", () => {
  it("exports a non-empty api base url", () => {
    expect(API_BASE_URL).toBeTypeOf("string");
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it("exports a normalized app env", () => {
    expect(["development", "staging", "production"]).toContain(APP_ENV);
  });
});
