import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { userRepository } from "@/server/repositories/user-repository";
import { authService } from "@/server/services/auth-service";
import { authLoginService } from "@/server/services/auth-login-service";
import { twoFactorService } from "@/server/services/two-factor-service";
import { accountSessionService } from "@/server/services/account-session-service";
import { safeLogger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : undefined;
      const userId = typeof token?.sub === "string" ? token.sub : undefined;
      const sessionId = typeof token?.sid === "string" ? token.sid : undefined;
      if (!userId) return;
      try {
        await accountSessionService.revokeOnSignOut(userId, sessionId);
      } catch (error) {
        safeLogger.warn("Account session revoke on sign-out skipped", {
          errorCode: "session_revoke_on_signout_failed",
          endpoint: "signout-event",
        });
      }
    },
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
        const result = await authLoginService.consumeLoginToken(credentials.loginToken);
        if (!result) return null;
        return {
          id: result.user.id,
          email: result.user.email,
          authMethod: result.authMethod,
        };
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

      const userId = typeof token.sub === "string" ? token.sub : undefined;
      let sessionJustCreated = false;

      try {
        if (account && userId) {
          const authMethod = accountSessionService.mapProviderToAuthMethod(
            account.provider,
            (user as { authMethod?: string } | undefined)?.authMethod
          );
          const sessionRow = await accountSessionService.createSession({
            userId,
            authMethod,
          });
          token.sid = sessionRow.id;
          sessionJustCreated = true;
        } else if (userId && !token.sid) {
          const sessionRow = await accountSessionService.createSession({
            userId,
            authMethod: accountSessionService.mapProviderToAuthMethod(
              typeof token.provider === "string" ? token.provider : undefined
            ),
          });
          token.sid = sessionRow.id;
          sessionJustCreated = true;
        }

        if (token.sid && userId) {
          if (!sessionJustCreated) {
            const active = await accountSessionService.assertSessionActive(
              token.sid as string,
              userId
            );
            if (!active) {
              return { ...token, sub: undefined, sessionInvalidated: true };
            }
          }
          await accountSessionService.touchSessionThrottled(token.sid as string, userId);
        }
      } catch (error) {
        safeLogger.warn("Account session tracking skipped", {
          errorCode: "session_tracking_unavailable",
          endpoint: "jwt-callback",
        });
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
      if (typeof token.sid === "string") {
        session.accountSessionId = token.sid;
      }
      session.twoFactorVerified = token.twoFactorVerified !== false;
      session.twoFactorPending =
        token.twoFactorPending === true && token.twoFactorVerified === false;
      return session;
    },
  },
};
