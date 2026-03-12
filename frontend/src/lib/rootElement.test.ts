import { describe, expect, it } from "vitest";

import { getRequiredRootElement } from "@/lib/rootElement";

describe("getRequiredRootElement", () => {
  it("returns the root mount element when present", () => {
    document.body.innerHTML = '<div id="root"></div>';

    expect(getRequiredRootElement()).toBe(document.getElementById("root"));
  });

  it('throws a clear error when "#root" is missing', () => {
    document.body.innerHTML = "";

    expect(() => getRequiredRootElement()).toThrowError('Root element "#root" was not found.');
  });
});
