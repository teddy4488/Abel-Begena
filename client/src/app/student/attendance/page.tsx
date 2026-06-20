"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";
import { useGetMyAttendanceQuery } from "@/store/api/attendanceApi";
import { Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

export default function StudentAttendancePage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");

  const { data: attendanceRecords = [], isLoading } = useGetMyAttendanceQuery(
    undefined,
    {
      skip: !isLoggedIn || user?.userType !== "student",
    },
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.userType !== "student") {
      router.replace("/student");
    }
  }, [isLoggedIn, router, user?.userType]);

  const filteredRecords = useMemo(() => {
    let filtered = attendanceRecords;
    
    if (filterYear) {
      const year = parseInt(filterYear);
      filtered = filtered.filter((record) => {
        const date = new Date(record.sessionDate);
        return date.getFullYear() === year;
      });
    }
    
    if (filterMonth) {
      const month = parseInt(filterMonth);
      filtered = filtered.filter((record) => {
        const date = new Date(record.sessionDate);
        return date.getMonth() + 1 === month;
      });
    }
    
    return filtered.sort((a, b) => 
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );
  }, [attendanceRecords, filterYear, filterMonth]);

  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "present").length;
    const late = attendanceRecords.filter((r) => r.status === "late").length;
    const excused = attendanceRecords.filter((r) => r.status === "excused").length;
    const absent = attendanceRecords.filter((r) => r.status === "absent").length;
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

    return { total, present, late, excused, absent, attendanceRate };
  }, [attendanceRecords]);

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: t("months.january", "January") },
    { value: "2", label: t("months.february", "February") },
    { value: "3", label: t("months.march", "March") },
    { value: "4", label: t("months.april", "April") },
    { value: "5", label: t("months.may", "May") },
    { value: "6", label: t("months.june", "June") },
    { value: "7", label: t("months.july", "July") },
    { value: "8", label: t("months.august", "August") },
    { value: "9", label: t("months.september", "September") },
    { value: "10", label: t("months.october", "October") },
    { value: "11", label: t("months.november", "November") },
    { value: "12", label: t("months.december", "December") },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "late":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "excused":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return t("attendance.status.present", "Present");
      case "late":
        return t("attendance.status.late", "Late");
      case "excused":
        return t("attendance.status.excused", "Excused");
      default:
        return status;
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
              {t("student.attendance.kicker", "Attendance Records")}
            </p>
            <h1 className="text-3xl font-serif text-primary sm:text-4xl">
              {t("student.attendance.title", "My Attendance")}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "student.attendance.subtitle",
                "View your attendance history and learning progress.",
              )}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.attendance.total", "Total Sessions")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.attendance.present", "Present")}
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.attendance.late", "Late")}
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.attendance.rate", "Attendance Rate")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {stats.attendanceRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
            >
              <option value="">{t("student.attendance.allYears", "All Years")}</option>
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
            >
              <option value="">{t("student.attendance.allMonths", "All Months")}</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Attendance Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <h2 className="text-xl font-serif text-primary mb-4">
            {t("student.attendance.records", "Attendance Records")}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl surface-elevated animate-pulse" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="rounded-xl surface-elevated p-8 text-center shadow-lg">
              <Calendar className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
              <p className="text-sm text-foreground/70">
                {t(
                  "student.attendance.empty",
                  "No attendance records found for the selected period.",
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record, idx) => {
                const lesson = typeof record.lessonId === "object" ? record.lessonId : null;
                const revisedLesson =
                  record.revisedLessonId && typeof record.revisedLessonId === "object"
                    ? record.revisedLessonId
                    : null;
                const sessionDate = new Date(record.sessionDate);

                return (
                  <motion.div
                    key={record._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="interactive-row flex items-center justify-between rounded-xl surface-elevated p-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getStatusIcon(record.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-primary">
                            {revisedLesson ? revisedLesson.title : lesson?.title || "Unknown Lesson"}
                          </p>
                          {revisedLesson && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                              {t("student.attendance.revised", "Revised")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60">
                          <span>{sessionDate.toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{sessionDate.toLocaleTimeString()}</span>
                          {lesson?.code && (
                            <>
                              <span>•</span>
                              <span>{t("student.attendance.code", "Code")}: {lesson.code}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground/80">
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
