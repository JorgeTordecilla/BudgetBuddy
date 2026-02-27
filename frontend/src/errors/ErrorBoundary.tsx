import React, { type ReactNode } from "react";

import { copyToClipboard } from "@/utils/clipboard";
import { getDiagnosticsSnapshot } from "@/state/diagnostics";
import { captureRuntimeFailure } from "@/observability/runtime";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  copied: boolean;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    copied: false
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
      copied: false
    };
  }

  componentDidCatch(error: Error): void {
    // Fallback UI intentionally handles runtime failures; diagnostics are copied on demand.
    const snapshot = getDiagnosticsSnapshot();
    captureRuntimeFailure({
      message: error.message,
      requestId: snapshot.lastRequestId,
      problemType: snapshot.lastProblemType,
      path: snapshot.lastPath
    });
  }

  private readonly handleTryAgain = (): void => {
    this.setState({ hasError: false, copied: false });
  };

  private readonly handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private readonly handleCopyDiagnostics = async (): Promise<void> => {
    const snapshot = getDiagnosticsSnapshot();
    const payload = JSON.stringify(
      {
        request_id: snapshot.lastRequestId,
        problem_type: snapshot.lastProblemType,
        path: snapshot.lastPath,
        timestamp: snapshot.lastTimestamp ?? new Date().toISOString()
      },
      null,
      2
    );
    const ok = await copyToClipboard(payload);
    if (ok) {
      this.setState({ copied: true });
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-sm">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">A runtime error occurred. You can try again or reload the page.</p>
          </header>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={this.handleTryAgain}>
              Try again
            </button>
            <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={this.handleReload}>
              Reload
            </button>
            <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={this.handleCopyDiagnostics}>
              {this.state.copied ? "Copied" : "Copy diagnostic info"}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
