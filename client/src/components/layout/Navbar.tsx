"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Menu, X, ChevronDown, ShoppingCart } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useAppSelector } from "@/store/hooks";
import { usePathname, useRouter } from "next/navigation";
import { useLogoutMutation } from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetCartQuery } from "@/store/api/storeApi";

type RoleKey = "guest" | "User" | "Teacher" | "Admin";
type NavLink = { labelKey: string; href: string };

const guestServices: NavLink[] = [
  { labelKey: "services.online", href: "#online-learning" },
  { labelKey: "services.physical", href: "#physical-learning" },
  { labelKey: "services.atelier", href: "#sacred-market" },
];

const navConfig: Record<
  RoleKey,
  {
    links: NavLink[];
    services?: NavLink[];
  }
> = {
  guest: {
    links: [
      { labelKey: "nav.home", href: "/" },
      { labelKey: "nav.heritage", href: "/heritage" },
      { labelKey: "nav.virtualBegena", href: "/virtual-begena" },
      { labelKey: "nav.classes", href: "/classes" },
      { labelKey: "nav.about", href: "#about" },
      { labelKey: "nav.contact", href: "#contact" },
    ],
    services: guestServices,
  },
  User: {
    links: [
      { labelKey: "nav.dashboard", href: "/dashboard" },
      { labelKey: "nav.classes", href: "/classes" },
      { labelKey: "nav.enrollments", href: "/dashboard/enrollments" },
      { labelKey: "nav.heritage", href: "/heritage" },
      { labelKey: "nav.store", href: "/store" },
      { labelKey: "nav.virtualBegena", href: "/virtual-begena" },
      { labelKey: "nav.orders", href: "/account/orders" },
      { labelKey: "nav.contact", href: "#contact" },
    ],
  },
  Teacher: {
    links: [
      { labelKey: "nav.teacherStudio", href: "/teacher" },
      { labelKey: "nav.heritage", href: "/heritage" },
      { labelKey: "nav.classes", href: "/teacher" },
      { labelKey: "nav.dashboard", href: "/dashboard" },
      { labelKey: "nav.store", href: "/store" },
      { labelKey: "nav.virtualBegena", href: "/virtual-begena" },
    ],
  },
  Admin: {
    links: [
      { labelKey: "nav.adminConsole", href: "/admin/console" },
      { labelKey: "nav.analytics", href: "/admin/analytics" },
      { labelKey: "nav.users", href: "/admin/users" },
      { labelKey: "nav.classes", href: "/admin/classes" },
      { labelKey: "nav.adminEnrollments", href: "/admin/enrollments" },
      { labelKey: "nav.store", href: "/admin/store" },
      { labelKey: "nav.orders", href: "/admin/orders" },
      { labelKey: "nav.virtualBegena", href: "/virtual-begena" },
    ],
  },
};

const userMenuMap: Record<Exclude<RoleKey, "guest">, NavLink[]> = {
  User: [
    { labelKey: "nav.profile", href: "/profile" },
    { labelKey: "nav.dashboard", href: "/dashboard" },
    { labelKey: "nav.classes", href: "/classes" },
    { labelKey: "nav.enrollments", href: "/dashboard/enrollments" },
    { labelKey: "nav.orders", href: "/account/orders" },
    { labelKey: "nav.store", href: "/store" },
  ],
  Teacher: [
    { labelKey: "nav.profile", href: "/profile" },
    { labelKey: "nav.teacherStudio", href: "/teacher" },
    { labelKey: "nav.classes", href: "/teacher" },
    { labelKey: "nav.store", href: "/store" },
  ],
  Admin: [
    { labelKey: "nav.profile", href: "/profile" },
    { labelKey: "nav.adminConsole", href: "/admin/console" },
    { labelKey: "nav.analytics", href: "/admin/analytics" },
    { labelKey: "nav.adminEnrollments", href: "/admin/enrollments" },
    { labelKey: "nav.store", href: "/admin/store" },
  ],
};

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const servicesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const pathname = usePathname();
  const { pushToast } = useToast();
  const [requestLogout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { t, locale } = useI18n();
  const { data: cart } = useGetCartQuery(undefined, { skip: !isLoggedIn });
  const cartItemCount = cart?.itemCount ?? 0;

  const roleKey: RoleKey = isLoggedIn
    ? (user?.role as RoleKey) || "User"
    : "guest";

  const navSettings = useMemo(() => navConfig[roleKey], [roleKey]);
  const servicesLinks = navSettings.services ?? [];

  const isEnglishLocale = locale === "en";
  const inkUnderlineBase =
    "nav-ink-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const navLinkBaseClass = clsx(
    inkUnderlineBase,
    "group inline-flex items-center justify-center whitespace-nowrap px-1 py-1 font-semibold uppercase text-foreground/70 transition-colors",
    isEnglishLocale ? "text-[11px] tracking-[0.28em]" : "text-xs tracking-[0.32em]",
    "hover:text-secondary focus-visible:text-secondary",
  );

  const navLinkMobileClass = clsx(
    inkUnderlineBase,
    "block py-2 text-sm font-semibold uppercase text-foreground/80",
    isEnglishLocale ? "tracking-[0.3em]" : "tracking-[0.2em]",
  );

  const navButtonClass = clsx(
    inkUnderlineBase,
    "inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5",
  );

  const dropdownLinkClass = clsx(
    inkUnderlineBase,
    "block px-5 py-3 text-left text-foreground/80 uppercase font-semibold",
    isEnglishLocale ? "tracking-[0.25em]" : "tracking-[0.18em]",
  );

  const isActiveLink = (href: string) => {
    if (href.startsWith("#")) {
      return false;
    }
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await requestLogout().unwrap();
      pushToast({
        title: t("nav.logoutSuccess", "Signed out"),
        description: t("nav.logoutDesc", "See you again soon."),
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to logout", error);
      pushToast({
        title: t("nav.logoutError", "Unable to log out"),
        description: t("nav.retry", "Please try again."),
        variant: "error",
      });
    } finally {
      setUserMenuOpen(false);
      setMobileOpen(false);
      router.push("/");
    }
  };

  const openServices = () => {
    if (servicesTimeout.current) {
      clearTimeout(servicesTimeout.current);
    }
    setServicesOpen(true);
  };

  const closeServices = () => {
    servicesTimeout.current = setTimeout(() => setServicesOpen(false), 120);
  };

  const openUserMenu = () => {
    if (userMenuTimeout.current) {
      clearTimeout(userMenuTimeout.current);
    }
    setUserMenuOpen(true);
  };

  const closeUserMenu = () => {
    userMenuTimeout.current = setTimeout(() => setUserMenuOpen(false), 120);
  };

  const renderServicesDropdown = (isMobile = false) => {
    if (!servicesLinks.length) return null;
    return (
      <div
        className={
          isMobile
            ? "pl-4 text-sm font-normal"
            : "absolute left-0 mt-3 min-w-[230px] rounded-xl border border-border bg-surface text-foreground shadow-xl"
        }
        onMouseEnter={!isMobile ? openServices : undefined}
        onMouseLeave={!isMobile ? closeServices : undefined}
      >
        {servicesLinks.map((link) => (
          <Link
            key={link.labelKey}
            href={link.href}
            className={clsx(
              "block text-base font-normal transition hover:bg-(--color-secondary-soft)",
              isMobile ? navLinkMobileClass : dropdownLinkClass,
            )}
            onClick={() => {
              setMobileOpen(false);
              setServicesOpen(false);
            }}
          >
            {t(link.labelKey)}
          </Link>
        ))}
      </div>
    );
  };

  const resolvedRole = roleKey === "guest" ? "User" : roleKey;

  const renderUserMenu = () => {
    if (!isLoggedIn || roleKey === "guest") return null;
    const items = userMenuMap[resolvedRole as Exclude<RoleKey, "guest">];
    return (
      <div
        className="absolute right-0 mt-3 w-56 rounded-xl border border-border bg-surface p-2 text-sm shadow-xl"
        onMouseEnter={openUserMenu}
        onMouseLeave={closeUserMenu}
      >
        {items.map((item) => (
          <Link
            key={item.labelKey}
            href={item.href}
            className="nav-ink-link block rounded-lg px-4 py-2 text-left text-foreground transition hover:bg-(--color-secondary-soft)"
            onClick={() => setUserMenuOpen(false)}
          >
            {t(item.labelKey)}
          </Link>
        ))}
        <button
          type="button"
          className="nav-ink-link mt-1 w-full rounded-lg px-4 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut
            ? t("nav.loggingOut", "Logging out...")
            : t("nav.logout", "Log out")}
        </button>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-(--color-background-soft) text-foreground backdrop-blur-xl">
      <div className="mx-auto flex max-w-8xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-linear-to-r from-secondary/30 via-primary/20 to-secondary/30 px-4 py-2 shadow-[0_4px_20px_var(--color-primary-glow)] backdrop-blur-sm border border-secondary/30"
        >
          <Image
            src="/assets/logo.png"
            alt="Abel Begena logo"
            width={56}
            height={56}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="hidden text-sm font-bold tracking-wide text-primary sm:inline font-serif">
            አቤል በገና
          </span>
        </Link>

        <nav className="hidden items-center gap-4 lg:flex">
          {navSettings.links.map((link) => (
            <Link
              key={link.labelKey}
              href={link.href}
              className={navLinkBaseClass}
              data-active={isActiveLink(link.href) ? "true" : undefined}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          {servicesLinks.length > 0 && (
            <div
              className="relative"
              onMouseEnter={openServices}
              onMouseLeave={closeServices}
            >
              <button
                type="button"
              className={clsx(navLinkBaseClass, "gap-2 pl-2 pr-1")}
                onClick={() => setServicesOpen((prev) => !prev)}
              >
                {t("nav.services")}
                <ChevronDown className="h-4 w-4" />
              </button>
              {servicesOpen && renderServicesDropdown()}
            </div>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeSwitcher />
          <LanguageToggle />
          {isLoggedIn && (
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-secondary hover:bg-(--color-secondary-soft)"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="h-5 w-5 text-foreground" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary-foreground shadow">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Link>
          )}
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className={clsx(
                  navButtonClass,
                  "border-border text-foreground hover:bg-(--color-secondary-soft)",
                )}
                data-active={isActiveLink("/login") ? "true" : undefined}
              >
                {t("nav.signIn", "Sign In")}
              </Link>
              <Link
                href="/register"
                className={clsx(
                  navButtonClass,
                  "border-transparent bg-primary text-primary-foreground shadow-sm hover:brightness-95",
                )}
                data-active={isActiveLink("/register") ? "true" : undefined}
              >
                {t("nav.signUp", "Sign Up")}
              </Link>
            </>
          ) : (
            <div
              className="relative"
              onMouseEnter={openUserMenu}
              onMouseLeave={closeUserMenu}
            >
              <button
                type="button"
                className={clsx(
                  navButtonClass,
                  "gap-3 border-secondary text-secondary hover:bg-(--color-secondary-soft)",
                )}
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user?.email ?? "avatar"}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-[11px] uppercase text-secondary">
                    {(user?.firstName?.[0] ?? user?.email?.[0] ?? "").toUpperCase()}
                  </span>
                )}
                <span>
                  {user?.firstName ||
                    user?.email ||
                    t("nav.profile", "My Account")}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {userMenuOpen && renderUserMenu()}
            </div>
          )}
        </div>

        <button
          className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-foreground lg:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="space-y-2 border-t border-border bg-surface px-5 py-4 text-base font-medium uppercase text-foreground lg:hidden">
          {navSettings.links.map((link) => (
            <Link
              key={link.labelKey}
              href={link.href}
              className={clsx(navLinkMobileClass, "w-full")}
              data-active={isActiveLink(link.href) ? "true" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          {servicesLinks.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-2">
              <span className={clsx(navLinkMobileClass, "w-full py-0 text-left")}>
                {t("nav.services")}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 transition group-open:rotate-180" />
              </summary>
              {renderServicesDropdown(true)}
            </details>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <LanguageToggle />
              {isLoggedIn && (
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-secondary"
                  aria-label="Shopping Cart"
                >
                  <ShoppingCart className="h-5 w-5 text-foreground" />
                  {cartItemCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary-foreground shadow">
                      {cartItemCount > 9 ? "9+" : cartItemCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className={clsx(
                    navButtonClass,
                    "w-full border-secondary text-center text-secondary",
                  )}
                  data-active={isActiveLink("/login") ? "true" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.signIn", "Sign In")}
                </Link>
                <Link
                  href="/register"
                  className={clsx(
                    navButtonClass,
                    "w-full border-transparent bg-primary text-center text-primary-foreground",
                  )}
                  data-active={isActiveLink("/register") ? "true" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.signUp", "Sign Up")}
                </Link>
              </>
            ) : (
              <details className="group w-full">
                <summary
                  className={clsx(
                    navButtonClass,
                    "flex cursor-pointer items-center justify-between border-secondary text-secondary",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={user?.email ?? "avatar"}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-[11px] uppercase text-secondary">
                        {(user?.firstName?.[0] ?? user?.email?.[0] ?? "").toUpperCase()}
                      </span>
                    )}
                    <span>
                      {user?.firstName ||
                        user?.email ||
                        t("nav.profile", "My Account")}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-1 rounded-2xl border border-border bg-background/80 p-3 text-sm normal-case">
                  {userMenuMap[
                    resolvedRole as Exclude<RoleKey, "guest">
                  ].map((item) => (
                    <Link
                      key={item.labelKey}
                      href={item.href}
                      className="nav-ink-link block rounded-lg px-3 py-2 text-foreground transition hover:bg-(--color-secondary-soft)"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="nav-ink-link w-full rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut
                      ? t("nav.loggingOut", "Logging out...")
                      : t("nav.logout", "Log out")}
                  </button>
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

