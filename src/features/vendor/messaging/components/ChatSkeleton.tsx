"use client";

export function ChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-start">
          <div className="h-16 w-52 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex justify-end">
          <div className="h-12 w-44 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex justify-start">
          <div className="h-20 w-60 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-36 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Composer skeleton */}
      <div className="h-12 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
