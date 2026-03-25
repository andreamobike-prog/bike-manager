"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="content-area">
        <div className="content-card">{children}</div>
      </main>
    </div>
  );
}