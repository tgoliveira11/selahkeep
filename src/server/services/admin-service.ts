import { userRepository } from "@/server/repositories/user-repository";
import { noteRepository } from "@/server/repositories/note-repository";
import { trustedDeviceRepository } from "@/server/repositories/trusted-device-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";

export const adminService = {
  async getUserSummary(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) return null;

    const vault = await vaultRepository.findVaultByUserId(userId);
    const noteCount = vault ? await noteRepository.countByVaultId(vault.id) : 0;
    const trustedDeviceCount = await trustedDeviceRepository.countActiveByUserId(userId);
    const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
    const methods = envelopes.map((e) => e.method);

    return {
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      noteCount,
      trustedDeviceCount,
      recoveryMethods: methods,
    };
  },
};
