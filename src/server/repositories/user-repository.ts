import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const userRepository = {
  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },

  async create(data: {
    email: string;
    authProvider: string;
    passwordHash?: string | null;
  }) {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        authProvider: data.authProvider,
        passwordHash: data.passwordHash ?? null,
      })
      .returning();
    return user;
  },

  async updatePassword(id: string, passwordHash: string) {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },
};
