"use client";

import { OutpostUIProvider } from "@tgoliveira/outpost/react";

const OUTPOST_ADMIN_PANEL_PATH = "/admin/outpost";

export function OutpostAdminProvider({ children }: { children: React.ReactNode }) {
  return (
    <OutpostUIProvider paths={{ adminPanel: OUTPOST_ADMIN_PANEL_PATH }}>
      {children}
    </OutpostUIProvider>
  );
}
