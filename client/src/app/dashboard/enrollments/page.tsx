"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useGetMyEnrollmentsQuery } from "@/store/api/classApi";
import { useI18n } from "@/components/providers/I18nProvider";

const statusPalette: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  withdrawn: "bg-rose-500/10 text-rose-500",
};

function formatAmount(amount?: number | null, currency?: string | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return null;
  }
  const resolvedCurrency = currency ?? "ETB";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: resolvedCurrency,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${resolvedCurrency}`;
  }
}

export default function MyEnrollmentsPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  const {
    data: enrollments = [],
    isLoading,
    isError,
    refetch,
  } = useGetMyEnrollmentsQuery(undefined, {
    skip: !isLoggedIn,
  });

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <header className="space-y-3 rounded-2xl surface-elevated p-4 text-center shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:rounded-[32px] sm:p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            {t("enrollments.kicker", "Tuition & Access")}
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            {t("enrollments.title", "My Enrollments")}
          </h1>
          <p className="text-sm text-foreground/70">
            {t(
              "enrollments.subtitle",
              "Track payment references, approval status, and jump back into your classes any time.",
            )}
          </p>
        </header>

        <div className="rounded-2xl surface-elevated p-4 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:rounded-[32px] sm:p-6">
          {isLoading && (
            <p className="text-sm text-foreground/70">
              {t("enrollments.loading", "Loading enrollment history...")}
            </p>
          )}

          {isError && (
            <div className="rounded-2xl surface-elevated bg-red-500/10 p-4 text-sm text-red-600 shadow-lg">
              <p>{t("enrollments.error", "Unable to load enrollments.")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 rounded-full surface-elevated bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:bg-red-500/20 hover:shadow-md shadow-sm"
              >
                {t("button.retry", "Retry")}
              </button>
            </div>
          )}

          {!isLoading && !isError && enrollments.length === 0 && (
            <div className="rounded-2xl surface-elevated p-8 text-center text-sm text-foreground/70 shadow-lg">
              <p>{t("enrollments.empty.title", "No enrollments yet.")}</p>
              <p className="mt-2">
                {t(
                  "enrollments.empty.description",
                  "Browse the conservatory to reserve your seat in the next cohort.",
                )}
              </p>
              <Link
                href="/classes"
                className="mt-4 inline-flex items-center justify-center rounded-full surface-elevated bg-secondary/10 px-5 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20 hover:shadow-md shadow-sm"
              >
                {t("enrollments.empty.cta", "Browse classes")}
              </Link>
            </div>
          )}

          <div className="grid gap-4">
            {enrollments.map((enrollment) => {
              const amountLabel = formatAmount(
                enrollment.amountPaid,
                enrollment.currency,
              );
              const status = enrollment.status ?? "pending";
              return (
                <motion.article
                  key={`${enrollment.classId ?? enrollment.classTitle}-${status}-${enrollment.paymentReference ?? ""}`}
                  whileHover={{ y: -2 }}
                  className="rounded-3xl surface-elevated p-5 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        {enrollment.classTitle ??
                          t("enrollments.noTitle", "Class")}
                      </p>
                      <p className="mt-1 text-sm text-foreground/70">
                        {enrollment.enrolledAt
                          ? new Date(enrollment.enrolledAt).toLocaleDateString()
                          : t("enrollments.noDate", "Date pending")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {amountLabel && (
                        <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                          {amountLabel}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPalette[status] ?? "bg-secondary/20 text-secondary"}`}
                      >
                        {t(`classes.status.${status}`, status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-foreground/70 md:grid-cols-2">
                    {enrollment.paymentMethod && (
                      <p>
                        {t("enrollments.method", "Method")}:{" "}
                        <span className="font-semibold text-foreground">
                          {enrollment.paymentMethod}
                        </span>
                      </p>
                    )}
                    {enrollment.paymentReference && (
                      <p className="truncate">
                        {t("enrollments.reference", "Reference")}:{" "}
                        <span className="font-semibold text-foreground">
                          {enrollment.paymentReference}
                        </span>
                      </p>
                    )}
                    {enrollment.note && (
                      <p className="md:col-span-2">
                        {t("enrollments.note", "Note")}: {enrollment.note}
                      </p>
                    )}
                    {status === "pending" && (
                      <p className="md:col-span-2 text-xs text-amber-700">
                        {t(
                          "enrollments.pendingExplanation",
                          "Your enrollment and receipt have been submitted. Admin is reviewing your payment; access will unlock once it is approved.",
                        )}
                      </p>
                    )}
                    {status === "active" && (
                      <p className="md:col-span-2 text-xs text-emerald-700">
                        {t(
                          "enrollments.activeExplanation",
                          "Your payment has been approved and this class is fully unlocked in your dashboard.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {enrollment.classId ? (
                      <Link
                        href={`/live/class/${enrollment.classId}`}
                        className="rounded-full surface-elevated bg-secondary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary transition hover:bg-secondary/20 hover:shadow-md shadow-sm"
                      >
                        {t("enrollments.viewClass", "Open class")}
                      </Link>
                    ) : null}
                    <Link
                      href="/dashboard"
                      className="rounded-full surface-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:shadow-md shadow-sm"
                    >
                      {t("enrollments.backDashboard", "Back to dashboard")}
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

