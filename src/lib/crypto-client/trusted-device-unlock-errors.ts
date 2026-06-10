import { ApiError } from "@/lib/api-client/api-error";

export class RevokedTrustedDeviceError extends Error {
  constructor(message = "This trusted device has been revoked.") {
    super(message);
    this.name = "RevokedTrustedDeviceError";
  }
}

export class UnauthenticatedTrustedDeviceError extends Error {
  constructor(message = "Sign in to verify this trusted device before unlocking your vault.") {
    super(message);
    this.name = "UnauthenticatedTrustedDeviceError";
  }
}

export class ForbiddenTrustedDeviceError extends Error {
  constructor(message = "You do not have permission to unlock with this trusted device.") {
    super(message);
    this.name = "ForbiddenTrustedDeviceError";
  }
}

export class UnknownTrustedDeviceError extends Error {
  constructor(
    message = "This device is not registered for your account. Use a recovery code or register the device again."
  ) {
    super(message);
    this.name = "UnknownTrustedDeviceError";
  }
}

export class TrustedDeviceServerError extends Error {
  constructor(message = "Could not verify this trusted device right now. Try again later or use a recovery code.") {
    super(message);
    this.name = "TrustedDeviceServerError";
  }
}

export class TrustedDeviceNetworkUnavailableError extends Error {
  constructor(message = "Offline: using local trusted-device material only.") {
    super(message);
    this.name = "TrustedDeviceNetworkUnavailableError";
  }
}

export class TrustedDeviceUnexpectedError extends Error {
  constructor(message = "Could not verify this trusted device. Use a recovery code or try again.") {
    super(message);
    this.name = "TrustedDeviceUnexpectedError";
  }
}

export type TrustedDeviceUnlockError =
  | RevokedTrustedDeviceError
  | UnauthenticatedTrustedDeviceError
  | ForbiddenTrustedDeviceError
  | UnknownTrustedDeviceError
  | TrustedDeviceServerError
  | TrustedDeviceUnexpectedError;

export function isTrustedDeviceUnlockError(error: unknown): error is TrustedDeviceUnlockError {
  return (
    error instanceof RevokedTrustedDeviceError ||
    error instanceof UnauthenticatedTrustedDeviceError ||
    error instanceof ForbiddenTrustedDeviceError ||
    error instanceof UnknownTrustedDeviceError ||
    error instanceof TrustedDeviceServerError ||
    error instanceof TrustedDeviceUnexpectedError
  );
}

export function isNetworkUnavailableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === "NetworkError") return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("load failed")
    );
  }
  return false;
}

export function classifyTrustedDeviceApiError(error: unknown): never {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        throw new UnauthenticatedTrustedDeviceError();
      case 403:
        throw new ForbiddenTrustedDeviceError();
      case 404:
        throw new UnknownTrustedDeviceError();
      default:
        if (error.status >= 500) {
          throw new TrustedDeviceServerError();
        }
        throw new TrustedDeviceUnexpectedError();
    }
  }

  if (isNetworkUnavailableError(error)) {
    throw new TrustedDeviceNetworkUnavailableError();
  }

  throw new TrustedDeviceUnexpectedError();
}

export function getTrustedDeviceUnlockErrorMessage(error: unknown): string {
  if (error instanceof TrustedDeviceNetworkUnavailableError) {
    return error.message;
  }
  if (isTrustedDeviceUnlockError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Could not unlock your vault on this device.";
}
