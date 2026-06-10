import { AsyncLocalStorage } from "async_hooks";

const loginRequestStore = new AsyncLocalStorage<{ ip: string }>();

export function runWithLoginRequestContext<T>(ip: string, fn: () => T): T {
  return loginRequestStore.run({ ip }, fn);
}

export function getLoginRequestIp(): string | undefined {
  return loginRequestStore.getStore()?.ip;
}
