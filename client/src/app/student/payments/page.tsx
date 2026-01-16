"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";
import { useGetMyPaymentsQuery } from "@/store/api/attendanceApi";
import { Receipt, Download, CheckCircle2, Clock, XCircle, Calendar, Filter } from "lucide-react";

type PaymentStatus = "paid" | "partial" | "unpaid";

export default function StudentPaymentsPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [filterYear, setFilterYear] = useState<string>("");

  const { data: payments = [], isLoading } = useGetMyPaymentsQuery(undefined, {
    skip: !isLoggedIn || user?.userType !== "student",
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.userType !== "student") {
      router.replace("/student");
    }
  }, [isLoggedIn, router, user?.userType]);

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }
    
    if (filterYear) {
      const year = parseInt(filterYear);
      filtered = filtered.filter((p) => p.year === year);
    }
    
    return filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [payments, filterStatus, filterYear]);

  const stats = useMemo(() => {
    const total = payments.length;
    const paid = payments.filter((p) => p.status === "paid").length;
    const partial = payments.filter((p) => p.status === "partial").length;
    const unpaid = payments.filter((p) => p.status === "unpaid").length;
    const totalPaid = payments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + p.amount, 0);
    
    return { total, paid, partial, unpaid, totalPaid };
  }, [payments]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "partial":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "unpaid":
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return t("payments.status.paid", "Paid");
      case "partial":
        return t("payments.status.partial", "Partial");
      case "unpaid":
        return t("payments.status.unpaid", "Unpaid");
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      t("months.january", "January"),
      t("months.february", "February"),
      t("months.march", "March"),
      t("months.april", "April"),
      t("months.may", "May"),
      t("months.june", "June"),
      t("months.july", "July"),
      t("months.august", "August"),
      t("months.september", "September"),
      t("months.october", "October"),
      t("months.november", "November"),
      t("months.december", "December"),
    ];
    return months[month - 1] || `Month ${month}`;
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("student.payments.kicker", "Payment History")}
            </p>
            <h1 className="text-3xl font-serif text-primary sm:text-4xl">
              {t("student.payments.title", "My Payments")}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "student.payments.subtitle",
                "View your tuition payment records and history.",
              )}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.total", "Total Payments")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.paid", "Paid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.partial", "Partial")}
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.totalPaid", "Total Paid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatAmount(stats.totalPaid)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-secondary" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | "all")}
                className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
              >
                <option value="all">{t("student.payments.allStatuses", "All Statuses")}</option>
                <option value="paid">{t("payments.status.paid", "Paid")}</option>
                <option value="partial">{t("payments.status.partial", "Partial")}</option>
                <option value="unpaid">{t("payments.status.unpaid", "Unpaid")}</option>
              </select>
            </div>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
            >
              <option value="">{t("student.payments.allYears", "All Years")}</option>
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Payment Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <h2 className="text-xl font-serif text-primary mb-4">
            {t("student.payments.records", "Payment Records")}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl surface-elevated animate-pulse" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rounded-xl surface-elevated p-8 text-center shadow-lg">
              <Receipt className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
              <p className="text-sm text-foreground/70">
                {t(
                  "student.payments.empty",
                  "No payment records found for the selected period.",
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment, idx) => (
                <motion.div
                  key={payment._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between rounded-xl surface-elevated p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(payment.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary mb-1">
                        {getMonthName(payment.month)} {payment.year}
                      </p>
                      {payment.note && (
                        <p className="text-xs text-foreground/60 truncate">
                          {payment.note}
                        </p>
                      )}
                      {payment.createdAt && (
                        <p className="text-xs text-foreground/50 mt-1">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {formatAmount(payment.amount)}
                      </p>
                      <p className="text-xs font-semibold text-foreground/60">
                        {getStatusLabel(payment.status)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
