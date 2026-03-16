import { z } from "zod";

/**
 * Validated public environment variables.
 * Zod validates at import‑time so we fail fast on misconfiguration.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("SUGU"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_MARKETPLACE_URL: z.string().url().default("https://sugu.pro"),
  NEXT_PUBLIC_ENABLE_MSW: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // ─── Reverb WebSocket ───────────────────────────────────────────
  NEXT_PUBLIC_REVERB_APP_KEY: z.string().min(1),
  NEXT_PUBLIC_REVERB_HOST: z.string().min(1),
  NEXT_PUBLIC_REVERB_PORT: z.coerce.number().default(8080),
  NEXT_PUBLIC_REVERB_SCHEME: z.enum(["http", "https"]).default("https"),
});

function getEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MARKETPLACE_URL: process.env.NEXT_PUBLIC_MARKETPLACE_URL,
    NEXT_PUBLIC_ENABLE_MSW: process.env.NEXT_PUBLIC_ENABLE_MSW,
    NEXT_PUBLIC_REVERB_APP_KEY: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    NEXT_PUBLIC_REVERB_HOST: process.env.NEXT_PUBLIC_REVERB_HOST,
    NEXT_PUBLIC_REVERB_PORT: process.env.NEXT_PUBLIC_REVERB_PORT,
    NEXT_PUBLIC_REVERB_SCHEME: process.env.NEXT_PUBLIC_REVERB_SCHEME,
  });

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = getEnv();
