"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  GraduationCap,
  Package2,
  Receipt,
  Type,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";

const links = [
  { href: "/admin/console", label: "Console", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/classes", label: "Classes", icon: GraduationCap },
  { href: "/admin/store", label: "Store", icon: Package2 },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/cms", label: "Content", icon: Type },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);

  return (
    <aside className="hidden w-72 flex-col border-r border-border bg-[color:var(--color-background-soft)] p-6 text-sm lg:flex">
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
            <p className="text-xl font-serif text-primary">Admin Console</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
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
          <div>
            <p className="text-sm font-semibold text-primary">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/80">
              Super Admin
            </p>
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname?.startsWith(link.href);
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
    </aside>
  );
}

