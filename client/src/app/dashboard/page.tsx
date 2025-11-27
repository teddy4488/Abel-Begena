"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

type ClassSummary = {
  _id: string;
  title: string;
  isLive?: boolean;
};

type ClassAccess = {
  class: { _id: string; title: string };
  materials: { title: string; url: string }[];
  liveLink: string | null;
  isLive: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const [classes, setClasses] = useState<ClassAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materialsOpen, setMaterialsOpen] = useState<string | null>(null);
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    [],
  );
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.role === "Admin") {
      router.replace("/admin/console");
    }
  }, [isLoggedIn, router, user?.role]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const listResponse = await fetch(`${apiBase}/classes`, {
          credentials: "include",
        });
        if (!listResponse.ok) {
          throw new Error("Unable to load classes");
        }
        const classList: ClassSummary[] = await listResponse.json();
        const accessPayloads = await Promise.all(
          classList.map(async (classItem) => {
            const accessResponse = await fetch(
              `${apiBase}/classes/${classItem._id}/access`,
              {
                credentials: "include",
              },
            );
            if (!accessResponse.ok) {
              throw new Error("Unable to load class access data");
            }
            return accessResponse.json() as Promise<ClassAccess>;
          }),
        );
        setClasses(accessPayloads);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        setError(message);
        pushToast({
          title: "Unable to load classes",
          description: message,
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };
    void fetchClasses();
  }, [apiBase, isLoggedIn, pushToast]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3 rounded-[32px] border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-8 shadow-[0_40px_100px_rgba(34,6,9,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                My Conservatory
              </p>
              <h1 className="text-3xl font-serif text-primary md:text-4xl">
                Student Dashboard
              </h1>
              <p className="text-foreground/75">
                Access your live rooms, download materials, and keep shopping for
                handcrafted instruments.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-2">
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
                <p className="text-xs text-foreground/70">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {isLoading && (
          <p className="text-sm text-foreground/70">Loading your classes...</p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {error}. Please refresh the page.
          </p>
        )}

        <div className="space-y-6 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                My learning
              </p>
              <h2 className="text-2xl font-serif text-primary">
                Active cohorts
              </h2>
            </div>
            <Link
              href="/store"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            >
              Visit Store
            </Link>
          </div>

          {!isLoading && !classes.length && !error && (
            <div className="rounded-3xl border border-border bg-background/70 p-6 text-center">
              <p className="text-lg font-semibold text-primary">
                You are not enrolled in any classes yet.
              </p>
              <p className="mt-2 text-sm text-foreground/70">
                Browse our offerings to begin your musical journey.
              </p>
            </div>
          )}

          <div className="grid gap-6">
            {classes.map((classAccess) => (
              <div
                key={classAccess.class._id}
                className="rounded-3xl border border-border bg-background/70 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                      Active Class
                    </p>
                    <h3 className="text-2xl font-serif text-primary">
                      {classAccess.class.title}
                    </h3>
                  </div>
                  {classAccess.isLive && classAccess.liveLink ? (
                    <Link
                      href={`/live/class/${classAccess.class._id}`}
                      className="inline-flex items-center justify-center rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-secondary/40 transition hover:-translate-y-0.5"
                    >
                      Join Live Class
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-foreground/70">
                      Live session offline
                    </span>
                  )}
                </div>
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    Materials
                  </p>
                  {classAccess.materials.length ? (
                    <ul className="space-y-2">
                      {classAccess.materials.map((material) => (
                        <li
                          key={`${classAccess.class._id}-${material.url}`}
                          className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm"
                        >
                          <span>{material.title}</span>
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-secondary underline-offset-4 hover:underline"
                          >
                            View
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-foreground/70">
                      Materials will appear here once your teacher uploads them.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            whileHover={{ y: -4 }}
            className="space-y-3 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              Storefront access
            </p>
            <h3 className="text-2xl font-serif text-primary">
              Commission a new instrument
            </h3>
            <p className="text-sm text-foreground/70">
              Browse Begena, Masinko, Washint, and Kebero builds crafted for the
              liturgy.
            </p>
            <Link
              href="/store"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Browse Store
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="space-y-3 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              Account history
            </p>
            <h3 className="text-2xl font-serif text-primary">
              Orders & profile
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <Link
                href="/account/orders"
                className="rounded-2xl border border-border px-4 py-2 text-left transition hover:border-secondary/50"
              >
                View order history
              </Link>
              <Link
                href="/profile"
                className="rounded-2xl border border-border px-4 py-2 text-left transition hover:border-secondary/50"
              >
                Update profile details
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
