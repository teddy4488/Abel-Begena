"use client";

import { ReactNode } from "react";
import { redirect, usePathname } from "next/navigation";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/superadmin" || pathname === "/superadmin/console") {
    redirect("/admin/console");
  }
  if (pathname === "/superadmin/branches") {
    redirect("/admin/branches");
  }
  if (pathname === "/superadmin/admins") {
    redirect("/admin/users");
  }

  // Any other /superadmin/* path
  if (pathname?.startsWith("/superadmin")) {
    redirect("/admin/console");
  }

  return <>{children}</>;
}
