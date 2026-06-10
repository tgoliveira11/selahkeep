import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { userRepository } from "@/server/repositories/user-repository";
import { enforceRateLimit, RateLimitError } from "@/server/policies/rate-limit";
import { safeLogger } from "@/lib/logger";
import { getClientIp } from "@/lib/request-ip";
import { apiError } from "@/lib/api-helpers";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

function registrationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Registration failed";

  const message = error.message.toLowerCase();
  if (message.includes("database_url")) {
    return "Server misconfiguration: DATABASE_URL is not set.";
  }
  if (
    message.includes("connect") ||
    message.includes("econnrefused") ||
    message.includes("connection")
  ) {
    return "Database unavailable. Start PostgreSQL (docker compose up -d) and run migrations (npm run db:migrate).";
  }
  if (message.includes("relation") && message.includes("does not exist")) {
    return "Database schema missing. Run migrations: npm run db:migrate";
  }

  return "Registration failed. Please try again.";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    await enforceRateLimit({
      operation: "auth.register",
      ip,
      endpoint: "/api/auth/register",
    });

    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await userRepository.findByEmail(parsed.data.email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await userRepository.create({
      email: parsed.data.email,
      authProvider: "credentials",
      passwordHash,
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return apiError(error, "/api/auth/register");
    }
    safeLogger.error("Registration failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: registrationErrorMessage(error) },
      { status: 500 }
    );
  }
}
