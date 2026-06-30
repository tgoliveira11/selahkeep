import "server-only";

import { createOutpostAdmin } from "@tgoliveira/outpost/admin";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import {
  buildOutpostEnvConfig,
  readOutpostAdminConfigCacheTtl,
} from "@/lib/env/outpost-from-env";
import { getOutpost, getOutpostConfigOverrideRepository } from "@/lib/outpost";

type OutpostAdminInstance = ReturnType<typeof createOutpostAdmin>;

let outpostAdminInstance: OutpostAdminInstance | null = null;

export function getOutpostAdmin(): OutpostAdminInstance {
  if (!outpostAdminInstance) {
    const envConfig = buildOutpostEnvConfig(process.env);
    outpostAdminInstance = createOutpostAdmin({
      outpost: getOutpost(),
      requireAdmin: requirePlatformAdmin,
      configOverrideRepository: getOutpostConfigOverrideRepository(),
      env: process.env as Record<string, string | undefined>,
      admin: {
        enabled: envConfig.adminEnabled,
        configCacheTtlSeconds: readOutpostAdminConfigCacheTtl(process.env),
      },
    });
  }
  return outpostAdminInstance;
}
