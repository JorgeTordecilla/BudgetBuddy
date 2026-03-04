import React, { type ReactNode } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

type RouteChunkErrorBoundaryProps = {
  children: ReactNode;
  routeName: string;
};

type RouteChunkErrorBoundaryState = {
  hasError: boolean;
  retryToken: number;
};

export default class RouteChunkErrorBoundary extends React.Component<RouteChunkErrorBoundaryProps, RouteChunkErrorBoundaryState> {
  state: RouteChunkErrorBoundaryState = {
    hasError: false,
    retryToken: 0
  };

  static getDerivedStateFromError(): Partial<RouteChunkErrorBoundaryState> {
    return { hasError: true };
  }

  private readonly retry = (): void => {
    this.setState((previous) => ({
      hasError: false,
      retryToken: previous.retryToken + 1
    }));
  };

  private readonly reloadPage = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Unable to load {this.props.routeName}</CardTitle>
            <CardDescription>
              The page code could not be downloaded. Please retry. Navigation remains available.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" onClick={this.retry}>
              Retry
            </Button>
            <Button type="button" variant="outline" onClick={this.reloadPage}>
              Reload page
            </Button>
          </CardContent>
        </Card>
      );
    }

    return <React.Fragment key={this.state.retryToken}>{this.props.children}</React.Fragment>;
  }
}
