import { Card, CardContent, CardHeader } from "@/ui/card";

type PageSkeletonProps = {
  title?: string;
};

export default function PageSkeleton({ title = "Loading page..." }: PageSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={title}>
      <Card className="overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted/80" />
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="h-4 w-full animate-pulse rounded bg-muted/70" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted/70" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted/80" />
        </CardContent>
      </Card>
      <span className="sr-only">{title}</span>
    </div>
  );
}
