import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges classes and resolves tailwind conflicts", () => {
    expect(cn("p-2", "p-4", "font-semibold")).toBe("p-4 font-semibold");
  });
});

