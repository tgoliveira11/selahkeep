"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  scrollWindowToTop,
  shouldResetScrollOnRouteChange,
} from "@/lib/navigation/scroll-to-top";

/** Reset window scroll on client-side route changes unless the URL has a hash anchor. */
export function RouteScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldResetScrollOnRouteChange(window.location.hash)) return;
    scrollWindowToTop();
  }, [pathname]);

  return null;
}
