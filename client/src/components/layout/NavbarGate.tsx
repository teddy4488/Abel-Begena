"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export function NavbarGate() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return null;
  }

  return <Navbar />;
}

