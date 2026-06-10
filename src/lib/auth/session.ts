import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
  };
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
  return user;
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
