import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("vite dev proxy config", () => {
  it("defines /api proxy with env target and localhost fallback", () => {
    const configPath = path.resolve(__dirname, "../../vite.config.ts");
    const source = readFileSync(configPath, "utf8");

    expect(source).toContain('"/api"');
    expect(source).toContain("target: process.env.VITE_DEV_API_TARGET || \"http://localhost:8000\"");
    expect(source).toContain("changeOrigin: true");
    expect(source).toContain("secure: false");
  });
});
