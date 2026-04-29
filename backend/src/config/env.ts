import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  WHATSAPP_SESSION_PATH: z.string().default("./sessions"),
  WHATSAPP_MAX_RETRIES: z.coerce.number().default(3),
  WHATSAPP_MESSAGE_DELAY_MS: z.coerce.number().default(2000),

  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().default(8),
  RATE_LIMIT_MAX_PER_HOUR: z.coerce.number().default(200),
  RATE_LIMIT_MAX_PER_DAY: z.coerce.number().default(1500),

  API_RATE_LIMIT: z.coerce.number().default(100),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_BUSINESS_ACCOUNT_ID: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
