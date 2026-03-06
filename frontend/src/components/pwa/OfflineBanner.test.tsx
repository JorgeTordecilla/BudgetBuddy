import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OfflineBanner from "@/components/pwa/OfflineBanner";

function setOnlineState(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => value
  });
}

describe("OfflineBanner", () => {
  it("renders when browser is offline and hides when online", () => {
    setOnlineState(false);
    render(<OfflineBanner />);
    expect(screen.getByText("Sin conexion - mostrando datos guardados")).toBeInTheDocument();

    setOnlineState(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByText("Sin conexion - mostrando datos guardados")).not.toBeInTheDocument();
  });
});
