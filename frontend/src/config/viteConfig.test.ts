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

  it("keeps PWA runtime caching safeguards and ordered auth exclusions", () => {
    const configPath = path.resolve(__dirname, "../../vite.config.ts");
    const source = readFileSync(configPath, "utf8");
    const swPath = path.resolve(__dirname, "../../src/sw.ts");
    const swSource = readFileSync(swPath, "utf8");

    expect(source).toContain('registerType: "prompt"');
    expect(source).toContain('enabled: false');
    expect(source).toContain('start_url: "/app/transactions"');
    expect(source).toContain('display: "standalone"');
    expect(source).toContain('strategies: "injectManifest"');
    expect(source).toContain('filename: "sw.ts"');

    const networkOnlyIndex = swSource.indexOf("new NetworkOnly()");
    const networkFirstIndex = swSource.indexOf("new NetworkFirst(");
    expect(networkOnlyIndex).toBeGreaterThan(-1);
    expect(networkFirstIndex).toBeGreaterThan(-1);
    expect(networkOnlyIndex).toBeLessThan(networkFirstIndex);

    expect(swSource).toContain('url.pathname.startsWith("/api/auth/")');
    expect(swSource).toContain('url.pathname === "/api/me"');
    expect(swSource).toContain('url.pathname === "/api/token"');
    expect(swSource).toContain('url.pathname === "/api/refresh"');
  });
});
