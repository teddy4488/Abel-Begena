"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { getRoleLandingRoute } from "@/lib/utils";

type ClassSummary = {
  _id: string;
  title: string;
  isLive?: boolean;
  myEnrollment?: {
    status: "active" | "pending" | "withdrawn";
    paymentReference?: string | null;
    note?: string | null;
  } | null;
};

type ClassAccess = {
  class: { _id: string; title: string };
  materials: { title: string; url: string }[];
  liveLink: string | null;
  isLive: boolean;
};

type DashboardClass = ClassAccess & {
  enrollment?: ClassSummary["myEnrollment"];
};

export default function DashboardPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { isLoggedIn, user, token } = useAppSelector((state) => state.auth);
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    if (user?.role === "Admin" || user?.role === "Teacher") {
      router.replace(getRoleLandingRoute(user?.role));
    }
  }, [isLoggedIn, router, user?.role]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const listResponse = await fetch(`${apiBase}/classes`, {
          credentials: "include",
          headers,
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
                headers,
              },
            );
            if (!accessResponse.ok) {
              throw new Error("Unable to load class access data");
            }
            const payload = (await accessResponse.json()) as ClassAccess;
            return {
              ...payload,
              enrollment: classItem.myEnrollment ?? null,
            };
          }),
        );
        setClasses(accessPayloads);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("dashboard.errorMessage", "Failed to load data");
        setError(message);
        pushToast({
          title: t("dashboard.errorTitle", "Unable to load classes"),
          description: message,
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };
    void fetchClasses();
  }, [apiBase, isLoggedIn, pushToast, t, token]);

  if (!isLoggedIn) {
    return null;
  }

  const hasPendingEnrollment = classes.some(
    (klass) => klass.enrollment?.status === "pending",
  );

  const renderStatusChip = (status?: string | null) => {
    if (!status) return null;
    const palette: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-500",
      pending: "bg-amber-500/15 text-amber-600",
      withdrawn: "bg-rose-500/15 text-rose-500",
    };
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${palette[status] ?? "bg-secondary/20 text-secondary"}`}
      >
        {t(`classes.status.${status}`, status)}
      </span>
    );
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3 rounded-[32px] border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-8 shadow-[0_40px_100px_rgba(34,6,9,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("dashboard.kicker", "My Conservatory")}
              </p>
              <h1 className="text-3xl font-serif text-primary md:text-4xl">
                {t("dashboard.title", "Student Dashboard")}
              </h1>
              <p className="text-foreground/75">
                {t(
                  "dashboard.description",
                  "Access your live rooms, download materials, and keep shopping for handcrafted instruments.",
                )}
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

        {hasPendingEnrollment && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
            {t(
              "dashboard.pendingNotice",
              "One or more enrollments are awaiting review. Access will unlock as soon as the admin verifies your payment.",
            )}
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-foreground/70">
            {t("dashboard.loading", "Loading your classes...")}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {error}. {t("dashboard.errorRefresh", "Please refresh the page.")}
          </p>
        )}

        <div className="space-y-6 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("dashboard.section.learning", "My learning")}
              </p>
              <h2 className="text-2xl font-serif text-primary">
                {t("dashboard.section.active", "Active cohorts")}
              </h2>
            </div>
            <Link
              href="/store"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            >
              {t("dashboard.cta.store", "Visit Store")}
            </Link>
          </div>

          {!isLoading && !classes.length && !error && (
            <div className="rounded-3xl border border-border bg-background/70 p-6 text-center">
              <p className="text-lg font-semibold text-primary">
                {t(
                  "dashboard.empty.title",
                  "You are not enrolled in any classes yet.",
                )}
              </p>
              <p className="mt-2 text-sm text-foreground/70">
                {t(
                  "dashboard.empty.description",
                  "Browse our offerings to begin your musical journey.",
                )}
              </p>
              <Link
                href="/classes"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-secondary px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-(--color-secondary-soft)"
              >
                {t("dashboard.empty.cta", "Browse classes")}
              </Link>
            </div>
          )}

          <div className="grid gap-6">
            {classes.map((classAccess) => (
              <div
                key={classAccess.class._id}
                className="rounded-3xl border border-border bg-background/70 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {renderStatusChip(classAccess.enrollment?.status ?? null)}
                      {!classAccess.isLive && (
                        <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                          {t("dashboard.card.offline", "Live session offline")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-serif text-primary">
                      {classAccess.class.title}
                    </h3>
                    {classAccess.enrollment?.paymentReference && (
                      <p className="text-xs text-foreground/60">
                        {t(
                          "dashboard.enrollment.reference",
                          "Payment ref:",
                        )}{" "}
                        {classAccess.enrollment.paymentReference}
                      </p>
                    )}
                  </div>
                  {classAccess.isLive && classAccess.liveLink ? (
                    <Link
                      href={`/live/class/${classAccess.class._id}`}
                      className="inline-flex items-center justify-center rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-secondary/40 transition hover:-translate-y-0.5"
                    >
                      {t("dashboard.card.join", "Join Live Class")}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    {t("dashboard.materials.title", "Materials")}
                  </p>
                  {classAccess.materials.length ? (
                    <ul className="space-y-2">
                      {classAccess.materials.map((material) => {
                        const getFileIcon = (url: string) => {
                          const ext = url.split('.').pop()?.toLowerCase();
                          if (['pdf'].includes(ext || '')) return '📄';
                          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
                          if (['mp4', 'mov', 'avi'].includes(ext || '')) return '🎥';
                          return '📎';
                        };
                        return (
                          <motion.li
                            key={`${classAccess.class._id}-${material.url}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm hover:bg-background/80 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-lg flex-shrink-0">{getFileIcon(material.url)}</span>
                              <span className="truncate font-medium text-primary">{material.title}</span>
                              {material.uploadedAt && (
                                <span className="hidden sm:inline text-xs text-foreground/50 flex-shrink-0">
                                  {new Date(material.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="flex items-center gap-1.5 text-secondary underline-offset-4 hover:underline font-medium group-hover:text-secondary/80 transition-colors flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {t("dashboard.materials.download", "Download")}
                            </a>
                          </motion.li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/50 bg-background/30 p-6 text-center">
                      <p className="text-sm text-foreground/70">
                        {t(
                          "dashboard.materials.empty",
                          "Materials will appear here once your teacher uploads them.",
                        )}
                      </p>
                    </div>
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
              {t("dashboard.store.kicker", "Storefront access")}
            </p>
            <h3 className="text-2xl font-serif text-primary">
              {t(
                "dashboard.store.title",
                "Commission a new instrument",
              )}
            </h3>
            <p className="text-sm text-foreground/70">
              {t(
                "dashboard.store.description",
                "Browse Begena, Masinko, Washint, and Kebero builds crafted for the liturgy.",
              )}
            </p>
            <Link
              href="/store"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("dashboard.store.cta", "Browse Store")}
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="space-y-3 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("dashboard.account.kicker", "Account history")}
            </p>
            <h3 className="text-2xl font-serif text-primary">
              {t("dashboard.account.title", "Orders & profile")}
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <Link
                href="/account/orders"
                className="rounded-2xl border border-border px-4 py-2 text-left transition hover:border-secondary/50"
              >
                {t("dashboard.account.orders", "View order history")}
              </Link>
              <Link
                href="/profile"
                className="rounded-2xl border border-border px-4 py-2 text-left transition hover:border-secondary/50"
              >
                {t("dashboard.account.profile", "Update profile details")}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
