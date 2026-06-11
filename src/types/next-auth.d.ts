import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    twoFactorVerified: boolean;
    twoFactorPending: boolean;
    twoFactorUpgradeToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    provider?: string;
    twoFactorVerified?: boolean;
    twoFactorPending?: boolean;
  }
}
