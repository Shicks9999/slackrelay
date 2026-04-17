export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={`animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100 ${sizeClasses[size]}`}
      />
    </div>
  );
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-zinc-100 dark:bg-zinc-800"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
          />
        ))}
      </div>
      <LoadingSkeleton lines={5} />
    </div>
  );
}
