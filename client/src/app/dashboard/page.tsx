"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUserLandingRoute } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Receipt } from "lucide-react";

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
  materials: { title: string; url: string; uploadedAt?: string | null }[];
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
    // Redirect based on userType
    const userType = user?.userType;
    if (userType === "admin" || userType === "teacher" || userType === "student") {
      router.replace(getUserLandingRoute(userType, user?.role));
    }
  }, [isLoggedIn, router, user?.userType, user?.role]);

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

  const recentMaterials = useMemo(() => {
    return classes
      .flatMap((klass) =>
        klass.materials.map((material) => ({
          ...material,
          classId: klass.class._id,
          classTitle: klass.class.title,
        })),
      )
      .filter((material) => material.uploadedAt)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt ?? 0).getTime() -
          new Date(a.uploadedAt ?? 0).getTime(),
      )
      .slice(0, 5);
  }, [classes]);

  const learningProgress = useMemo(() => {
    return classes.map((klass) => {
      let progress = 0;
      if (klass.enrollment?.status === "active") {
        progress += 40;
      }
      if ((klass.materials?.length ?? 0) > 0) {
        progress += 30;
      }
      if (klass.isLive) {
        progress += 30;
      }
      return {
        id: klass.class._id,
        title: klass.class.title,
        status: klass.enrollment?.status ?? "pending",
        materialsCount: klass.materials.length,
        live: klass.isLive,
        value: Math.min(progress, 100),
      };
    });
  }, [classes]);

  const staticHighlights = [
    {
      id: "highlight-materials",
      title: t("dashboard.highlights.materials", "New materials arrive weekly"),
      description: t(
        "dashboard.highlights.materialsDesc",
        "Teachers continue to upload PDFs, slides, and video recaps for every enrolled class.",
      ),
    },
    {
      id: "highlight-store",
      title: t("dashboard.highlights.store", "Commissioned instruments"),
      description: t(
        "dashboard.highlights.storeDesc",
        "Our luthiers are crafting limited-run Begena and Masinko sets—visit the store to reserve yours.",
      ),
    },
  ];

  const renderSkeletonCard = () => (
    <div className="rounded-2xl surface-elevated p-4 shadow-lg sm:rounded-3xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2 w-full">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-5 w-48 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-full sm:w-40" />
      </div>
      <div className="mt-6 space-y-2">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-2xl surface-elevated px-4 py-3 shadow-sm"
          >
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
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
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8 md:space-y-12">
        <header className="space-y-3 rounded-2xl surface-elevated bg-gradient-to-br from-surface via-background to-secondary/5 p-4 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:rounded-[32px] sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("dashboard.kicker", "My Conservatory")}
              </p>
              <h1 className="text-2xl font-serif text-primary sm:text-3xl md:text-4xl">
                {t("dashboard.title", "Student Dashboard")}
              </h1>
              <p className="mt-1 text-sm text-foreground/75 sm:text-base">
                {t(
                  "dashboard.description",
                  "Access your live rooms, download materials, and keep shopping for handcrafted instruments.",
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl surface-elevated px-3 py-2 shadow-sm sm:rounded-2xl sm:px-4">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.email}
                  className="h-10 w-10 rounded-full object-cover sm:h-12 sm:w-12"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-sm text-secondary sm:h-12 sm:w-12 sm:text-base">
                  {(user?.firstName?.[0] ?? user?.email?.[0] ?? "").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-primary sm:text-sm">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-[10px] text-foreground/70 sm:text-xs">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {hasPendingEnrollment && (
          <div className="rounded-3xl surface-elevated bg-amber-500/10 px-4 py-3 text-sm text-amber-800 shadow-lg">
            {t(
              "dashboard.pendingNotice",
              "One or more enrollments are awaiting review. Access will unlock as soon as the admin verifies your payment.",
            )}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div
                key={`skeleton-${item}`}
                className="rounded-2xl surface-elevated p-4 shadow-lg sm:rounded-3xl sm:p-5"
              >
                <Skeleton className="h-3 w-28 rounded-full" />
                <Skeleton className="mt-2 h-5 w-40 rounded-full" />
                <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {error}. {t("dashboard.errorRefresh", "Please refresh the page.")}
          </p>
        )}

        <div className="space-y-6 rounded-2xl surface-elevated p-4 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("dashboard.section.learning", "My learning")}
              </p>
              <h2 className="text-xl font-serif text-primary sm:text-2xl">
                {t("dashboard.section.active", "Active cohorts")}
              </h2>
            </div>
            <Link
              href="/store"
              className="w-full rounded-full surface-elevated px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest transition hover:shadow-md sm:w-auto shadow-sm"
            >
              {t("dashboard.cta.store", "Visit Store")}
            </Link>
          </div>

          {!isLoading && !classes.length && !error && (
            <div className="rounded-2xl surface-elevated p-4 text-center shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-base font-semibold text-primary sm:text-lg">
                {t(
                  "dashboard.empty.title",
                  "You are not enrolled in any classes yet.",
                )}
              </p>
              <p className="mt-2 text-xs text-foreground/70 sm:text-sm">
                {t(
                  "dashboard.empty.description",
                  "Browse our offerings to begin your musical journey.",
                )}
              </p>
              <Link
                href="/classes"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full surface-elevated bg-secondary/10 px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20 hover:shadow-md sm:w-auto shadow-sm"
              >
                {t("dashboard.empty.cta", "Browse classes")}
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:gap-6">
            {isLoading && !classes.length
              ? [1, 2, 3].map((item) => (
                  <div key={`loading-card-${item}`}>{renderSkeletonCard()}</div>
                ))
              : classes.map((classAccess) => (
                  <div
                    key={classAccess.class._id}
                    className="rounded-2xl surface-elevated p-4 shadow-lg sm:rounded-3xl sm:p-5"
                  >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {renderStatusChip(classAccess.enrollment?.status ?? null)}
                      {!classAccess.isLive && (
                        <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                          {t("dashboard.card.offline", "Live session offline")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-serif text-primary sm:text-2xl">
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
                      className="w-full inline-flex items-center justify-center rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-secondary/40 transition hover:-translate-y-0.5 sm:w-auto"
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
                            className="flex items-center justify-between rounded-2xl surface-elevated px-4 py-3 text-sm hover:shadow-lg transition-all group shadow-sm"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-lg shrink-0">{getFileIcon(material.url)}</span>
                              <span className="truncate font-medium text-primary">{material.title}</span>
                              {material.uploadedAt && (
                                <span className="hidden sm:inline text-xs text-foreground/50 shrink-0">
                                  {new Date(material.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noreferrer"
                              download
                              className="flex items-center gap-1.5 text-secondary underline-offset-4 hover:underline font-medium group-hover:text-secondary/80 transition-colors shrink-0" 
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
                    <div className="rounded-xl surface-elevated p-6 text-center shadow-lg">
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            whileHover={{ y: -4 }}
            className="space-y-3 rounded-[32px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]"
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
            className="space-y-3 rounded-[32px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]"
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
                className="rounded-2xl surface-elevated px-4 py-2 text-left transition hover:shadow-md shadow-sm"
              >
                {t("dashboard.account.orders", "View order history")}
              </Link>
              <Link
                href="/profile"
                className="rounded-2xl surface-elevated px-4 py-2 text-left transition hover:shadow-md shadow-sm"
              >
                {t("dashboard.account.profile", "Update profile details")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="space-y-3 rounded-[32px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("dashboard.payments.kicker", "Payment insights")}
            </p>
            <h3 className="text-2xl font-serif text-primary">
              {t("dashboard.payments.title", "Receipts & history")}
            </h3>
            <p className="text-sm text-foreground/70">
              {t(
                "dashboard.payments.description",
                "Review tuition receipts, store purchases, and export CSV records.",
              )}
            </p>
            <Link
              href="/dashboard/payments"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-secondary transition hover:border-secondary hover:bg-(--color-secondary-soft)"
            >
              <Receipt className="h-4 w-4" />
              {t("dashboard.payments.cta", "Payment history")}
            </Link>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4 rounded-[32px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("dashboard.progress.kicker", "Learning progress")}
                </p>
                <h3 className="text-xl font-serif text-primary sm:text-2xl">
                  {t("dashboard.progress.title", "Track your momentum")}
                </h3>
              </div>
              <Link
                href="/dashboard/enrollments"
                className="text-xs font-semibold uppercase tracking-wide text-secondary hover:underline"
              >
                {t("dashboard.progress.viewAll", "View details")}
              </Link>
            </div>
            {learningProgress.length ? (
              <div className="space-y-4">
                {learningProgress.slice(0, 4).map((klass) => (
                  <div
                    key={klass.id}
                    className="rounded-2xl surface-elevated p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-primary">{klass.title}</p>
                        <p className="text-xs text-foreground/60">
                          {klass.materialsCount}{" "}
                          {t("dashboard.progress.materials", "materials")} •{" "}
                          {klass.live
                            ? t("dashboard.progress.live", "Live session ready")
                            : t("dashboard.progress.offline", "Live session offline")}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold uppercase ${
                          klass.status === "active"
                            ? "text-emerald-600"
                            : klass.status === "pending"
                              ? "text-amber-600"
                              : "text-foreground/60"
                        }`}
                      >
                        {t(`classes.status.${klass.status}`, klass.status)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-border">
                      <div
                        className="h-2 rounded-full bg-secondary transition-all"
                        style={{ width: `${klass.value}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-foreground/60">
                      {klass.value}% {t("dashboard.progress.completed", "complete")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl surface-elevated p-8 text-center text-sm text-foreground/70 shadow-lg">
                {t(
                  "dashboard.progress.empty",
                  "Enroll in a class to start tracking your progress toward mastery.",
                )}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="space-y-4 rounded-[32px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("dashboard.highlights.kicker", "Monthly highlights")}
              </p>
              <h3 className="text-xl font-serif text-primary sm:text-2xl">
                {t("dashboard.highlights.title", "Announcements & tips")}
              </h3>
            </div>
            <div className="space-y-3">
              {staticHighlights.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-background/70 p-4"
                >
                  <p className="font-semibold text-primary">{item.title}</p>
                  <p className="mt-1 text-sm text-foreground/70">{item.description}</p>
                </div>
              ))}
              {hasPendingEnrollment && (
                <div className="rounded-2xl surface-elevated bg-amber-500/10 p-4 text-sm text-amber-900 shadow-lg">
                  <p className="font-semibold">
                    {t("dashboard.highlights.pending", "Enrollment pending review")}
                  </p>
                  <p className="mt-1">
                    {t(
                      "dashboard.highlights.pendingDesc",
                      "Admin is reviewing your latest payment. Access unlocks automatically once confirmed.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="rounded-[32px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("dashboard.recentMaterials.kicker", "Quick materials")}
              </p>
              <h3 className="text-xl font-serif text-primary sm:text-2xl">
                {t("dashboard.recentMaterials.title", "Recently uploaded")}
              </h3>
            </div>
            <Link
              href="/dashboard/enrollments"
              className="inline-flex w-full items-center justify-center rounded-full surface-elevated px-4 py-2 text-xs font-semibold uppercase tracking-widest transition hover:shadow-md sm:w-auto shadow-sm"
            >
              {t("dashboard.recentMaterials.history", "Enrollment history")}
            </Link>
          </div>
          {recentMaterials.length ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {recentMaterials.map((material) => (
                <li
                  key={`${material.classId}-${material.url}`}
                  className="rounded-2xl surface-elevated p-4 transition hover:shadow-lg shadow-sm"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                    {material.classTitle}
                  </p>
                  <p className="mt-2 truncate font-semibold text-primary">
                    {material.title}
                  </p>
                  {material.uploadedAt && (
                    <p className="text-xs text-foreground/60">
                      {new Date(material.uploadedAt).toLocaleDateString()}
                    </p>
                  )}
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-secondary underline-offset-4 hover:underline"
                  >
                    {t("dashboard.recentMaterials.download", "Download")}
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl surface-elevated p-6 text-center shadow-lg">
              <p className="text-sm text-foreground/70">
                {t(
                  "dashboard.recentMaterials.empty",
                  "Once your teachers upload new PDFs or media, the latest five appear here for quick access.",
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
