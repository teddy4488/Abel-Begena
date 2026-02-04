"use client";

import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = useRequireAdmin();

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/70">Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground">
      {/* Subtle Orthodox cross decorations */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <span className="absolute left-8 top-20 text-5xl text-secondary/5">✝</span>
        <span className="absolute right-12 top-40 text-6xl text-secondary/5">✝</span>
        <span className="absolute bottom-40 left-12 text-4xl text-secondary/5">✝</span>
        <span className="absolute bottom-20 right-8 text-5xl text-secondary/5">✝</span>
      </div>
      <AdminSidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

