"use client";

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-fade-in">
      <div className="flex items-center gap-1">
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {userName} écrit…
      </span>
    </div>
  );
}
