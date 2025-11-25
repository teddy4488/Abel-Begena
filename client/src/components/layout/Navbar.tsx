"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useRouter } from "next/navigation";

const servicesLinks = [
  { label: "Online Teaching", href: "#online-learning" },
  { label: "Physical Lessons", href: "#physical-learning" },
  { label: "Sacred Instruments", href: "#sacred-market" },
];

const baseLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const userMenuLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Orders", href: "/account/orders" },
  { label: "Store", href: "/store" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    setUserMenuOpen(false);
    router.push("/");
  };

  const renderServicesDropdown = (isMobile = false) => (
    <div className={isMobile ? "pl-4 text-sm font-normal" : "absolute left-0 mt-3 min-w-[230px] rounded-xl border border-border bg-surface text-foreground shadow-xl"}>
      {servicesLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={`block px-5 py-3 text-base font-normal transition hover:bg-[color:var(--color-secondary-soft)] ${isMobile ? "py-1 px-0" : ""}`}
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

  const renderUserMenu = () => (
    <div className="absolute right-0 mt-3 w-56 rounded-xl border border-border bg-surface p-2 text-sm shadow-xl">
      {userMenuLinks.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="block rounded-lg px-4 py-2 text-left text-foreground transition hover:bg-[color:var(--color-secondary-soft)]"
          onClick={() => setUserMenuOpen(false)}
        >
          {item.label}
        </Link>
      ))}
      <button
        type="button"
        className="mt-1 w-full rounded-lg px-4 py-2 text-left text-red-600 transition hover:bg-red-50"
        onClick={handleLogout}
      >
        Log out
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[color:var(--color-background-soft)] text-foreground backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 rounded-xl bg-secondary/10 px-3 py-2">
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
          {baseLinks.map((link) => (
            <Link key={link.label} href={link.href} className="transition hover:text-secondary">
              {link.label}
            </Link>
          ))}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
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
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeSwitcher />
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[color:var(--color-secondary-soft)]"
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
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-secondary px-5 py-2 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-[color:var(--color-secondary-soft)]"
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
          {baseLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2">
              Services
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            {renderServicesDropdown(true)}
          </details>
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
                  {userMenuLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-foreground transition hover:bg-[color:var(--color-secondary-soft)]"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                  >
                    Log out
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

