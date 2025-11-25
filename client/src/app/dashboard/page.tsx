"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

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
  const { isLoggedIn, token } = useAppSelector((state) => state.auth);
  const [classes, setClasses] = useState<ClassAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    [],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (!token) {
      return;
    }

    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const listResponse = await fetch(`${apiBase}/classes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
                headers: {
                  Authorization: `Bearer ${token}`,
                },
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
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchClasses();
  }, [apiBase, isLoggedIn, router, token]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            My Conservatory
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Student Dashboard
          </h1>
          <p className="text-foreground/70">
            Access your live sessions and sacred study materials.
          </p>
        </header>

        {isLoading && (
          <p className="text-sm text-foreground/70">Loading your classes...</p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {error}. Please refresh the page.
          </p>
        )}

        {!isLoading && !classes.length && !error && (
          <div className="rounded-3xl border border-border bg-surface/80 p-8 text-center">
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
              className="rounded-3xl border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    Active Class
                  </p>
                  <h2 className="text-2xl font-serif text-primary">
                    {classAccess.class.title}
                  </h2>
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
    </section>
  );
}

