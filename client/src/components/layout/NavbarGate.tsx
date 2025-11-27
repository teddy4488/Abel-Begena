"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export function NavbarGate() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isTeacherRoute = pathname?.startsWith("/teacher");

  if (isAdminRoute || isTeacherRoute) {
    return null;
  }

  return <Navbar />;
}

