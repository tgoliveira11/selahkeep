import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { userRepository } from "@/server/repositories/user-repository";
import { authService } from "@/server/services/auth-service";
import { authLoginService } from "@/server/services/auth-login-service";
import { twoFactorService } from "@/server/services/two-factor-service";
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
      id: "login-token",
      name: "LoginToken",
      credentials: {
        loginToken: { label: "Login Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.loginToken) return null;
        const user = await authLoginService.consumeLoginToken(credentials.loginToken);
        if (!user) return null;
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
        await userRepository.markEmailVerified(dbUser.id);
      } else if (dbUser && account?.provider && account.provider !== "login-token" && !dbUser.emailVerifiedAt) {
        await userRepository.markEmailVerified(dbUser.id);
      }
      if (dbUser && account?.provider && account.provider !== "login-token") {
        await authService.recordLoginSuccess(dbUser.id, account.provider);
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user?.email) {
        const dbUser = await userRepository.findByEmail(user.email);
        if (dbUser) {
          const issuedAtMs =
            typeof token.iat === "number" ? token.iat * 1000 : undefined;
          if (
            dbUser.passwordUpdatedAt &&
            issuedAtMs !== undefined &&
            issuedAtMs < dbUser.passwordUpdatedAt.getTime()
          ) {
            return { ...token, sub: undefined, sessionInvalidated: true };
          }
          token.sub = dbUser.id;
          if (account?.provider === "login-token") {
            token.twoFactorVerified = true;
            token.twoFactorPending = false;
          } else if (account) {
            const enabled = await twoFactorService.isEnabledForUser(dbUser.id);
            token.twoFactorVerified = !enabled;
            token.twoFactorPending = enabled;
          }
        }
      } else if (token.sub) {
        const dbUser = await userRepository.findById(token.sub);
        const issuedAtMs =
          typeof token.iat === "number" ? token.iat * 1000 : undefined;
        if (
          dbUser?.passwordUpdatedAt &&
          issuedAtMs !== undefined &&
          issuedAtMs < dbUser.passwordUpdatedAt.getTime()
        ) {
          return { ...token, sub: undefined, sessionInvalidated: true };
        }
      } else if (token.email && !token.sub) {
        const dbUser = await userRepository.findByEmail(token.email);
        if (dbUser) token.sub = dbUser.id;
      }

      if (trigger === "update" && session?.twoFactorUpgradeToken && token.sub) {
        const verified = await twoFactorService.consumeSessionUpgradeToken(
          token.sub,
          session.twoFactorUpgradeToken
        );
        if (verified) {
          token.twoFactorVerified = true;
          token.twoFactorPending = false;
        }
      }

      if (account) token.provider = account.provider;
      if (token.twoFactorVerified === undefined) {
        token.twoFactorVerified = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sessionInvalidated) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      session.twoFactorVerified = token.twoFactorVerified !== false;
      session.twoFactorPending =
        token.twoFactorPending === true && token.twoFactorVerified === false;
      return session;
    },
  },
};
