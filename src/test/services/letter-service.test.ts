import { describe, it, expect, vi, beforeEach } from "vitest";
import { letterService, NotFoundError } from "@/server/services/letter-service";
import { createLetterInput, LETTER_ID, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findByUserId: vi.fn(),
  findByIdForUser: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/letter-repository", () => ({
  letterRepository: {
    create: mocks.create,
    findByUserId: mocks.findByUserId,
    findByIdForUser: mocks.findByIdForUser,
    update: mocks.update,
    delete: mocks.delete,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

describe("letter service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists letters for user", async () => {
    mocks.findByUserId.mockResolvedValue([{ id: LETTER_ID }]);
    await expect(letterService.list(USER_ID)).resolves.toEqual([{ id: LETTER_ID }]);
  });

  it("creates encrypted letters", async () => {
    mocks.create.mockResolvedValue({ id: LETTER_ID });
    const input = createLetterInput();
    await expect(letterService.create(USER_ID, input)).resolves.toEqual({ id: LETTER_ID });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID }));
  });

  it("rejects unsupported encryption version", async () => {
    const input = { ...createLetterInput(), encryptionVersion: "legacy" as "enc-v1" };
    await expect(letterService.create(USER_ID, input)).rejects.toThrow(
      "Unsupported encryption version"
    );
  });

  it("rejects create when AAD resourceId does not match letter id", async () => {
    const input = createLetterInput();
    input.encryptedTitle.aad.resourceId = "00000000-0000-0000-0000-000000000099";
    await expect(letterService.create(USER_ID, input)).rejects.toThrow("resourceId");
  });

  it("rejects oversized payloads", async () => {
    const input = createLetterInput();
    input.encryptedTitle.ciphertext = "x".repeat(120_000);
    await expect(letterService.create(USER_ID, input)).rejects.toThrow("size limit");
  });

  it("getById returns a letter", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: LETTER_ID });
    await expect(letterService.getById(LETTER_ID, USER_ID)).resolves.toEqual({ id: LETTER_ID });
  });

  it("getById throws when missing", async () => {
    mocks.findByIdForUser.mockResolvedValue(null);
    await expect(letterService.getById(LETTER_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update returns not found when repository update fails", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: LETTER_ID });
    mocks.update.mockResolvedValue(null);
    await expect(
      letterService.update(LETTER_ID, USER_ID, { answered: true })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update accepts encryption version and answeredAt only", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: LETTER_ID });
    mocks.update.mockResolvedValue({ id: LETTER_ID });
    await letterService.update(LETTER_ID, USER_ID, {
      encryptionVersion: "enc-v1",
      answeredAt: null,
    });
    expect(mocks.update).toHaveBeenCalledWith(
      LETTER_ID,
      USER_ID,
      expect.objectContaining({ encryptionVersion: "enc-v1", answeredAt: null })
    );
  });

  it("update sets answeredAt when marking answered", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: LETTER_ID });
    mocks.update.mockResolvedValue({ id: LETTER_ID, answered: true });
    await letterService.update(LETTER_ID, USER_ID, { answered: true });
    expect(mocks.update).toHaveBeenCalledWith(
      LETTER_ID,
      USER_ID,
      expect.objectContaining({ answered: true, answeredAt: expect.any(Date) })
    );
  });

  it("delete records audit event", async () => {
    mocks.delete.mockResolvedValue(true);
    await letterService.delete(LETTER_ID, USER_ID);
    expect(mocks.record).toHaveBeenCalledWith("letter_deleted", USER_ID, expect.any(Object));
  });
});
