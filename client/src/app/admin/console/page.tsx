"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  useGetAnalyticsOverviewQuery,
  useGetManagedClassesQuery,
  useGetAllEnrollmentsQuery,
} from "@/store/api/adminApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useGetProductsQuery, useGetAllOrdersQuery } from "@/store/api/storeApi";
import { useGetBranchesAdminQuery } from "@/store/api/branchApi";
import { useGetAllFaqQuery } from "@/store/api/faqApi";
import { useGetManageCommentsQuery } from "@/store/api/blogApi";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  DollarSign,
  Users,
  BookOpen,
  ShoppingBag,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  TrendingUp,
  Package,
  MapPin,
  MessageSquare,
} from "lucide-react";

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
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsOverviewQuery();
  const { data: users, isLoading: usersLoading } = useGetAllUsersQuery();
  const { data: classes, isLoading: classesLoading } = useGetManagedClassesQuery();
  const { data: products, isLoading: productsLoading } = useGetProductsQuery();
  const { data: orders, isLoading: ordersLoading } = useGetAllOrdersQuery();
  const { data: branches, isLoading: branchesLoading } = useGetBranchesAdminQuery();
  const { data: faqs, isLoading: faqsLoading } = useGetAllFaqQuery();
  const { data: comments, isLoading: commentsLoading } = useGetManageCommentsQuery();
  const {
    data: pendingEnrollments = [],
    isLoading: pendingLoading,
  } = useGetAllEnrollmentsQuery({ status: "pending" });

  // Calculate additional stats
  const totalOrders = orders?.length ?? 0;
  const totalBranches = branches?.length ?? 0;
  const activeBranches = branches?.filter((b) => b.isActive).length ?? 0;
  const totalFaqs = faqs?.length ?? 0;
  const pendingComments = comments?.filter((c) => c.status === "pending").length ?? 0;

  const summaryCards = [
    {
      label: t("admin.console.revenue", "Total Revenue"),
      value: formatCurrency(analytics?.revenue.total),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      href: "/admin/analytics",
      trend: analytics?.revenue.monthly && analytics.revenue.monthly.length > 1
        ? analytics.revenue.monthly[analytics.revenue.monthly.length - 1]?.total - 
          (analytics.revenue.monthly[analytics.revenue.monthly.length - 2]?.total ?? 0)
        : undefined,
    },
    {
      label: t("admin.console.users", "Registered Users"),
      value: usersLoading ? "..." : users?.length ?? "—",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      href: "/admin/users",
      trend: analytics?.users.monthly && analytics.users.monthly.length > 1
        ? analytics.users.monthly[analytics.users.monthly.length - 1]?.total - 
          (analytics.users.monthly[analytics.users.monthly.length - 2]?.total ?? 0)
        : undefined,
    },
    {
      label: t("admin.console.totalClasses", "Total Classes"),
      value: analyticsLoading ? "..." : analytics?.classes.total ?? "—",
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      href: "/admin/classes",
    },
    {
      label: t("admin.console.liveClasses", "Live Classes"),
      value: analyticsLoading ? "..." : analytics?.classes.live ?? "—",
      icon: BookOpen,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
      href: "/admin/classes",
    },
    {
      label: t("admin.console.products", "Products"),
      value: productsLoading ? "..." : products?.length ?? "—",
      icon: ShoppingBag,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      href: "/admin/store",
    },
    {
      label: t("admin.console.totalOrders", "Total Orders"),
      value: ordersLoading ? "..." : totalOrders,
      icon: Package,
      color: "text-pink-600",
      bgColor: "bg-pink-500/10",
      href: "/admin/orders",
    },
    {
      label: t("admin.console.branches", "Branches"),
      value: branchesLoading ? "..." : `${activeBranches}/${totalBranches}`,
      icon: MapPin,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
      href: "/admin/branches",
    },
    {
      label: t("admin.console.pendingEnrollments", "Pending Enrollments"),
      value: pendingLoading ? "..." : pendingEnrollments.length,
      subtitle: t("admin.console.pendingSubtitle", "Awaiting review"),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      href: "/admin/enrollments",
      urgent: pendingEnrollments.length > 0,
    },
    {
      label: t("admin.console.pendingComments", "Pending Comments"),
      value: commentsLoading ? "..." : pendingComments,
      subtitle: t("admin.console.commentsSubtitle", "Awaiting moderation"),
      icon: MessageSquare,
      color: "text-cyan-600",
      bgColor: "bg-cyan-500/10",
      href: "/admin/comments",
      urgent: pendingComments > 0,
    },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.console.kicker", "Admin Console")}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-primary">
          {t("admin.console.title", "Platform Overview")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "admin.console.subtitle",
            "Monitor and manage all aspects of the platform.",
          )}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={card.href}
                className="group relative flex flex-col rounded-3xl card-elevated p-5 transition-all hover:shadow-[0_12px_40px_var(--color-primary-glow)]"
              >
                {card.urgent && (
                  <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-amber-500 animate-pulse" />
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bgColor} ${card.color} transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {card.href && (
                    <ArrowRight className="h-4 w-4 text-foreground/30 group-hover:text-secondary transition-colors" />
                  )}
                </div>
                <p className="text-xs uppercase tracking-[0.4em] text-secondary/70 mb-1">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-primary">
                    {typeof card.value === "string" && card.value === "..." ? (
                      <Loader2 className="inline-block h-5 w-5 animate-spin" />
                    ) : (
                      card.value
                    )}
                  </p>
                  {card.trend !== undefined && card.trend !== 0 && (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${
                      card.trend > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      <TrendingUp className={`h-3 w-3 ${card.trend < 0 ? "rotate-180" : ""}`} />
                      {Math.abs(card.trend)}
                    </span>
                  )}
                </div>
                {card.subtitle && (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-foreground/50">
                    {card.subtitle}
                  </p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Classes */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl surface-elevated p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif text-primary">
                {t("admin.console.latestClasses", "Latest Classes")}
              </h2>
              <p className="text-xs text-foreground/60 mt-1">
                {t("admin.console.latestClassesDesc", "Recently created classes")}
              </p>
            </div>
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              {classes?.length ?? 0}
            </span>
          </div>
          {classesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {(classes ?? []).slice(0, 5).map((klass, index) => (
                <Link
                  key={klass._id}
                  href="/admin/classes"
                >
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="flex items-center justify-between rounded-2xl card-elevated px-4 py-3 transition-all hover:shadow-md cursor-pointer group"
                  >
                    <span className="font-medium text-primary truncate flex-1 group-hover:text-secondary transition-colors">
                      {klass.title}
                    </span>
                    <div className="flex items-center gap-2">
                      {(klass as any).classType && (
                        <span className="text-xs text-foreground/50 capitalize">
                          {(klass as any).classType}
                        </span>
                      )}
                      <span className={`ml-2 rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                        klass.isLive
                          ? "bg-green-500/20 text-green-600"
                          : "bg-foreground/10 text-foreground/60"
                      }`}>
                        {klass.isLive
                          ? t("admin.console.status.live", "Live")
                          : t("admin.console.status.draft", "Draft")}
                      </span>
                    </div>
                  </motion.li>
                </Link>
              ))}
              {!classes?.length && (
                <li className="text-center py-8 text-sm text-foreground/60">
                  {t("admin.console.noClasses", "No classes yet.")}
                </li>
              )}
            </ul>
          )}
        </motion.div>

        {/* Order Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl surface-elevated p-6"
        >
          <div className="mb-4">
            <h2 className="text-xl font-serif text-primary">
              {t("admin.console.orderStatus", "Order Status")}
            </h2>
            <p className="text-xs text-foreground/60 mt-1">
              {t("admin.console.orderStatusDesc", "Store order breakdown")}
            </p>
          </div>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(analytics.orders.statusBreakdown).map(
                ([status, count], index) => (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="rounded-2xl card-elevated p-4 text-center transition-all hover:shadow-md"
                  >
                    <p className="text-xs uppercase tracking-[0.4em] text-secondary/60 mb-2">
                      {status}
                    </p>
                    <p className="text-2xl font-bold text-primary">{count}</p>
                  </motion.div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-foreground/60 text-center py-8">
              {t("admin.console.loading", "Analytics loading...")}
            </p>
          )}
        </motion.div>
      </div>

      {/* Pending Enrollments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-3xl bg-[var(--color-surface-elevated)] p-6 shadow-lg dark:bg-[var(--color-surface-elevated)]"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif text-primary">
              {t("admin.console.pendingListTitle", "Pending Tuition")}
            </h2>
            <p className="text-xs text-foreground/60 mt-1">
              {t("admin.console.pendingListDesc", "Enrollments awaiting approval")}
            </p>
          </div>
          <Link
            href="/admin/enrollments"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary transition hover:opacity-80 dark:bg-[var(--color-secondary-soft)] dark:hover:opacity-80"
          >
            {t("admin.console.pendingCta", "Manage enrollments")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {pendingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : pendingEnrollments.length === 0 ? (
          <div className="rounded-2xl bg-[var(--color-card-bg)] p-8 text-center dark:bg-[var(--color-card-bg)]">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500/40 mb-3" />
            <p className="text-sm text-foreground/70">
              {t("admin.console.pendingEmpty", "All caught up on approvals.")}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendingEnrollments.slice(0, 5).map((enrollment, index) => (
              <motion.li
                key={`${enrollment.classId}-${enrollment.student.id}-${enrollment.paymentReference ?? ""}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="rounded-2xl bg-amber-500/5 px-4 py-4 transition hover:bg-amber-500/10 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
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
                  </div>
                  <div className="text-right">
                    {formatAmount(enrollment.amountPaid, enrollment.currency) && (
                      <p className="font-semibold text-primary text-sm">
                        {formatAmount(enrollment.amountPaid, enrollment.currency)}
                      </p>
                    )}
                    {enrollment.paymentReference && (
                      <p className="text-xs text-foreground/60 font-mono">
                        {enrollment.paymentReference}
                      </p>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
            {pendingEnrollments.length > 5 && (
              <li className="text-center pt-2">
                <Link
                  href="/admin/enrollments"
                  className="text-xs font-semibold text-secondary hover:underline"
                >
                  {t("admin.console.viewAll", "View all")} {pendingEnrollments.length}{" "}
                  {t("admin.console.pendingEnrollments", "pending enrollments")} →
                </Link>
              </li>
            )}
          </ul>
        )}
      </motion.div>
    </section>
  );
}
