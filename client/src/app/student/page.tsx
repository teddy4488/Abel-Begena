"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Clock, Calendar } from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.userType !== "student") {
      // Redirect to appropriate dashboard based on userType
      const userType = user?.userType;
      if (userType === "admin") {
        router.replace("/admin/console");
      } else if (userType === "teacher") {
        router.replace("/teacher");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [isLoggedIn, router, user?.userType]);

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-8"
        >
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("student.dashboard.kicker", "Student Portal")}
            </p>
            <h1 className="text-3xl font-serif text-primary sm:text-4xl">
              {t("student.dashboard.title", "Welcome, Student")}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "student.dashboard.subtitle",
                "View your attendance records, learning progress, and payment history.",
              )}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl card-elevated p-4">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.dashboard.attendanceNumber", "Attendance Number")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary font-mono">
                {user?.attendanceNumber || "—"}
              </p>
            </div>

            <div className="rounded-2xl card-elevated p-4">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.dashboard.instrument", "Instrument")}
                </p>
              </div>
              <p className="text-xl font-semibold text-primary">
                {user?.instrumentType || "—"}
              </p>
            </div>

            <div className="rounded-2xl card-elevated p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.dashboard.learningType", "Learning Type")}
                </p>
              </div>
              <p className="text-xl font-semibold text-primary capitalize">
                {user?.learningType || "—"}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-8"
        >
          <h2 className="text-xl font-serif text-primary mb-4">
            {t("student.dashboard.quickActions", "Quick Actions")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl card-elevated p-4">
              <Calendar className="h-6 w-6 text-secondary mb-2" />
              <h3 className="font-semibold text-primary mb-1">
                {t("student.dashboard.viewAttendance", "View Attendance")}
              </h3>
              <p className="text-sm text-foreground/70">
                {t(
                  "student.dashboard.viewAttendanceDesc",
                  "Check your attendance records and learning progress.",
                )}
              </p>
            </div>

            <div className="rounded-2xl card-elevated p-4">
              <BookOpen className="h-6 w-6 text-secondary mb-2" />
              <h3 className="font-semibold text-primary mb-1">
                {t("student.dashboard.paymentHistory", "Payment History")}
              </h3>
              <p className="text-sm text-foreground/70">
                {t(
                  "student.dashboard.paymentHistoryDesc",
                  "View your tuition payment records.",
                )}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-8"
        >
          <h2 className="text-xl font-serif text-primary mb-4">
            {t("student.dashboard.studentInfo", "Student Information")}
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mb-1">
                {t("student.dashboard.fullName", "Full Name")}
              </p>
              <p className="text-lg font-semibold text-primary">
                {user?.fullName || user?.firstName || user?.email || "—"}
              </p>
            </div>
            {user?.email && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mb-1">
                  {t("student.dashboard.email", "Email")}
                </p>
                <p className="text-sm text-foreground/70">{user.email}</p>
              </div>
            )}
            {user?.branchId && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mb-1">
                  {t("student.dashboard.branch", "Branch")}
                </p>
                <p className="text-sm text-foreground/70">
                  {typeof user.branchId === "object"
                    ? user.branchId.name
                    : user.branchId}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
