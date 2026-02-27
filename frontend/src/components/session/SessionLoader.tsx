type SessionLoaderProps = {
  message?: string;
  fullScreen?: boolean;
};

export default function SessionLoader({ message = "Checking session...", fullScreen = false }: SessionLoaderProps) {
  return (
    <div className={fullScreen ? "flex min-h-screen items-center justify-center p-6" : "flex min-h-[40vh] items-center justify-center p-6"}>
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          aria-hidden="true"
        />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}
