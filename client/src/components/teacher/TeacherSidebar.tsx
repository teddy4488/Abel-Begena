"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Users,
  Calendar,
  Video,
  LogOut,
  User,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useLogoutMutation } from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useI18n } from "@/components/providers/I18nProvider";

const links = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/posts", label: "Posts", icon: FileText },
  { href: "/teacher/materials", label: "Materials", icon: Upload },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/schedule", label: "Schedule", icon: Calendar },
  { href: "/teacher/live", label: "Live Classes", icon: Video },
];

export function TeacherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [requestLogout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();

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

  return (
    <aside className="hidden h-screen w-72 flex-col overflow-y-auto border-r border-border bg-[color:var(--color-background-soft)] p-6 text-sm lg:flex">
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
              Abel Begena
            </p>
            <p className="text-xl font-serif text-primary">Teacher Studio</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2 transition hover:bg-background"
        >
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
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/80">
              Instructor
            </p>
          </div>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== "/teacher" && pathname?.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "inline-flex items-center gap-3 rounded-xl px-3 py-2 font-semibold transition",
                active
                  ? "bg-secondary/10 text-secondary"
                  : "text-foreground/70 hover:bg-secondary/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageToggle />
        </div>
        <Link
          href="/profile"
          className={clsx(
            "inline-flex items-center gap-3 rounded-xl px-3 py-2 font-semibold transition",
            pathname === "/profile"
              ? "bg-secondary/10 text-secondary"
              : "text-foreground/70 hover:bg-secondary/5",
          )}
        >
          <User className="h-4 w-4" />
          {t("nav.profile", "Profile")}
        </Link>
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
    </aside>
  );
}

