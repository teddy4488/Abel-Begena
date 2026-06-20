"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  GraduationCap,
  MapPin,
  Package2,
  Receipt,
  CalendarDays,
  HelpCircle,
  MessageSquare,
  Megaphone,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLogoutMutation } from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useI18n } from "@/components/providers/I18nProvider";

const allLinks = [
  { href: "/admin/console", labelKey: "admin.sidebar.console", icon: LayoutDashboard },
  { href: "/admin/analytics", labelKey: "admin.sidebar.analytics", icon: BarChart3 },
  { href: "/admin/users", labelKey: "admin.sidebar.users", icon: Users },
  { href: "/admin/classes", labelKey: "admin.sidebar.classes", icon: GraduationCap },
  { href: "/admin/enrollments", labelKey: "admin.sidebar.enrollments", icon: GraduationCap },
  { href: "/admin/payments", labelKey: "admin.sidebar.payments", icon: Receipt },
  { href: "/admin/branches", labelKey: "admin.sidebar.branches", icon: MapPin, superAdminOnly: true },
  { href: "/admin/store", labelKey: "admin.sidebar.store", icon: Package2 },
  { href: "/admin/orders", labelKey: "admin.sidebar.orders", icon: Receipt },
  { href: "/admin/attendance", labelKey: "admin.sidebar.attendance", icon: CalendarDays },
  { href: "/admin/monthly-payments", labelKey: "admin.sidebar.monthlyPayments", icon: Receipt },
  { href: "/admin/faq", labelKey: "admin.sidebar.faq", icon: HelpCircle },
  { href: "/admin/comments", labelKey: "admin.sidebar.comments", icon: MessageSquare },
  { href: "/admin/advertisements", labelKey: "admin.sidebar.advertisements", icon: Megaphone },
];

export function AdminSidebar() {
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

  const sidebarContent = (
    <>
      <div className="mb-10 space-y-4">
        <div className="flex items-center gap-3">
          <Image
            src="/assets/logo.png"
            alt="Abel Begena logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
            priority
          />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-secondary">
              {t("admin.sidebar.brand", "አቤል በገና")}
            </p>
            <p className="text-xl font-serif text-primary">
              {t("admin.sidebar.title", "Admin Console")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-card-bg)] px-3 py-2 dark:bg-[var(--color-card-bg)]">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.email}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              {(user?.firstName?.[0] ?? user?.email?.[0] ?? "").toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/80">
              {user?.role === "SuperAdmin"
                ? t("admin.sidebar.roleSuperAdmin", "Super Admin")
                : user?.role === "Admin" && user?.branchId
                  ? t("admin.sidebar.roleBranchAdmin", "Branch Admin")
                  : t("admin.sidebar.role", "Admin")}
            </p>
            {user?.role === "Admin" && user?.branchId && (
              <p className="text-[10px] text-secondary/80 truncate mt-0.5">
                {typeof user.branchId === "object" && user.branchId?.name
                  ? user.branchId.name
                  : String(user.branchId)}
              </p>
            )}
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {allLinks
          .filter((link) => !(link as { superAdminOnly?: boolean }).superAdminOnly || user?.role === "SuperAdmin")
          .map((link) => {
          const Icon = link.icon;
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "inline-flex items-center gap-3 rounded-xl px-3 py-2 font-semibold transition",
                active
                  ? "bg-secondary/10 text-secondary"
                  : "text-foreground/70 hover:bg-secondary/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(link.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2">
        <div className="h-px bg-[var(--color-divider)] mb-4" />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageToggle />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut
            ? t("nav.loggingOut", "Logging out...")
            : t("nav.logout", "Log out")}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] text-foreground shadow-lg lg:hidden dark:bg-[var(--color-surface-elevated)]"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col overflow-y-auto bg-[var(--color-background-soft)] p-6 text-sm transition-transform duration-300 lg:hidden shadow-xl dark:bg-[var(--color-background-soft)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-secondary/10"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-72 flex-shrink-0 flex-col overflow-y-auto bg-[var(--color-background-soft)] p-6 text-sm lg:flex shadow-[2px_0_8px_var(--color-primary-glow)] dark:bg-[var(--color-background-soft)]">
        {sidebarContent}
      </aside>
    </>
  );
}

