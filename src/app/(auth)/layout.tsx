import { AuthFrame } from "@/features/auth/components/auth-frame";

/**
 * (auth) layout — brand, one card, no navigation.
 * Used by login, password recovery, first access and courier signup.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
