"use client";

import { OutpostUIProvider } from "@tgoliveira/outpost/react";

export function OutpostAdminProvider({
  adminPanelPath,
  children,
}: {
  adminPanelPath: string;
  children: React.ReactNode;
}) {
  return (
    <OutpostUIProvider paths={{ adminPanel: adminPanelPath }}>{children}</OutpostUIProvider>
  );
}
