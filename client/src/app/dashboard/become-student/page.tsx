"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetBranchesQuery } from "@/store/api/branchApi";
import { useGetPublicClassesQuery, useEnrollInClassWithReceiptMutation } from "@/store/api/classApi";
import { InstrumentType } from "@/store/api/storeApi";
import { Loader2, Calendar, Clock, MapPin, Music, GraduationCap, User, Phone, Home, Briefcase, Users } from "lucide-react";
// PasswordInput not needed in this form

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const INSTRUMENTS: { value: InstrumentType; label: string }[] = [
  { value: 'Begena', label: 'Begena' },
  { value: 'Masinko', label: 'Masinko' },
  { value: 'Kebero', label: 'Kebero' },
  { value: 'Other', label: 'Other' },
];

const PACKAGES = [
  { months: 3, daysPerWeek: 5, label: '3 Months (5 days/week)' },
  { months: 6, daysPerWeek: 3, label: '6 Months (3 days/week)' },
  { months: 9, daysPerWeek: 2, label: '9 Months (2 days/week)' },
];

export default function BecomeStudentPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { data: branches = [] } = useGetBranchesQuery();
  const { data: publicClasses = [] } = useGetPublicClassesQuery();
  const [enrollWithReceipt, { isLoading: isCreatingPayment }] = useEnrollInClassWithReceiptMutation();

  const [form, setForm] = useState({
    // Student info
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
    instrumentType: "" as InstrumentType | "",
    learningType: "online" as "online" | "physical",
    branchId: "",
    programDurationMonths: 6 as 3 | 6 | 9,
    preferredLearningDays: [] as DayOfWeek[],
    slotTimes: {} as Record<string, string>,
    preferredSchedule: "",
    registrationStartDate: new Date().toISOString().split('T')[0],
    
    // Personal info
    phone: user?.phone || "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    occupation: "",
    city: "",
    address: "",
    
    // Payment
    amount: 0,
    currency: "ETB",
    paymentMethod: "BankTransfer",
    paymentReference: "",
    note: "",
    // Class enrollment (required for enrollment flow)
    classId: "",
    receiptFile: null as File | null,
  });

  // The selected class (package) drives the duration in the package model.
  const selectedClass = useMemo(
    () => publicClasses.find((c) => c._id === form.classId),
    [publicClasses, form.classId],
  );
  const effectiveDuration = (selectedClass?.durationMonths ??
    form.programDurationMonths) as 3 | 6 | 9;

  const expectedDays = useMemo(() => {
    return effectiveDuration === 3 ? 5 : effectiveDuration === 6 ? 3 : 2;
  }, [effectiveDuration]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  // When a class with a fixed duration is picked, sync the package + reset slots.
  useEffect(() => {
    if (selectedClass?.durationMonths) {
      setForm((prev) =>
        prev.programDurationMonths === selectedClass.durationMonths
          ? prev
          : {
              ...prev,
              programDurationMonths: selectedClass.durationMonths as 3 | 6 | 9,
              preferredLearningDays: [],
              slotTimes: {},
            },
      );
    }
  }, [selectedClass?.durationMonths]);

  const handleDayToggle = (day: DayOfWeek) => {
    if (form.preferredLearningDays.includes(day)) {
      setForm(prev => {
        const nextTimes = { ...prev.slotTimes };
        delete nextTimes[day];
        return {
          ...prev,
          preferredLearningDays: prev.preferredLearningDays.filter(d => d !== day),
          slotTimes: nextTimes,
        };
      });
    } else {
      if (form.preferredLearningDays.length < expectedDays) {
        setForm(prev => ({
          ...prev,
          preferredLearningDays: [...prev.preferredLearningDays, day],
          slotTimes: { ...prev.slotTimes, [day]: prev.slotTimes[day] ?? "12:00" },
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn || !user) {
      pushToast({
        title: t("becomeStudent.error", "Authentication required"),
        description: t("becomeStudent.loginRequired", "Please log in to become a student"),
        variant: "error",
      });
      router.push("/login");
      return;
    }

    // Validation
    if (!form.fullName.trim()) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.fullNameRequired", "Full name is required"),
        variant: "error",
      });
      return;
    }

    if (!form.instrumentType) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.instrumentRequired", "Please select an instrument"),
        variant: "error",
      });
      return;
    }

    if (form.learningType === "physical" && !form.branchId) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.branchRequired", "Please select a branch for physical learning"),
        variant: "error",
      });
      return;
    }

    if (form.preferredLearningDays.length !== expectedDays) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.daysRequired", `Please select exactly ${expectedDays} learning days`),
        variant: "error",
      });
      return;
    }

    // Every chosen day needs a valid time within operating hours (08:00–18:00 start).
    const timeOk = (hhmm: string) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return false;
      const [h, m] = hhmm.split(":").map(Number);
      const mins = h * 60 + m;
      return mins >= 8 * 60 && mins <= 18 * 60;
    };
    const missingOrInvalid = form.preferredLearningDays.some(
      (d) => !form.slotTimes[d] || !timeOk(form.slotTimes[d]),
    );
    if (missingOrInvalid) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t(
          "becomeStudent.timesRequired",
          "Choose a time (08:00–18:00) for each selected day.",
        ),
        variant: "error",
      });
      return;
    }

    if (!form.paymentReference.trim()) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.paymentRequired", "Payment reference is required"),
        variant: "error",
      });
      return;
    }

    if (!form.classId) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.classRequired", "Please select a class to enroll in"),
        variant: "error",
      });
      return;
    }

    if (!form.receiptFile) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.receiptRequired", "Please upload your payment receipt"),
        variant: "error",
      });
      return;
    }

    try {
      // Enroll in class with receipt; backend creates enrollment + payment request (type: enrollment) with conversionData
      const payload = {
        amount: form.amount,
        currency: form.currency,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        note: form.note || undefined,
        fullName: form.fullName,
        phone: form.phone || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        occupation: form.occupation || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        preferredSchedule: form.preferredSchedule || undefined,
        learningType: form.learningType,
        branchId: form.learningType === "physical" ? form.branchId : undefined,
        instrumentType: form.instrumentType,
        programDurationMonths: effectiveDuration,
        preferredLearningDays: form.preferredLearningDays,
        timeSlots: form.preferredLearningDays.map((day) => ({
          day,
          startTime: form.slotTimes[day],
        })),
        registrationStartDate: form.registrationStartDate,
      };

      await enrollWithReceipt({
        classId: form.classId,
        payload,
        receipt: form.receiptFile,
      }).unwrap();

      pushToast({
        title: t("becomeStudent.submitted", "Application submitted"),
        description: t(
          "becomeStudent.pendingReview",
          "Your enrollment has been submitted. An admin will review your payment receipt and complete your registration."
        ),
        variant: "success",
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === "object" && "data" in err && err.data && typeof err.data === "object" && "message" in err.data && typeof (err.data as { message: unknown }).message === "string"
          ? (err.data as { message: string }).message
          : t("becomeStudent.errorDesc", "Please check your information and try again");
      pushToast({
        title: t("becomeStudent.error", "Unable to submit application"),
        description: message,
        variant: "error",
      });
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-3xl bg-surface-elevated p-6 shadow-lg sm:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
              <GraduationCap className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("becomeStudent.kicker", "Student Registration")}
              </p>
              <h1 className="text-2xl font-serif text-primary sm:text-3xl md:text-4xl relative inline-block">
                {t("becomeStudent.title", "Become a Student")}
                <span className="absolute -top-1 -right-6 text-secondary/15 text-xl sm:text-2xl">✝</span>
              </h1>
            </div>
          </div>
          <p className="text-sm text-foreground/75">
            {t(
              "becomeStudent.description",
              "Fill out the form below to register as a student. After payment verification, you'll be migrated to the student system."
            )}
          </p>
        </motion.header>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl bg-surface-elevated p-6 shadow-lg sm:p-8"
        >
          {/* Class selection (enrollment flow) */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
              <GraduationCap className="mr-2 inline h-4 w-4" />
              {t("becomeStudent.class", "Class to enroll in")} *
            </label>
            <select
              value={form.classId}
              onChange={(e) => setForm(prev => ({ ...prev, classId: e.target.value }))}
              className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
              required
            >
              <option value="">{t("becomeStudent.selectClass", "Select a class")}</option>
              {publicClasses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} {c.tuition != null && c.tuition > 0 ? `(${c.currency ?? "ETB"} ${c.tuition.toLocaleString()})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Instrument & Learning Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                <Music className="mr-2 inline h-4 w-4" />
                {t("becomeStudent.instrument", "Instrument")} *
              </label>
              <select
                value={form.instrumentType}
                onChange={(e) => setForm(prev => ({ ...prev, instrumentType: e.target.value as InstrumentType }))}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                required
              >
                <option value="">{t("becomeStudent.selectInstrument", "Select instrument")}</option>
                {INSTRUMENTS.map(inst => (
                  <option key={inst.value} value={inst.value}>{inst.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                <User className="mr-2 inline h-4 w-4" />
                {t("becomeStudent.learningType", "Learning Type")} *
              </label>
              <select
                value={form.learningType}
                onChange={(e) => setForm(prev => ({ ...prev, learningType: e.target.value as "online" | "physical" }))}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                required
              >
                <option value="online">{t("becomeStudent.online", "Online")}</option>
                <option value="physical">{t("becomeStudent.physical", "Physical")}</option>
              </select>
            </div>
          </div>

          {/* Branch (if physical) */}
          {form.learningType === "physical" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                <MapPin className="mr-2 inline h-4 w-4" />
                {t("becomeStudent.branch", "Branch")} *
              </label>
              <select
                value={form.branchId}
                onChange={(e) => setForm(prev => ({ ...prev, branchId: e.target.value }))}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                required={form.learningType === "physical"}
              >
                <option value="">{t("becomeStudent.selectBranch", "Select branch")}</option>
                {branches.filter(b => b.isActive).map(branch => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Package Selection — locked to the chosen class's duration when set. */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
              <Calendar className="mr-2 inline h-4 w-4" />
              {t("becomeStudent.package", "Program Package")} *
            </label>
            {selectedClass?.durationMonths && (
              <p className="mb-2 text-xs text-foreground/60">
                {t(
                  "becomeStudent.packageFromClass",
                  "Duration is set by the selected package class.",
                )}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {PACKAGES.map(pkg => {
                const lockedByClass = !!selectedClass?.durationMonths;
                const isActive = effectiveDuration === pkg.months;
                return (
                  <button
                    key={pkg.months}
                    type="button"
                    disabled={lockedByClass}
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        programDurationMonths: pkg.months as 3 | 6 | 9,
                        preferredLearningDays: [],
                        slotTimes: {},
                      }));
                    }}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      isActive
                        ? "border-secondary bg-secondary/10 shadow-md"
                        : "border-border bg-background/50 hover:border-secondary/50"
                    } ${lockedByClass && !isActive ? "opacity-40" : ""} ${lockedByClass ? "cursor-not-allowed" : ""}`}
                  >
                    <p className="text-sm font-semibold text-primary">{pkg.label}</p>
                    <p className="mt-1 text-xs text-foreground/60">
                      {t("becomeStudent.daysPerWeek", `${pkg.daysPerWeek} days per week`)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Learning Days */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
              <Clock className="mr-2 inline h-4 w-4" />
              {t("becomeStudent.preferredDays", "Preferred Learning Days")} * ({form.preferredLearningDays.length}/{expectedDays})
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAYS_OF_WEEK.map(day => {
                const isSelected = form.preferredLearningDays.includes(day.value);
                const isDisabled = !isSelected && form.preferredLearningDays.length >= expectedDays;
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    disabled={isDisabled}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border-secondary bg-secondary/20 text-secondary shadow-sm"
                        : isDisabled
                          ? "border-border/30 bg-background/30 text-foreground/30 cursor-not-allowed"
                          : "border-border bg-background/50 text-foreground hover:border-secondary/50"
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-day session time (each session is 1.5h, 08:00–18:00 start) */}
          {form.preferredLearningDays.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                <Clock className="mr-2 inline h-4 w-4" />
                {t("becomeStudent.sessionTimes", "Session Time per Day")} *
              </label>
              <p className="mb-2 text-xs text-foreground/60">
                {t(
                  "becomeStudent.sessionTimesHint",
                  "Each session is 1.5 hours. Choose a start time between 08:00 and 18:00.",
                )}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DAYS_OF_WEEK.filter((d) =>
                  form.preferredLearningDays.includes(d.value),
                ).map((d) => (
                  <div
                    key={d.value}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">{d.label}</span>
                    <input
                      type="time"
                      min="08:00"
                      max="18:00"
                      step={1800}
                      value={form.slotTimes[d.value] ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          slotTimes: { ...prev.slotTimes, [d.value]: e.target.value },
                        }))
                      }
                      className="rounded-lg bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional time notes (free text) */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
              <Clock className="mr-2 inline h-4 w-4" />
              {t("becomeStudent.timePreferences", "Additional Time Notes")}
            </label>
            <textarea
              value={form.preferredSchedule}
              onChange={(e) => setForm(prev => ({ ...prev, preferredSchedule: e.target.value }))}
              placeholder={t("becomeStudent.timePlaceholder", "e.g., Monday 9:00 AM - 11:00 AM, Wednesday 2:00 PM - 4:00 PM")}
              rows={3}
              className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
            />
          </div>

          {/* Personal Information */}
          <div className="space-y-4 rounded-2xl bg-background/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("becomeStudent.personalInfo", "Personal Information")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  <User className="mr-2 inline h-3 w-3" />
                  {t("becomeStudent.fullName", "Full Name")} *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  <Phone className="mr-2 inline h-3 w-3" />
                  {t("becomeStudent.phone", "Phone")}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  <Users className="mr-2 inline h-3 w-3" />
                  {t("becomeStudent.emergencyContact", "Emergency Contact Name")}
                </label>
                <input
                  type="text"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  <Phone className="mr-2 inline h-3 w-3" />
                  {t("becomeStudent.emergencyPhone", "Emergency Contact Phone")}
                </label>
                <input
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  <Briefcase className="mr-2 inline h-3 w-3" />
                  {t("becomeStudent.occupation", "Occupation")}
                </label>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={(e) => setForm(prev => ({ ...prev, occupation: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  <Home className="mr-2 inline h-3 w-3" />
                  {t("becomeStudent.city", "City")}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                <Home className="mr-2 inline h-3 w-3" />
                {t("becomeStudent.address", "Address")}
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
              />
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4 rounded-2xl bg-background/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("becomeStudent.paymentInfo", "Payment Information")}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("becomeStudent.amount", "Amount")} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("becomeStudent.currency", "Currency")}
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                >
                  <option value="ETB">ETB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("becomeStudent.paymentMethod", "Payment Method")} *
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  required
                >
                  <option value="BankTransfer">{t("becomeStudent.bankTransfer", "Bank Transfer")}</option>
                  <option value="Chapa">{t("becomeStudent.chapa", "Chapa")}</option>
                  <option value="Telebirr">{t("becomeStudent.telebirr", "Telebirr")}</option>
                  <option value="Other">{t("becomeStudent.other", "Other")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("becomeStudent.receipt", "Payment Receipt")} * (image or PDF)
              </label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={(e) => setForm(prev => ({ ...prev, receiptFile: e.target.files?.[0] ?? null }))}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                required
              />
              {form.receiptFile && (
                <p className="mt-1 text-xs text-foreground/60">{form.receiptFile.name}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("becomeStudent.paymentReference", "Payment Reference")} *
              </label>
              <input
                type="text"
                value={form.paymentReference}
                onChange={(e) => setForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                placeholder={t("becomeStudent.referencePlaceholder", "Transaction ID or reference number")}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("becomeStudent.registrationDate", "Registration Start Date")} *
              </label>
              <input
                type="date"
                value={form.registrationStartDate}
                onChange={(e) => setForm(prev => ({ ...prev, registrationStartDate: e.target.value }))}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("becomeStudent.note", "Additional Notes")}
              </label>
              <textarea
                value={form.note}
                onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
                placeholder={t("becomeStudent.notePlaceholder", "Any additional information...")}
                className="w-full rounded-2xl bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
disabled={isCreatingPayment}
              className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95 disabled:opacity-60"
            >
              {isCreatingPayment ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  {t("becomeStudent.submitting", "Submitting...")}
                </>
              ) : (
                t("becomeStudent.submit", "Submit Application")
              )}
            </motion.button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-border bg-background/50 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-background"
            >
              {t("button.cancel", "Cancel")}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
