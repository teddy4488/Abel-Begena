"use client";

import FadeIn from "@/components/animations/FadeIn";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "Admin") {
      router.replace(isLoggedIn ? "/dashboard" : "/login");
    }
  }, [isLoggedIn, router, user?.role]);

  if (!isLoggedIn || user?.role !== "Admin") {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            Admin Console
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Oversee users, classes, and store operations.
          </h1>
          <p className="text-sm text-foreground/70">
            This lightweight console surfaces quick links into the RBAC-secured
            backend endpoints so you can expand functionality over time.
          </p>
        </header>

        <div id="users" className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Manage Users",
              copy: "Activate accounts, assign roles, and monitor enrollment health.",
              href: "/dashboard",
            },
            {
              title: "Classes",
              copy: "Create new cohorts, set instructors, and mark sessions live.",
              href: "/dashboard",
            },
            {
              title: "Store Catalog",
              copy: "Update product stock and upload new instrument imagery.",
              href: "/store",
            },
          ].map((card) => (
            <FadeIn
              key={card.title}
              className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            >
              <h2 className="text-2xl font-serif text-primary">{card.title}</h2>
              <p className="mt-2 text-sm text-foreground/70">{card.copy}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center text-sm font-semibold text-secondary"
              >
                Open →
              </Link>
            </FadeIn>
          ))}
        </div>

        <div
          id="classes"
          className="rounded-3xl border border-border bg-surface p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
        >
          <h2 className="text-2xl font-serif text-primary">
            Class Management Blueprint
          </h2>
          <p className="mt-2 text-sm text-foreground/70">
            Use the protected /classes endpoints to automate schedule changes:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-foreground/80">
            <li>Create class docs in Mongo and assign instructor IDs.</li>
            <li>Toggle <code>isLive</code> to instantly open live rooms.</li>
            <li>Upload lesson artifacts via the Cloudinary-backed endpoint.</li>
          </ul>
        </div>

        <div
          id="analytics"
          className="rounded-3xl border border-border bg-surface p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
        >
          <h2 className="text-2xl font-serif text-primary">
            Analytics Checklist
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-foreground/80">
            <li>Hook dashboard cards into `/order` and `/product` metrics.</li>
            <li>Plot revenue per instrument using Recharts.</li>
            <li>Monitor live attendance vs. enrollments.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

