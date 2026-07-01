/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  consumePostLoginHomePending,
  markPostLoginHomePending,
} from "@/lib/auth/post-login-home";

describe("post-login home marker", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("marks and consumes a pending post-login /home visit once", () => {
    markPostLoginHomePending();
    expect(consumePostLoginHomePending()).toBe(true);
    expect(consumePostLoginHomePending()).toBe(false);
  });
});
