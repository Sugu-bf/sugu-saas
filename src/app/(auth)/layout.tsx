/**
 * (auth) layout — minimal, no sidebar, no topbar.
 * Used for login, register, forgot password, etc.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-sugu-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {children}
    </div>
  );
}
