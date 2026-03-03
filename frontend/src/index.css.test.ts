import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("global mobile-safe form styles", () => {
  it("keeps shared field-input font-size safe for mobile keyboards", () => {
    const cssPath = resolve(process.cwd(), "src/index.css");
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(
      "@apply min-h-10 min-w-0 w-full max-w-full rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-base md:text-sm"
    );
  });
});
