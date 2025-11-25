"use client";

import FadeIn from "@/components/animations/FadeIn";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TeacherPage() {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "Teacher") {
      router.replace(isLoggedIn ? "/dashboard" : "/login");
    }
  }, [isLoggedIn, router, user?.role]);

  if (!isLoggedIn || user?.role !== "Teacher") {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            Teacher Studio
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Steward your classes, materials, and live rooms.
          </h1>
          <p className="text-sm text-foreground/70">
            Centralize uploads, schedule rehearsals, and launch live rooms for
            your enrolled disciples.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Upload Materials",
              description:
                "Share PDFs, slides, and hymn recordings directly into each class space.",
              href: "/dashboard",
              cta: "Open Uploads",
            },
            {
              title: "Manage Live Rooms",
              description:
                "Toggle live status and give students the link for today’s session.",
              href: "/dashboard",
              cta: "Go to Live Control",
            },
            {
              title: "Track Learners",
              description:
                "Review which students accessed materials and follow up pastorally.",
              href: "/dashboard",
              cta: "Review learners",
            },
          ].map((card) => (
            <FadeIn
              key={card.title}
              className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            >
              <h2 className="text-2xl font-serif text-primary">{card.title}</h2>
              <p className="mt-2 text-sm text-foreground/70">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center text-sm font-semibold text-secondary"
              >
                {card.cta} →
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

