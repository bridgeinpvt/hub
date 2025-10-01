import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    AUTH_SERVICE_URL: z.string().url().default("http://localhost:3001"),
  },
  client: {
    NEXT_PUBLIC_AUTH_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_CAPSULE_URL: z.string().url().default("http://localhost:3002"),
    NEXT_PUBLIC_BUSINESS_URL: z.string().url().default("http://localhost:3004"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
    NEXT_PUBLIC_CAPSULE_URL: process.env.NEXT_PUBLIC_CAPSULE_URL,
    NEXT_PUBLIC_BUSINESS_URL: process.env.NEXT_PUBLIC_BUSINESS_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
