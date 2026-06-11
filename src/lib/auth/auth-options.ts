import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { userRepository } from "@/server/repositories/user-repository";
import { authService } from "@/server/services/auth-service";
import { verifyPassword } from "@/server/policies/password-hashing";
import { RateLimitError } from "@/server/policies/rate-limit";
import { getLoginRequestIp } from "@/lib/auth/login-request-context";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          await authService.assertLoginAllowed(credentials.email, getLoginRequestIp());
        } catch (error) {
          if (error instanceof RateLimitError) return null;
          throw error;
        }

        const user = await userRepository.findByEmail(credentials.email);
        if (!user?.passwordHash) {
          await authService.recordLoginFailure(credentials.email);
          return null;
        }

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) {
          await authService.recordLoginFailure(credentials.email);
          return null;
        }

        await authService.recordLoginSuccess(user.id, "credentials");
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      let dbUser = await userRepository.findByEmail(user.email);
      if (!dbUser && account) {
        dbUser = await userRepository.create({
          email: user.email,
          authProvider: account.provider,
        });
      }
      if (dbUser && account?.provider && account.provider !== "credentials") {
        await authService.recordLoginSuccess(dbUser.id, account.provider);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const dbUser = await userRepository.findByEmail(user.email);
        if (dbUser) token.sub = dbUser.id;
      } else if (token.email && !token.sub) {
        const dbUser = await userRepository.findByEmail(token.email);
        if (dbUser) token.sub = dbUser.id;
      }
      if (account) token.provider = account.provider;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
