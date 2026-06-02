"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Users, X, Building2, Music } from "lucide-react";
import {
  useEnrollInClassMutation,
  useEnrollInClassWithReceiptMutation,
  useGetPublicClassesQuery,
  type ClassSummary,
} from "@/store/api/classApi";
import { useGetBranchesQuery } from "@/store/api/branchApi";
import type { InstrumentType } from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const paymentMethods = ["Chapa", "Telebirr", "Stripe", "BankTransfer", "Manual", "Other"] as const;

type PaymentMethod = (typeof paymentMethods)[number];

/**
 * High-level UI choice for how the student confirms payment.
 * For now we only support receipt-based confirmation so that
 * EVERY tuition payment has an image/PDF the admin can review.
 */
type PaymentOption = "BankWithReceipt";

const currencyOptions = ["ETB", "USD", "EUR"] as const;

type CurrencyCode = (typeof currencyOptions)[number];

const isCurrencyCode = (code: string): code is CurrencyCode =>
  (currencyOptions as readonly string[]).includes(code);

const resolveCurrency = (code?: string | null): CurrencyCode =>
  code && isCurrencyCode(code) ? code : currencyOptions[0];

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const INSTRUMENTS: InstrumentType[] = [
  "Begena",
  "Masinko",
  "Kirar",
  "Washint",
  "Kebero",
  "Other",
];

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

type EnrollmentForm = {
  amount: string;
  currency: CurrencyCode;
  // high-level option for the student
  paymentOption: PaymentOption;
  // fine-grained fields sent to the API
  paymentMethod: PaymentMethod;
  paymentReference: string;
  note: string;
  fullName: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  occupation: string;
  city: string;
  address: string;
  learningGoals: string;
  notesForTeacher: string;
  preferredTime: string;
  // Student conversion fields
  learningType: 'physical' | 'online';
  branchId: string;
  instrumentType: InstrumentType;
  programDurationMonths: '3' | '6' | '9';
  preferredLearningDays: DayOfWeek[];
  slotTimes: Record<string, string>;
  registrationStartDate: string;
};

const ETHIOPIA_PHONE_REGEX = /^(?:\+251|0)?(?:9|7)\d{8}$/;
// Capture build-time "now" once outside the component to avoid
// calling impure time APIs during render while still letting us
// compare enrollment deadlines against a reasonable reference.
const BUILD_TIME_NOW = Date.now();

export default function ClassesPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const [instrumentFilter, setInstrumentFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<"beginner" | "advanced" | "">("");
  const { data: classesRaw = [], isLoading: loadingClasses } = useGetPublicClassesQuery(
    instrumentFilter || levelFilter
      ? { instrumentType: instrumentFilter || undefined, level: levelFilter || undefined }
      : undefined,
  );
  const classes = classesRaw;
  const { data: branches = [] } = useGetBranchesQuery();
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [form, setForm] = useState<EnrollmentForm>({
    amount: "",
    currency: currencyOptions[0],
    paymentOption: "BankWithReceipt",
    paymentMethod: "BankTransfer",
    paymentReference: "",
    note: "",
    fullName: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
      occupation: "",
      city: "",
      address: "",
      learningGoals: "",
      notesForTeacher: "",
      preferredTime: "",
      learningType: "online",
    branchId: "",
    instrumentType: "Begena",
    programDurationMonths: "6",
    preferredLearningDays: [],
    slotTimes: {},
    registrationStartDate: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null);
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [enroll, { isLoading: isSubmitting }] = useEnrollInClassMutation();
  const [enrollWithReceipt, { isLoading: isSubmittingWithReceipt }] =
    useEnrollInClassWithReceiptMutation();

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
    const today = new Date().toISOString().split("T")[0];
    setSelectedClass(klass);
    setForm({
      amount: (klass.tuition ?? 0).toString(),
      currency: resolveCurrency(klass.currency ?? undefined),
      paymentOption: "BankWithReceipt",
      paymentMethod: "BankTransfer",
      paymentReference: "",
      note: "",
      fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
      phone: user?.phone ?? "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      occupation: "",
      city: "",
      address: "",
      learningGoals: "",
      notesForTeacher: "",
      preferredTime: "",
      learningType: "online",
      branchId: "",
      instrumentType: (klass.instrumentType ?? "Begena") as InstrumentType,
      programDurationMonths: (klass.durationMonths
        ? String(klass.durationMonths)
        : "6") as "3" | "6" | "9",
      preferredLearningDays: [],
      slotTimes: {},
      registrationStartDate: today,
    });
    setReceiptFile(null);
  };

  const handleClose = () => {
    setSelectedClass(null);
    setForm({
      amount: "",
      currency: currencyOptions[0],
      paymentOption: "BankWithReceipt",
      paymentMethod: "BankTransfer",
      paymentReference: "",
      note: "",
      fullName: "",
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      occupation: "",
      city: "",
      address: "",
      learningGoals: "",
      notesForTeacher: "",
      preferredTime: "",
      learningType: "online",
      branchId: "",
      instrumentType: "Begena",
      programDurationMonths: "6",
      preferredLearningDays: [],
      slotTimes: {},
      registrationStartDate: "",
    });
    setReceiptFile(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClass) return;

    // Validate conversion fields
    if (!form.fullName.trim() || !form.phone.trim()) {
      pushToast({
        title: t("classes.modal.validationError", "Missing required fields"),
        description: t("classes.modal.validationErrorDesc", "Full name and phone are required."),
        variant: "error",
      });
      return;
    }
    if (!ETHIOPIA_PHONE_REGEX.test(form.phone.trim())) {
      pushToast({
        title: t("classes.modal.validationError", "Missing required fields"),
        description: t(
          "classes.modal.phoneInvalid",
          "Please enter a valid Ethiopian phone number (e.g. +2519XXXXXXXX or 09XXXXXXXX).",
        ),
        variant: "error",
      });
      return;
    }
    if (form.emergencyContactPhone.trim() && !ETHIOPIA_PHONE_REGEX.test(form.emergencyContactPhone.trim())) {
      pushToast({
        title: t("classes.modal.validationError", "Missing required fields"),
        description: t(
          "classes.modal.emergencyPhoneInvalid",
          "Please enter a valid emergency phone number (e.g. +2519XXXXXXXX or 09XXXXXXXX).",
        ),
        variant: "error",
      });
      return;
    }
    if (form.learningType === "physical" && !form.branchId) {
      pushToast({
        title: t("classes.modal.branchRequired", "Branch required"),
        description: t("classes.modal.branchRequiredDesc", "Please select a branch for physical learning."),
        variant: "error",
      });
      return;
    }
    const expectedDays =
      form.programDurationMonths === "3"
        ? 5
        : form.programDurationMonths === "6"
          ? 3
          : 2;
    if (form.preferredLearningDays.length !== expectedDays) {
      pushToast({
        title: t("classes.modal.daysError", "Incorrect learning days"),
        description: t(
          "classes.modal.daysErrorDesc",
          `Program duration of ${form.programDurationMonths} months requires exactly ${expectedDays} learning days.`,
        ),
        variant: "error",
      });
      return;
    }

    // Each chosen day needs a valid in-hours session time (08:00–18:00 start).
    const timeOk = (hhmm: string) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return false;
      const [h, m] = hhmm.split(":").map(Number);
      const mins = h * 60 + m;
      return mins >= 8 * 60 && mins <= 18 * 60;
    };
    if (
      form.preferredLearningDays.some(
        (d) => !form.slotTimes[d] || !timeOk(form.slotTimes[d]),
      )
    ) {
      pushToast({
        title: t("classes.modal.timesError", "Session times required"),
        description: t(
          "classes.modal.timesErrorDesc",
          "Choose a time (08:00–18:00) for each selected day.",
        ),
        variant: "error",
      });
      return;
    }

    const isPaidClass = (selectedClass.tuition ?? 0) > 0;

    // For paid cohorts we ALWAYS require a receipt image/PDF that admins can review.
    if (isPaidClass && !receiptFile) {
      pushToast({
        title: t("classes.modal.receiptRequiredTitle", "Receipt required"),
        description: t(
          "classes.modal.receiptRequiredDesc",
          "Please upload a clear photo or PDF of your payment receipt so an admin can verify your tuition.",
        ),
        variant: "error",
      });
      return;
    }

    const basePayload = {
      amount: Number(form.amount) || 0,
      currency: form.currency,
      paymentMethod: "BankTransfer" as PaymentMethod,
      // Reference is optional and can hold CHAPA / Telebirr / bank reference text.
      paymentReference: form.paymentReference.trim() || undefined,
      note: form.note?.trim() || undefined,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      occupation: form.occupation.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      learningGoals: form.learningGoals.trim() || undefined,
      notesForTeacher: form.notesForTeacher.trim() || undefined,
      preferredTime: form.preferredTime.trim() || undefined,
      learningType: form.learningType,
      branchId: form.learningType === "physical" ? form.branchId : undefined,
      instrumentType: form.instrumentType,
      programDurationMonths: Number(form.programDurationMonths) as 3 | 6 | 9,
      preferredLearningDays: form.preferredLearningDays,
      timeSlots: form.preferredLearningDays.map((day) => ({
        day,
        startTime: form.slotTimes[day],
      })),
      registrationStartDate: form.registrationStartDate,
    };
    try {
      if (isPaidClass && receiptFile) {
        // Paid cohort: always go through the receipt-based path so a PaymentRequest
        // is created for admins to review and approve.
        await enrollWithReceipt({
          classId: selectedClass._id,
          payload: basePayload,
          receipt: receiptFile,
        }).unwrap();

        pushToast({
          title: t("classes.modal.successTitlePending", "Enrollment submitted"),
          description: t(
            "classes.modal.successDescriptionPending",
            "Your enrollment request and receipt have been submitted. An admin will review your payment and convert you to a student soon.",
          ),
          variant: "success",
        });
      } else {
        // Free cohort: no payment verification required; enroll immediately.
        await enroll({
          classId: selectedClass._id,
          payload: basePayload,
        }).unwrap();

        pushToast({
          title: t("classes.modal.successTitle", "Enrollment received"),
          description: t(
            "classes.modal.successDescription",
            "You can now access this class from your dashboard.",
          ),
          variant: "success",
        });
      }
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
  const isInstructor = user?.role === "Teacher";
  const isAdmin = user?.role === "Admin";

  const formatCurrency = (amount?: number | null, currency?: string | null) => {
    if (!amount || amount <= 0) {
      return t("classes.tuition.free", "Free cohort");
    }
    const resolvedCurrency = currency ?? "ETB";
    try {
      return new Intl.NumberFormat("en-US", {
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

        {loadingClasses ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-3xl surface-elevated shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-3xl surface-elevated p-10 text-center text-sm text-foreground/70 shadow-lg">
            {t(
              "classes.empty",
              "No classes are currently available. Please check again soon.",
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">
                {t("classes.filters", "Filter")}
              </h2>
              <select
                value={instrumentFilter}
                onChange={(e) => setInstrumentFilter(e.target.value)}
                className="rounded-2xl border border-border bg-surface-elevated px-4 py-2 text-sm text-foreground outline-none transition focus:border-secondary"
              >
                <option value="">{t("classes.filters.allInstruments", "All instruments")}</option>
                {INSTRUMENTS.map((inst) => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter((e.target.value || "") as "beginner" | "advanced" | "")}
                className="rounded-2xl border border-border bg-surface-elevated px-4 py-2 text-sm text-foreground outline-none transition focus:border-secondary"
              >
                <option value="">{t("classes.filters.allLevels", "All levels")}</option>
                <option value="beginner">{t("classes.filters.beginner", "Beginner")}</option>
                <option value="advanced">{t("classes.filters.advanced", "Advanced")}</option>
              </select>
            </div>
            <div className="space-y-3">
              <h2 className="text-left text-sm font-semibold uppercase tracking-[0.3em] text-secondary">
                {t("classes.cohorts.heading", "Available classes")}
              </h2>
              <div className="grid gap-6 md:grid-cols-1">
                  {classes.map((klass) => {
              const enrollmentCount = klass.enrollmentCount ?? 0;
              const status = klass.myEnrollment?.status ?? null;
              const deadline = klass.enrollmentDeadline
                ? new Date(klass.enrollmentDeadline)
                : null;
              const isClosed =
                deadline !== null && deadline.getTime() < BUILD_TIME_NOW;
              return (
                <motion.article
                  key={klass._id}
                  whileHover={{ y: -4 }}
                  className="flex flex-col rounded-[28px] surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-serif text-primary">
                      {klass.title}
                    </h2>
                    {renderStatusChip(status)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-semibold text-secondary">
                      {klass.instrumentType}
                    </span>
                    {klass.durationMonths && (
                      <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                        {klass.durationMonths}{" "}
                        {t("classes.monthsShort", "mo")}
                        {klass.sessionsPerWeek
                          ? ` · ${klass.sessionsPerWeek}${t("classes.perWeekShort", "/wk")}`
                          : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground/70">
                    {klass.description ??
                      t("classes.description.placeholder", "Details coming soon.")}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-foreground/80">
                    <div className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      <span>
                        {t("classes.enrolled", "Enrolled")}: {enrollmentCount}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-secondary" />
                      <span>
                        {t("classes.deadline", "Enroll by")}:{" "}
                        {deadline
                          ? isClosed
                            ? t("classes.deadlineClosed", "Closed")
                            : deadline.toLocaleDateString("en-US")
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
                        disabled={(status === "active" || status === "pending") || isClosed}
                      >
                        {status === "active"
                          ? t("classes.enrolled", "Already enrolled")
                          : status === "pending"
                            ? t("classes.pending", "Enrollment pending")
                            : isClosed
                              ? t("classes.deadlineClosed", "Closed")
                              : t("classes.enrollCta", "Enroll now")}
                      </button>
                    )}
                    <Link
                      href={user?.userType === "student" ? "/student" : "/dashboard"}
                      className="inline-flex items-center justify-center rounded-full surface-elevated px-4 py-2 text-foreground transition hover:shadow-lg"
                    >
                      {t("classes.dashboardCta", "View dashboard")}
                    </Link>
                  </div>
                </motion.article>
              );
            })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="fixed inset-0 z-9999 flex items-end justify-center bg-black/70 backdrop-blur-sm px-0 py-0 sm:items-center sm:px-4 sm:py-8" onClick={handleClose}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10000 w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface-elevated p-4 shadow-[0_40px_120px_rgba(0,0,0,0.8)] sm:max-w-2xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
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
              {/* Payment option selection (single receipt-based option for now) */}
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      paymentOption: "BankWithReceipt",
                    }))
                  }
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold transition shadow-sm cursor-pointer ${
                    form.paymentOption === "BankWithReceipt"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-surface-elevated text-foreground/80"
                  }`}
                >
                  {t(
                    "classes.modal.option.bankWithReceipt",
                    "Bank transfer + upload receipt (recommended)",
                  )}
                </button>
              </div>

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
                    className="mt-2 w-full cursor-text rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.currency", "Currency")}
                  <select
                    value={form.currency}
                    onChange={(e) => {
                      const nextCurrency = resolveCurrency(e.target.value);
                      setForm((prev) => ({ ...prev, currency: nextCurrency }));
                    }}
                    className="mt-2 w-full cursor-pointer rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Upload receipt (required for paid cohorts) */}
              {form.paymentOption === "BankWithReceipt" && (
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.receipt", "Upload payment receipt")}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setReceiptFile(file);
                    }}
                    className="mt-2 w-full cursor-pointer text-xs text-foreground/80"
                  />
                </label>
              )}

              {/* Optional reference for CHAPA / Telebirr / bank transfer number */}
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("classes.modal.paymentReference", "Transaction reference (optional)")}
                <input
                  type="text"
                  value={form.paymentReference}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentReference: e.target.value,
                    }))
                  }
                  className="mt-2 w-full cursor-text rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  placeholder={t("classes.modal.referencePlaceholder", "e.g. CHAPA-XXXX / Telebirr / bank ref")}
                />
              </label>

              {/* Student Conversion Section */}
              <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("classes.modal.studentInfo", "Student Information (for conversion to student account)")}
                </p>

                {/* Learning Type */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("classes.modal.learningType", "Learning Type")} *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        form.learningType === "online"
                          ? "border-secondary bg-secondary/10 text-secondary shadow-sm ring-2 ring-secondary/20"
                          : "border-border bg-background/60 hover:border-secondary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="learningType"
                        value="online"
                        checked={form.learningType === "online"}
                        onChange={(e) =>
                          setForm({ ...form, learningType: e.target.value as "physical" | "online" })
                        }
                        className="sr-only"
                      />
                      {form.learningType === "online" && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] text-primary-foreground">
                          ✓
                        </span>
                      )}
                      <span>{t("classes.modal.online", "Online")}</span>
                    </label>
                    <label
                      className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        form.learningType === "physical"
                          ? "border-secondary bg-secondary/10 text-secondary shadow-sm ring-2 ring-secondary/20"
                          : "border-border bg-background/60 hover:border-secondary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="learningType"
                        value="physical"
                        checked={form.learningType === "physical"}
                        onChange={(e) =>
                          setForm({ ...form, learningType: e.target.value as "physical" | "online" })
                        }
                        className="sr-only"
                      />
                      {form.learningType === "physical" && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] text-primary-foreground">
                          ✓
                        </span>
                      )}
                      <span>{t("classes.modal.physical", "Physical")}</span>
                    </label>
                  </div>
                </div>

                {/* Branch (only for physical) */}
                {form.learningType === "physical" && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                      <Building2 className="h-4 w-4" />
                      {t("classes.modal.branch", "Branch")} *
                    </label>
                    <select
                      required
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      className="mt-2 w-full cursor-pointer rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                    >
                      <option value="">{t("classes.modal.selectBranch", "Select a branch")}</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} - {branch.city || branch.region}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Instrument Type */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                    <Music className="h-4 w-4" />
                    {t("classes.modal.instrument", "Instrument")} *
                  </label>
                  <select
                    required
                    value={form.instrumentType}
                    onChange={(e) =>
                      setForm({ ...form, instrumentType: e.target.value as InstrumentType })
                    }
                    className="mt-2 w-full cursor-pointer rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  >
                    {INSTRUMENTS.map((instrument) => (
                      <option key={instrument} value={instrument}>
                        {instrument}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program Duration */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("classes.modal.programDuration", "Program Duration")} *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["3", "6", "9"] as const).map((duration) => {
                      const isSelected = form.programDurationMonths === duration;
                      return (
                        <label
                          key={duration}
                          className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-sm transition ${
                            isSelected
                              ? "border-secondary bg-secondary/10 text-secondary shadow-sm ring-2 ring-secondary/20"
                              : "border-border bg-background/60 hover:border-secondary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="programDurationMonths"
                            value={duration}
                            checked={isSelected}
                            disabled={!!selectedClass?.durationMonths}
                            onChange={(e) =>
                              setForm({ ...form, programDurationMonths: e.target.value as "3" | "6" | "9", preferredLearningDays: [], slotTimes: {} })
                            }
                            className="sr-only"
                          />
                          {isSelected && (
                            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-primary-foreground">
                              ✓
                            </span>
                          )}
                          <span className="text-lg font-bold">{duration}</span>
                          <span className="text-xs">{t("classes.modal.months", "months")}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred Learning Days */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("classes.modal.learningDays", "Learning Days")} *
                  <span className="ml-2 text-xs font-normal text-foreground/60">
                    ({form.programDurationMonths === "3" ? "5 days" : form.programDurationMonths === "6" ? "3 days" : "2 days"} {t("classes.modal.daysRequired", "required")})
                  </span>
                  </label>
                {(() => {
                  const expectedDays =
                    form.programDurationMonths === "3"
                      ? 5
                      : form.programDurationMonths === "6"
                        ? 3
                        : 2;
                  return (
                    <p className="mb-2 text-xs text-foreground/60">
                      {t(
                        "classes.modal.daysSelected",
                        `${form.preferredLearningDays.length} of ${expectedDays} days selected`,
                      )}
                    </p>
                  );
                })()}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = form.preferredLearningDays.includes(day.value);
                      const expectedDays =
                        form.programDurationMonths === "3"
                          ? 5
                          : form.programDurationMonths === "6"
                            ? 3
                            : 2;
                      const atLimit = !isSelected && form.preferredLearningDays.length >= expectedDays;
                      return (
                        <label
                          key={day.value}
                          className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            isSelected
                              ? "border-secondary bg-secondary/10 text-secondary shadow-sm ring-2 ring-secondary/20"
                              : atLimit
                                ? "border-border/60 bg-background/40 text-foreground/40"
                                : "border-border bg-background/60 hover:border-secondary/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (form.preferredLearningDays.length >= expectedDays) {
                                  pushToast({
                                    title: t("classes.modal.daysError", "Incorrect learning days"),
                                    description: t(
                                      "classes.modal.daysErrorDesc",
                                      `Program duration of ${form.programDurationMonths} months requires exactly ${expectedDays} learning days.`,
                                    ),
                                    variant: "error",
                                  });
                                  return;
                                }
                                setForm({
                                  ...form,
                                  preferredLearningDays: [...form.preferredLearningDays, day.value],
                                  slotTimes: { ...form.slotTimes, [day.value]: form.slotTimes[day.value] ?? "12:00" },
                                });
                                return;
                              }
                              {
                                const nextTimes = { ...form.slotTimes };
                                delete nextTimes[day.value];
                                setForm({
                                  ...form,
                                  preferredLearningDays: form.preferredLearningDays.filter((d) => d !== day.value),
                                  slotTimes: nextTimes,
                                });
                              }
                            }}
                            className="sr-only"
                          />
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] text-primary-foreground">
                              ✓
                            </span>
                          )}
                          <span>{day.label.slice(0, 3)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Per-day session time (each session is 1.5h, 08:00–18:00 start) */}
                {form.preferredLearningDays.length > 0 && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                      {t("classes.modal.sessionTimes", "Session Time per Day")} *
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {DAYS_OF_WEEK.filter((d) =>
                        form.preferredLearningDays.includes(d.value),
                      ).map((d) => (
                        <div
                          key={d.value}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-foreground">{d.label}</span>
                          <input
                            type="time"
                            min="08:00"
                            max="18:00"
                            step={1800}
                            value={form.slotTimes[d.value] ?? ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                slotTimes: { ...form.slotTimes, [d.value]: e.target.value },
                              })
                            }
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional time notes (free text) */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("classes.modal.preferredTime", "Additional time notes")}
                  </label>
                  <input
                    type="text"
                    value={form.preferredTime}
                    onChange={(e) =>
                      setForm({ ...form, preferredTime: e.target.value })
                    }
                    placeholder={t("classes.modal.preferredTimePlaceholder", "e.g. 12:00 PM LT")}
                    className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                {/* Registration Start Date */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("classes.modal.startDate", "Registration Start Date")} *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.registrationStartDate}
                    onChange={(e) =>
                      setForm({ ...form, registrationStartDate: e.target.value })
                    }
                    className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
              </div>

              {/* Student intake fields */}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.fullName", "Full name")}
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.phone", "Phone number")}
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    onBlur={() => {
                      const v = form.phone.trim();
                      setPhoneError(v && !ETHIOPIA_PHONE_REGEX.test(v) ? "invalid" : null);
                    }}
                    className={`mt-2 w-full cursor-text rounded-2xl border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm ${
                      phoneError ? "border-red-500/60" : "border-border"
                    }`}
                    placeholder={t("classes.modal.phonePlaceholder", "e.g. +2519XXXXXXXX or 09XXXXXXXX")}
                  />
                  {phoneError && (
                    <p className="mt-1 text-xs text-red-600">
                      {t(
                        "classes.modal.phoneInvalid",
                        "Please enter a valid Ethiopian phone number (e.g. +2519XXXXXXXX or 09XXXXXXXX).",
                      )}
                    </p>
                  )}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t(
                    "classes.modal.emergencyContactName",
                    "Emergency contact name",
                  )}
                  <input
                    type="text"
                    value={form.emergencyContactName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContactName: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t(
                    "classes.modal.emergencyContactPhone",
                    "Emergency contact phone",
                  )}
                  <input
                    type="tel"
                    value={form.emergencyContactPhone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emergencyContactPhone: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      const v = form.emergencyContactPhone.trim();
                      setEmergencyPhoneError(v && !ETHIOPIA_PHONE_REGEX.test(v) ? "invalid" : null);
                    }}
                    className={`mt-2 w-full cursor-text rounded-2xl border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm ${
                      emergencyPhoneError ? "border-red-500/60" : "border-border"
                    }`}
                    placeholder={t("classes.modal.phonePlaceholder", "e.g. +2519XXXXXXXX or 09XXXXXXXX")}
                  />
                  {emergencyPhoneError && (
                    <p className="mt-1 text-xs text-red-600">
                      {t(
                        "classes.modal.emergencyPhoneInvalid",
                        "Please enter a valid emergency phone number (e.g. +2519XXXXXXXX or 09XXXXXXXX).",
                      )}
                    </p>
                  )}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.occupation", "Occupation / role")}
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        occupation: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("classes.modal.city", "City")}
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  />
                </label>
              </div>

              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("classes.modal.address", "Address / location")}
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t(
                  "classes.modal.learningGoals",
                  "What are your learning goals?",
                )}
                <textarea
                  rows={2}
                  value={form.learningGoals}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      learningGoals: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                    "Additional context for the admin/teacher.",
                  )}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting || isSubmittingWithReceipt}
                className="w-full cursor-pointer rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:brightness-95 disabled:opacity-60"
              >
                {isSubmitting || isSubmittingWithReceipt
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

