"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, BookOpen, Clock, Calendar, Download, FileText, Video, Image as ImageIcon, File, ExternalLink, Bell } from "lucide-react";
import { useGetPublicMaterialsQuery } from "@/store/api/materialsApi";
import { useGetClassesQuery } from "@/store/api/classApi";
import { useGetMyUpcomingPaymentsQuery } from "@/store/api/attendanceApi";
import { InstrumentType } from "@/store/api/storeApi";
import { AlertCircle, Calendar, Bell } from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  
  // Get materials filtered by student's instrument type (accessible to all students)
  const studentInstrumentType = user?.instrumentType as InstrumentType | undefined;
  const { data: materials = [], isLoading: materialsLoading } = useGetPublicMaterialsQuery(
    studentInstrumentType ? { instrumentType: studentInstrumentType } : undefined,
    { skip: !studentInstrumentType }
  );
  
  // Get classes and filter live classes for online learners only
  const { data: classes = [] } = useGetClassesQuery();
  const { data: upcomingPayments = [] } = useGetMyUpcomingPaymentsQuery({ daysAhead: 14 }, {
    skip: !isLoggedIn || user?.userType !== "student",
  });
  const isOnlineLearner = user?.learningType === "online";
  
  const liveClasses = useMemo(() => {
    if (!isOnlineLearner) return [];
    return classes.filter((klass) => klass.isLive);
  }, [classes, isOnlineLearner]);

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
      return;
    }
    // Redirect to password change page if student must change password
    if (user?.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
  }, [isLoggedIn, router, user?.userType, user?.mustChangePassword]);

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case "pdf":
        return FileText;
      case "image":
        return ImageIcon;
      case "video":
        return Video;
      default:
        return File;
    }
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
            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
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

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
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

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
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
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <h2 className="text-xl font-serif text-primary mb-4">
            {t("student.dashboard.quickActions", "Quick Actions")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/student/attendance"
              className="rounded-2xl surface-elevated p-4 shadow-lg hover:shadow-xl transition-all group"
            >
              <Calendar className="h-6 w-6 text-secondary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-primary mb-1">
                {t("student.dashboard.viewAttendance", "View Attendance")}
              </h3>
              <p className="text-sm text-foreground/70">
                {t(
                  "student.dashboard.viewAttendanceDesc",
                  "Check your attendance records and learning progress.",
                )}
              </p>
            </Link>

            <Link
              href="/student/payments"
              className="rounded-2xl surface-elevated p-4 shadow-lg hover:shadow-xl transition-all group"
            >
              <BookOpen className="h-6 w-6 text-secondary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-primary mb-1">
                {t("student.dashboard.paymentHistory", "Payment History")}
              </h3>
              <p className="text-sm text-foreground/70">
                {t(
                  "student.dashboard.paymentHistoryDesc",
                  "View your tuition payment records.",
                )}
              </p>
            </Link>
          </div>
        </motion.div>

        {/* Upcoming Payment Notifications */}
        {upcomingPayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8 border-l-4 border-amber-500"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("student.dashboard.upcomingPayments.kicker", "Payment Reminder")}
                </p>
                <h2 className="text-xl font-serif text-primary">
                  {t("student.dashboard.upcomingPayments.title", "Upcoming Payment Due Dates")}
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingPayments.slice(0, 3).map((payment, index) => {
                const urgencyColor =
                  payment.daysUntilDue <= 3
                    ? "bg-red-500/10 text-red-600 border-red-500/30"
                    : payment.daysUntilDue <= 7
                      ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30";
                
                const urgencyText =
                  payment.daysUntilDue === 0
                    ? t("student.dashboard.upcomingPayments.dueToday", "Due Today")
                    : payment.daysUntilDue === 1
                      ? t("student.dashboard.upcomingPayments.dueTomorrow", "Due Tomorrow")
                      : t("student.dashboard.upcomingPayments.dueInDays", `Due in ${payment.daysUntilDue} days`);

                const monthName = new Date(payment.year, payment.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                return (
                  <motion.div
                    key={`${payment.year}-${payment.month}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${urgencyColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5" />
                      <div>
                        <p className="font-semibold text-primary">
                          {monthName}
                        </p>
                        <p className="text-xs text-foreground/70">
                          {new Date(payment.dueDate).toLocaleDateString()} • {urgencyText}
                        </p>
                        {payment.amount && (
                          <p className="mt-1 text-sm font-semibold">
                            {payment.amount.toLocaleString("en-US", {
                              style: "currency",
                              currency: "ETB",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href="/student/payments"
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90 transition"
                    >
                      {t("student.dashboard.upcomingPayments.view", "View Details")}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {upcomingPayments.length > 3 && (
              <Link
                href="/student/payments"
                className="mt-4 block text-center text-sm text-secondary hover:underline"
              >
                {t("student.dashboard.upcomingPayments.viewAll", `View all ${upcomingPayments.length} upcoming payments`)}
              </Link>
            )}
          </motion.div>
        )}

        {/* Instrument Materials Section */}
        {studentInstrumentType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("student.dashboard.materials.kicker", "Learning Materials")}
                </p>
                <h2 className="text-xl font-serif text-primary">
                  {t("student.dashboard.materials.title", "Materials for")} {studentInstrumentType}
                </h2>
              </div>
            </div>
            {materialsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl surface-elevated animate-pulse" />
                ))}
              </div>
            ) : materials.length === 0 ? (
              <div className="rounded-xl surface-elevated p-8 text-center shadow-lg">
                <BookOpen className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                <p className="text-sm text-foreground/70">
                  {t(
                    "student.dashboard.materials.empty",
                    "No materials available yet. Your teacher will upload materials soon.",
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {materials.map((material, idx) => {
                    const FileIcon = getFileIcon(material.fileType);
                    return (
                      <motion.div
                        key={material._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between rounded-xl surface-elevated p-4 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                            <FileIcon className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary truncate">{material.title}</p>
                            {material.description && (
                              <p className="text-xs text-foreground/60 truncate mt-1">
                                {material.description}
                              </p>
                            )}
                            {material.uploadedAt && (
                              <p className="text-xs text-foreground/50 mt-1">
                                {new Date(material.uploadedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs font-semibold text-secondary hover:bg-secondary/20 transition-colors flex-shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          {t("student.dashboard.materials.download", "Download")}
                        </a>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Live Classes Section (Online Learners Only) */}
        {isOnlineLearner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-8"
          >
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("student.dashboard.live.kicker", "Live Classes")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {t("student.dashboard.live.title", "Join Live Sessions")}
              </h2>
              <p className="mt-2 text-sm text-foreground/70">
                {t(
                  "student.dashboard.live.subtitle",
                  "Access live classes and interactive learning sessions.",
                )}
              </p>
            </div>
            {liveClasses.length === 0 ? (
              <div className="rounded-xl surface-elevated p-8 text-center shadow-lg">
                <Video className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                <p className="text-sm text-foreground/70">
                  {t(
                    "student.dashboard.live.empty",
                    "No live classes available at the moment.",
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveClasses.map((klass) => (
                  <motion.div
                    key={klass._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between rounded-xl surface-elevated p-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                      <div>
                        <p className="font-semibold text-primary">{klass.title}</p>
                        <p className="text-xs text-foreground/60">Live now</p>
                      </div>
                    </div>
                    <Link
                      href={`/live/class/${klass._id}`}
                      className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-primary hover:bg-secondary/90 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t("student.dashboard.live.join", "Join")}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
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
