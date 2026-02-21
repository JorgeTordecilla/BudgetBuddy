import { describe, expect, it } from "vitest";

import { API_BASE_URL } from "@/config";

describe("config", () => {
  it("exports a non-empty api base url", () => {
    expect(API_BASE_URL).toBeTypeOf("string");
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });
});

