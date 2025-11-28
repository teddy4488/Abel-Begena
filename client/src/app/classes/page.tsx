"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Users, X } from "lucide-react";
import {
  useEnrollInClassMutation,
  useGetPublicClassesQuery,
  type ClassSummary,
} from "@/store/api/classApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import Link from "next/link";

const paymentMethods = [
  "Chapa",
  "Telebirr",
  "Stripe",
  "BankTransfer",
  "Manual",
  "Other",
] as const;

const currencyOptions = ["ETB", "USD", "EUR"];

export default function ClassesPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { data: classes, isLoading } = useGetPublicClassesQuery();
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [form, setForm] = useState({
    amount: "",
    paymentMethod: paymentMethods[0],
    paymentReference: "",
    note: "",
    currency: currencyOptions[0],
  });
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [enroll, { isLoading: isSubmitting }] = useEnrollInClassMutation();

  const handleOpen = (klass: ClassSummary) => {
    if (!isLoggedIn) {
      pushToast({
        title: t(
          "classes.modal.loginRequired",
          "Please sign in to complete enrollment.",
        ),
        variant: "error",
      });
      router.push("/register");
      return;
    }
    setSelectedClass(klass);
    setForm({
      amount: (klass.tuition ?? 0).toString(),
      paymentMethod: paymentMethods[0],
      paymentReference: "",
      note: "",
      currency: klass.currency ?? currencyOptions[0],
    });
  };

  const handleClose = () => {
    setSelectedClass(null);
    setForm({
      amount: "",
      paymentMethod: paymentMethods[0],
      paymentReference: "",
      note: "",
      currency: currencyOptions[0],
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClass) return;
    try {
      await enroll({
        classId: selectedClass._id,
        payload: {
          amount: Number(form.amount) || 0,
          currency: form.currency,
          paymentMethod: form.paymentMethod,
          paymentReference: form.paymentReference.trim(),
          note: form.note?.trim() || undefined,
        },
      }).unwrap();
      pushToast({
        title: t("classes.modal.successTitle", "Enrollment received"),
        description: t(
          "classes.modal.successDescription",
          "You can now access this class from your dashboard.",
        ),
        variant: "success",
      });
      handleClose();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("classes.modal.errorTitle", "Unable to enroll"),
        description: t(
          "classes.modal.errorDescription",
          "Please verify your payment details and try again.",
        ),
        variant: "error",
      });
    }
  };

  const formattedClasses = useMemo(() => classes ?? [], [classes]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setNow(Date.now());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [formattedClasses.length]);
  const isInstructor = user?.role === "Teacher";
  const isAdmin = user?.role === "Admin";

  const formatCurrency = (amount?: number | null, currency?: string | null) => {
    if (!amount || amount <= 0) {
      return t("classes.tuition.free", "Free cohort");
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
  };

  const renderStatusChip = (status?: string | null) => {
    if (!status) return null;
    const palette: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-500",
      pending: "bg-amber-500/15 text-amber-600",
      withdrawn: "bg-rose-500/15 text-rose-500",
    };
    const label = t(`classes.status.${status}`, status);
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${palette[status] ?? "bg-secondary/20 text-secondary"}`}
      >
        {label}
      </span>
    );
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-secondary">
            {t("classes.kicker", "Cohorts & Conservatory")}
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            {t("classes.title", "Choose your sacred study path")}
          </h1>
          <p className="mx-auto max-w-3xl text-sm text-foreground/70">
            {t(
              "classes.subtitle",
              "Enroll in online and in-person Begena, Masinko, and liturgical studies. Submit your payment reference to reserve a seat instantly.",
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-border bg-surface">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : formattedClasses.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-foreground/70">
            {t(
              "classes.empty",
              "New cohorts are being prepared. Please check again soon.",
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {formattedClasses.map((klass) => {
              const seatsTaken = klass.enrollmentCount ?? 0;
              const capacityLabel =
                klass.capacity && klass.capacity > 0
                  ? `${Math.min(seatsTaken, klass.capacity)} / ${klass.capacity}`
                  : `${seatsTaken}`;
              const status = klass.myEnrollment?.status ?? null;
              const deadline = klass.enrollmentDeadline
                ? new Date(klass.enrollmentDeadline)
                : null;
              const isClosed = deadline !== null && deadline.getTime() < now;
              return (
                <motion.article
                  key={klass._id}
                  whileHover={{ y: -4 }}
                  className="flex flex-col rounded-[28px] border border-border bg-surface/90 p-6 shadow-[0_25px_60px_rgba(34,6,9,0.08)] backdrop-blur"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-serif text-primary">
                      {klass.title}
                    </h2>
                    {renderStatusChip(status)}
                  </div>
                  <p className="mt-2 text-sm text-foreground/70">
                    {klass.description ??
                      t("classes.description.placeholder", "Details coming soon.")}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-foreground/80">
                    <div className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      <span>
                        {t("classes.capacity", "Capacity")}: {capacityLabel}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-secondary" />
                      <span>
                        {t("classes.deadline", "Enroll by")}:{" "}
                        {deadline
                          ? isClosed
                            ? t("classes.deadlineClosed", "Closed")
                            : deadline.toLocaleDateString()
                          : t("classes.deadlineRolling", "Rolling admission")}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 text-lg font-semibold text-primary">
                      {formatCurrency(klass.tuition, klass.currency)}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 text-sm">
                    {isInstructor || isAdmin ? (
                      <Link
                        href={isAdmin ? "/admin/classes" : "/teacher"}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-secondary px-4 py-2 text-secondary transition hover:bg-(--color-secondary-soft)"
                      >
                        {t("classes.manageCta", "Open console")}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpen(klass)}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                        disabled={status === "active" || isClosed}
                      >
                        {status === "active"
                          ? t("classes.enrolled", "Already enrolled")
                          : isClosed
                            ? t("classes.deadlineClosed", "Closed")
                            : t("classes.enrollCta", "Enroll now")}
                      </button>
                    )}
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-foreground transition hover:bg-(--color-secondary-soft)"
                    >
                      {t("classes.dashboardCta", "View dashboard")}
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur">
          <div className="absolute inset-0" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-border bg-surface/95 p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("classes.modal.kicker", "Complete enrollment")}
                </p>
                <h3 className="text-2xl font-serif text-primary">
                  {selectedClass.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-foreground/70 transition hover:bg-secondary/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.amount", "Amount")}
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.currency", "Currency")}
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, currency: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("classes.modal.paymentMethod", "Payment method")}
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value as (typeof paymentMethods)[number],
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("classes.modal.paymentReference", "Transaction reference")}
                <input
                  type="text"
                  required
                  value={form.paymentReference}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentReference: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  placeholder="CHAPA-XXXX"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("classes.modal.note", "Notes (optional)")}
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  placeholder={t(
                    "classes.modal.notePlaceholder",
                    "Include phone number or Telebirr sender name.",
                  )}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:brightness-95 disabled:opacity-60"
              >
                {isSubmitting
                  ? t("classes.modal.submitting", "Submitting...")
                  : t("classes.modal.submit", "Confirm enrollment")}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </section>
  );
}

