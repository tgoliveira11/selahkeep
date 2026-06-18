import { describe, it, expect } from "vitest";
import {
  scrollWindowToTop,
  shouldResetScrollOnRouteChange,
} from "@/lib/navigation/scroll-to-top";

describe("scroll-to-top", () => {
  it("resets scroll unless a hash anchor is present", () => {
    expect(shouldResetScrollOnRouteChange("")).toBe(true);
    expect(shouldResetScrollOnRouteChange("#security")).toBe(false);
  });

  it("scrollWindowToTop is safe without window", () => {
    expect(() => scrollWindowToTop()).not.toThrow();
  });
});
