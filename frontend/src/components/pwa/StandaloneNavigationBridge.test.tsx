import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import StandaloneNavigationBridge from "@/components/pwa/StandaloneNavigationBridge";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

type TestLinkProps = {
  href: string;
  label: string;
};

function TestLink({ href, label }: TestLinkProps) {
  return (
    <a href={href} onClick={(event) => event.preventDefault()}>
      {label}
    </a>
  );
}

function renderBridge(initialPath = "/start") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <StandaloneNavigationBridge />
      <TestLink href="/next" label="Go next" />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("StandaloneNavigationBridge", () => {
  it("navigates internal links in standalone display mode", () => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

    renderBridge();
    expect(screen.getByTestId("location")).toHaveTextContent("/start");

    fireEvent.click(screen.getByRole("link", { name: "Go next" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/next");
  });

  it("ignores navigation when not in standalone mode", () => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

    renderBridge();
    fireEvent.click(screen.getByRole("link", { name: "Go next" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/start");
  });

  it("does not hijack modified clicks", () => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    renderBridge();
    fireEvent.click(screen.getByRole("link", { name: "Go next" }), { ctrlKey: true });

    expect(screen.getByTestId("location")).toHaveTextContent("/start");
  });

  it("does not hijack external or special-scheme links", () => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    render(
      <MemoryRouter initialEntries={["/start"]}>
        <StandaloneNavigationBridge />
        <TestLink href="https://example.com" label="External" />
        <TestLink href="mailto:test@example.com" label="Mail" />
        <TestLink href="tel:+573001112233" label="Tel" />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("link", { name: "External" }));
    fireEvent.click(screen.getByRole("link", { name: "Mail" }));
    fireEvent.click(screen.getByRole("link", { name: "Tel" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/start");
  });

  it("does not navigate when destination equals current location", () => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    render(
      <MemoryRouter initialEntries={["/start"]}>
        <StandaloneNavigationBridge />
        <TestLink href="/start" label="Same" />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("link", { name: "Same" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/start");
  });
});
