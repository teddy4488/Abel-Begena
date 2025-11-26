"use client";

import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = useRequireAdmin();

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/70">Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-[color:var(--color-background-soft)] px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary">Super Admin</p>
              <h1 className="text-2xl font-serif text-primary">Operational Command</h1>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs lg:hidden">
            {[
              { href: "/admin/console", label: "Console" },
              { href: "/admin/analytics", label: "Analytics" },
              { href: "/admin/users", label: "Users" },
              { href: "/admin/classes", label: "Classes" },
              { href: "/admin/store", label: "Store" },
              { href: "/admin/orders", label: "Orders" },
              { href: "/admin/cms", label: "Content" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-border px-3 py-1 text-foreground/70"
              >
                {link.label}
              </a>
            ))}
          </div>
        </header>
        <main className="space-y-6 bg-background px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

