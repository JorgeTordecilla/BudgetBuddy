import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hookState = {
  permission: "default",
  loading: false,
  requestAndSubscribe: vi.fn(),
  unsubscribe: vi.fn()
};

vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => hookState
}));

import PushPermissionRequest from "@/components/pwa/PushPermissionRequest";

describe("PushPermissionRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    hookState.permission = "default";
    hookState.loading = false;
  });

  it("does not render before minimum sessions", () => {
    localStorage.setItem("pwa_session_count", "2");
    render(<PushPermissionRequest />);
    expect(screen.queryByRole("banner", { name: "Enable reminders" })).not.toBeInTheDocument();
  });

  it("renders from session 3 and triggers subscribe", () => {
    localStorage.setItem("pwa_session_count", "3");
    render(<PushPermissionRequest />);

    expect(screen.getByRole("banner", { name: "Enable reminders" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enable" }));
    expect(hookState.requestAndSubscribe).toHaveBeenCalledTimes(1);
  });

  it("stores defer timestamp when dismissed", () => {
    localStorage.setItem("pwa_session_count", "5");
    render(<PushPermissionRequest />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    const deferUntil = Number.parseInt(localStorage.getItem("push_defer_until") ?? "0", 10);
    expect(deferUntil).toBeGreaterThan(Date.now());
    expect(screen.queryByRole("banner", { name: "Enable reminders" })).not.toBeInTheDocument();
  });
});
