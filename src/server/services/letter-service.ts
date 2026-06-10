import { letterRepository } from "@/server/repositories/letter-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import type { CreateLetterInput, UpdateLetterInput } from "@/lib/validation/letters";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";

const MAX_ENCRYPTED_PAYLOAD_SIZE = 100_000;

function validatePayloadSize(payload: unknown): void {
  const size = JSON.stringify(payload).length;
  if (size > MAX_ENCRYPTED_PAYLOAD_SIZE) {
    throw new Error("Encrypted payload exceeds size limit");
  }
}

export const letterService = {
  async create(userId: string, input: CreateLetterInput) {
    validatePayloadSize(input.encryptedTitle);
    validatePayloadSize(input.encryptedBody);
    validatePayloadSize(input.encryptedLetterKey);

    if (input.encryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    const letter = await letterRepository.create({
      userId,
      encryptedTitle: input.encryptedTitle,
      encryptedBody: input.encryptedBody,
      encryptedLetterKey: input.encryptedLetterKey,
      encryptionVersion: input.encryptionVersion,
      answered: input.answered,
    });

    return letter;
  },

  async list(userId: string) {
    return letterRepository.findByUserId(userId);
  },

  async getById(id: string, userId: string) {
    const letter = await letterRepository.findByIdForUser(id, userId);
    if (!letter) throw new NotFoundError("Letter not found");
    return letter;
  },

  async update(id: string, userId: string, input: UpdateLetterInput) {
    const existing = await letterRepository.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundError("Letter not found");

    if (input.encryptedTitle) validatePayloadSize(input.encryptedTitle);
    if (input.encryptedBody) validatePayloadSize(input.encryptedBody);
    if (input.encryptedLetterKey) validatePayloadSize(input.encryptedLetterKey);

    const updateData: Parameters<typeof letterRepository.update>[2] = {};
    if (input.encryptedTitle) updateData.encryptedTitle = input.encryptedTitle;
    if (input.encryptedBody) updateData.encryptedBody = input.encryptedBody;
    if (input.encryptedLetterKey) updateData.encryptedLetterKey = input.encryptedLetterKey;
    if (input.encryptionVersion) updateData.encryptionVersion = input.encryptionVersion;
    if (input.answered !== undefined) {
      updateData.answered = input.answered;
      updateData.answeredAt = input.answered ? new Date() : null;
    }
    if (input.answeredAt !== undefined) {
      updateData.answeredAt = input.answeredAt ? new Date(input.answeredAt) : null;
    }

    const letter = await letterRepository.update(id, userId, updateData);
    if (!letter) throw new NotFoundError("Letter not found");
    return letter;
  },

  async delete(id: string, userId: string) {
    const deleted = await letterRepository.delete(id, userId);
    if (!deleted) throw new NotFoundError("Letter not found");
    await auditRepository.record("letter_deleted", userId, { endpoint: `/api/letters/${id}` });
    return { success: true };
  },
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
