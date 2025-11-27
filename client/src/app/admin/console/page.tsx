"use client";

import Link from "next/link";
import {
  useGetAnalyticsOverviewQuery,
  useGetManagedClassesQuery,
  useGetAllEnrollmentsQuery,
} from "@/store/api/adminApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useGetProductsQuery } from "@/store/api/storeApi";
import { useI18n } from "@/components/providers/I18nProvider";

function formatCurrency(total?: number | null) {
  if (typeof total !== "number") {
    return "—";
  }
  try {
    return total.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  } catch {
    return total.toLocaleString();
  }
}

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

export default function AdminConsolePage() {
  const { t } = useI18n();
  const { data: analytics } = useGetAnalyticsOverviewQuery();
  const { data: users } = useGetAllUsersQuery();
  const { data: classes } = useGetManagedClassesQuery();
  const { data: products } = useGetProductsQuery();
  const {
    data: pendingEnrollments = [],
    isLoading: pendingLoading,
  } = useGetAllEnrollmentsQuery({ status: "pending" });

  const summaryCards = [
    {
      label: t("admin.console.revenue", "Total Revenue"),
      value: formatCurrency(analytics?.revenue.total),
    },
    {
      label: t("admin.console.users", "Registered Users"),
      value: users?.length ?? "—",
    },
    {
      label: t("admin.console.liveClasses", "Live Classes"),
      value: analytics?.classes.live ?? "—",
    },
    {
      label: t("admin.console.products", "Products"),
      value: products?.length ?? "—",
    },
    {
      label: t("admin.console.pendingEnrollments", "Pending Enrollments"),
      value: pendingEnrollments.length,
      subtitle: t("admin.console.pendingSubtitle", "Awaiting review"),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-border bg-[color:var(--color-background-soft)] p-4"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
              {card.label}
            </p>
            <p className="text-2xl font-semibold text-primary">{card.value}</p>
            {card.subtitle && (
              <p className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">
                {card.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif text-primary">
              {t("admin.console.latestClasses", "Latest Classes")}
            </h2>
            <span className="text-xs uppercase tracking-[0.3em] text-secondary/60">
              {classes?.length ?? 0}
            </span>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {(classes ?? []).slice(0, 5).map((klass) => (
              <li
                key={klass._id}
                className="flex items-center justify-between rounded-2xl border border-border/80 px-3 py-2"
              >
                <span className="font-medium">{klass.title}</span>
                <span className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {klass.isLive
                    ? t("admin.console.status.live", "Live")
                    : t("admin.console.status.draft", "Draft")}
                </span>
              </li>
            ))}
            {!classes?.length && (
              <li className="text-sm text-foreground/60">
                {t("admin.console.noClasses", "No classes yet.")}
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-serif text-primary">
            {t("admin.console.orderStatus", "Order Status")}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {analytics ? (
              Object.entries(analytics.orders.statusBreakdown).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="rounded-2xl border border-border/70 p-3 text-center"
                  >
                    <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                      {status}
                    </p>
                    <p className="text-xl font-semibold text-primary">{count}</p>
                  </div>
                ),
              )
            ) : (
              <p className="text-sm text-foreground/60">
                {t("admin.console.loading", "Analytics loading...")}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-serif text-primary">
            {t("admin.console.pendingListTitle", "Pending Tuition")}
          </h2>
          <Link
            href="/admin/enrollments"
            className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary transition hover:bg-(--color-secondary-soft)"
          >
            {t("admin.console.pendingCta", "Manage enrollments")}
          </Link>
        </div>
        {pendingLoading ? (
          <p className="mt-4 text-sm text-foreground/70">
            {t("admin.console.pendingLoading", "Loading pending enrollments...")}
          </p>
        ) : pendingEnrollments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-center text-sm text-foreground/70">
            {t("admin.console.pendingEmpty", "All caught up on approvals.")}
          </div>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {pendingEnrollments.slice(0, 5).map((enrollment) => (
              <li
                key={`${enrollment.classId}-${enrollment.student.id}-${enrollment.paymentReference ?? ""}`}
                className="rounded-2xl border border-border/70 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-primary">
                      {[
                        enrollment.student.firstName,
                        enrollment.student.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") || enrollment.student.email}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {enrollment.classTitle}
                    </p>
                  </div>
                  <div className="text-right text-xs text-foreground/60">
                    {formatAmount(enrollment.amountPaid, enrollment.currency) && (
                      <p className="font-semibold text-foreground">
                        {formatAmount(enrollment.amountPaid, enrollment.currency)}
                      </p>
                    )}
                    {enrollment.paymentReference && (
                      <p>{enrollment.paymentReference}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

