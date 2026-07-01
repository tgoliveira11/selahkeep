import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { RouteScrollToTop } from "@/components/layout/route-scroll-to-top";

const pathnameRef = { current: "/notes" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
}));

describe("RouteScrollToTop", () => {
  beforeEach(() => {
    pathnameRef.current = "/notes";
    window.scrollTo = vi.fn();
    window.history.replaceState({}, "", "/notes");
  });

  it("scrolls to top when pathname changes without a hash", () => {
    const { rerender } = render(<RouteScrollToTop />);
    pathnameRef.current = "/settings/account";
    rerender(<RouteScrollToTop />);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("does not scroll when the URL has a hash anchor", () => {
    window.history.replaceState({}, "", "/settings/account#security");
    const { rerender } = render(<RouteScrollToTop />);
    pathnameRef.current = "/settings/account";
    rerender(<RouteScrollToTop />);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
