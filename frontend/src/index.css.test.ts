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

  it("defines shared date/month rules that prevent intrinsic mobile overflow", () => {
    const cssPath = resolve(process.cwd(), "src/index.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".field-date-input");
    expect(css).toContain("input[type=\"date\"]::-webkit-datetime-edit-fields-wrapper");
    expect(css).toContain("input[type=\"month\"]::-webkit-datetime-edit-fields-wrapper");
    expect(css).toContain("input[type=\"date\"]::-webkit-date-and-time-value");
    expect(css).toContain("input[type=\"month\"]::-webkit-date-and-time-value");
    expect(css).toContain("width: 100%;");
    expect(css).toContain("text-overflow: ellipsis;");
    expect(css).toContain("white-space: nowrap;");
    expect(css).toContain("box-sizing: border-box;");
    expect(css).toContain("min-inline-size: 0;");
    expect(css).toContain("max-inline-size: 100%;");
  });
});
