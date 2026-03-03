import React, { type ReactNode } from "react";

import { copyToClipboard } from "@/utils/clipboard";
import { getDiagnosticsSnapshot } from "@/state/diagnostics";
import { captureRuntimeFailure } from "@/observability/runtime";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";

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
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Something went wrong</CardTitle>
            <CardDescription>A runtime error occurred. You can try again or reload the page.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={this.handleTryAgain}>
                Try again
              </Button>
              <Button type="button" variant="outline" onClick={this.handleReload}>
                Reload
              </Button>
              <Button type="button" variant="outline" onClick={this.handleCopyDiagnostics}>
                {this.state.copied ? "Copied" : "Copy diagnostic info"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
}
