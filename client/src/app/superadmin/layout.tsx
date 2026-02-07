"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import {
  LayoutDashboard,
  MapPin,
  Users,
  BarChart3,
  Package2,
  Receipt,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLogoutMutation } from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useRequireSuperAdmin } from "@/hooks/useRequireSuperAdmin";
import { useI18n } from "@/components/providers/I18nProvider";

const superAdminLinks = [
  { href: "/superadmin/console", labelKey: "nav.superAdminConsole", icon: LayoutDashboard },
  { href: "/superadmin/branches", labelKey: "nav.branches", icon: MapPin },
  { href: "/superadmin/admins", labelKey: "nav.admins", icon: Users },
  { href: "/admin/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/admin/store", labelKey: "nav.store", icon: Package2 },
  { href: "/admin/orders", labelKey: "nav.orders", icon: Receipt },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const isSuperAdmin = useRequireSuperAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [requestLogout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await requestLogout().unwrap();
      pushToast({
        title: t("nav.logoutSuccess", "Signed out"),
        description: t("nav.logoutDesc", "See you again soon."),
        variant: "success",
      });
      router.push("/");
    } catch (error) {
      console.error("Failed to logout", error);
      pushToast({
        title: t("nav.logoutError", "Unable to log out"),
        description: t("nav.retry", "Please try again."),
        variant: "error",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/70">Checking permissions...</p>
      </div>
    );
  }

  const sidebarContent = (
    <>
      <div className="mb-10 space-y-4">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="Abel Begena" width={36} height={36} className="rounded-lg" />
          <div>
            <p className="font-semibold text-foreground">Super Admin</p>
            <p className="text-xs text-foreground/60">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="space-y-1">
        {superAdminLinks.map(({ href, labelKey, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-secondary/20 text-secondary" : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-foreground/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {isLoggingOut ? "…" : t("nav.logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <span className="absolute left-8 top-20 text-4xl text-secondary opacity-20">✝</span>
        <span className="absolute right-12 top-40 text-5xl text-secondary opacity-20">✝</span>
      </div>
      <aside className="relative z-10 hidden w-64 shrink-0 flex flex-col border-r border-foreground/10 bg-background/95 p-4 md:flex">
        {sidebarContent}
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-foreground/10 px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded p-2 text-foreground/70 hover:bg-foreground/5"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex flex-col border-r border-foreground/10 bg-background p-4 md:hidden">
            {sidebarContent}
          </div>
        )}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
