import { landingPageSchema, type LandingPageData } from "./schema";
import { landingPageMock } from "./mocks/hero";

// ============================================================
// Landing Page — Service Layer (Design-Only: returns mocks)
// ============================================================
// 🔌 READY FOR API: Replace mock import with a real fetch call.
//    Only this file needs to change — UI components stay untouched.

/**
 * Get landing page data.
 * Design-only: returns validated mock data.
 * Production: replace with `api.get("/landing")` or CMS call.
 */
export async function getLandingPageData(): Promise<LandingPageData> {
  // Design-only: return mock validated by Zod
  const validated = landingPageSchema.parse(landingPageMock);
  return validated;
}
