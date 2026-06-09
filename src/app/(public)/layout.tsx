import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-sugu-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950/80">
      {children}
    </div>
  );
}
