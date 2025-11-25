"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useLogoutMutation } from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";

type RoleKey = "guest" | "User" | "Teacher" | "Admin";
type NavLink = { label: string; href: string };

const guestServices: NavLink[] = [
  { label: "Online Teaching", href: "#online-learning" },
  { label: "Physical Classes", href: "#physical-learning" },
  { label: "Sacred Instruments", href: "#sacred-market" },
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
      { label: "Home", href: "/" },
      { label: "Heritage", href: "/heritage" },
      { label: "About Us", href: "#about" },
      { label: "Contact Us", href: "#contact" },
    ],
    services: guestServices,
  },
  User: {
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "My Classes", href: "/dashboard#classes" },
      { label: "Heritage", href: "/heritage" },
      { label: "Store", href: "/store" },
      { label: "Orders", href: "/account/orders" },
      { label: "Support", href: "#contact" },
    ],
  },
  Teacher: {
    links: [
      { label: "Teacher Studio", href: "/teacher" },
      { label: "Heritage", href: "/heritage" },
      { label: "Upload Materials", href: "/teacher" },
      { label: "Live Classes", href: "/dashboard" },
      { label: "Store", href: "/store" },
    ],
  },
  Admin: {
    links: [
      { label: "Admin Console", href: "/admin" },
      { label: "Heritage", href: "/heritage" },
      { label: "Users", href: "/admin#users" },
      { label: "Classes", href: "/admin#classes" },
      { label: "Store", href: "/store" },
      { label: "Analytics", href: "/admin#analytics" },
    ],
  },
};

const userMenuMap: Record<Exclude<RoleKey, "guest">, NavLink[]> = {
  User: [
    { label: "Profile", href: "/profile" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Orders", href: "/account/orders" },
    { label: "Store", href: "/store" },
  ],
  Teacher: [
    { label: "Profile", href: "/profile" },
    { label: "Teacher Studio", href: "/teacher" },
    { label: "Upload Materials", href: "/teacher" },
    { label: "Store", href: "/store" },
  ],
  Admin: [
    { label: "Profile", href: "/profile" },
    { label: "Admin Console", href: "/admin" },
    { label: "Manage Users", href: "/admin#users" },
    { label: "Store", href: "/store" },
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
  const { pushToast } = useToast();
  const [requestLogout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const roleKey: RoleKey = isLoggedIn
    ? (user?.role as RoleKey) || "User"
    : "guest";

  const navSettings = useMemo(() => navConfig[roleKey], [roleKey]);
  const servicesLinks = navSettings.services ?? [];

  const handleLogout = async () => {
    try {
      await requestLogout().unwrap();
      pushToast({
        title: "Signed out",
        description: "See you again soon.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to logout", error);
      pushToast({
        title: "Unable to log out",
        description: "Please try again.",
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
            key={link.label}
            href={link.href}
            className={`block px-5 py-3 text-base font-normal transition hover:bg-(--color-secondary-soft) ${
              isMobile ? "py-1 px-0" : ""
            }`}
            onClick={() => {
              setMobileOpen(false);
              setServicesOpen(false);
            }}
          >
            {link.label}
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
            key={item.label}
            href={item.href}
            className="block rounded-lg px-4 py-2 text-left text-foreground transition hover:bg-(--color-secondary-soft)"
            onClick={() => setUserMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          className="mt-1 w-full rounded-lg px-4 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-(--color-background-soft) text-foreground backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl bg-secondary/10 px-3 py-2"
        >
          <Image
            src="/assets/logo.png"
            alt="Abel Begena logo"
            width={56}
            height={56}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="hidden text-lg font-semibold tracking-widest uppercase text-primary sm:inline">
            Abel Begena
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold uppercase lg:flex">
          {navSettings.links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition hover:text-secondary"
            >
              {link.label}
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
                className="inline-flex items-center gap-1 transition hover:text-secondary"
                onClick={() => setServicesOpen((prev) => !prev)}
              >
                Services
                <ChevronDown className="h-4 w-4" />
              </button>
              {servicesOpen && renderServicesDropdown()}
            </div>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeSwitcher />
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
              >
                Sign Up
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
                className="inline-flex items-center gap-2 rounded-full border border-secondary px-5 py-2 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                {user?.firstName || user?.email || "My Account"}
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
              key={link.label}
              href={link.href}
              className="block py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {servicesLinks.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-2">
                Services
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              {renderServicesDropdown(true)}
            </details>
          )}
          <div className="flex items-center justify-between gap-4 pt-2">
            <ThemeSwitcher />
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="grow rounded-full border border-secondary px-4 py-2 text-center text-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="grow rounded-full bg-primary px-4 py-2 text-center text-primary-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <details className="group w-full">
                <summary className="flex cursor-pointer items-center justify-between rounded-full border border-secondary px-4 py-2 text-secondary">
                  {user?.firstName || user?.email || "My Account"}
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-1 rounded-2xl border border-border bg-background/80 p-3 text-sm normal-case">
                  {userMenuMap[
                    resolvedRole as Exclude<RoleKey, "guest">
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-foreground transition hover:bg-(--color-secondary-soft)"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                  >
                      {isLoggingOut ? "Logging out..." : "Log out"}
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

