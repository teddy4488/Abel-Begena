"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetBranchesQuery } from "@/store/api/branchApi";
import { useConvertUserToStudentMutation } from "@/store/api/attendanceApi";
import { useCreatePaymentRequestMutation } from "@/store/api/paymentApi";
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

  // Avoid SSR evaluation of client-only APIs (guards build-time ReferenceError on location/window)
  const isClient = typeof window !== "undefined";
  if (!isClient) {
    return null;
  }
  const { data: branches = [] } = useGetBranchesQuery();
  const [convertToStudent, { isLoading: isConverting }] = useConvertUserToStudentMutation();
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentRequestMutation();

  const [form, setForm] = useState({
    // Student info
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
    instrumentType: "" as InstrumentType | "",
    learningType: "online" as "online" | "physical",
    branchId: "",
    programDurationMonths: 6 as 3 | 6 | 9,
    preferredLearningDays: [] as DayOfWeek[],
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
  });

  const expectedDays = useMemo(() => {
    return form.programDurationMonths === 3 ? 5 
      : form.programDurationMonths === 6 ? 3 
      : 2;
  }, [form.programDurationMonths]);

  const availableDays = useMemo(() => {
    return DAYS_OF_WEEK.filter(day => !form.preferredLearningDays.includes(day.value));
  }, [form.preferredLearningDays]);

  const handleDayToggle = (day: DayOfWeek) => {
    if (form.preferredLearningDays.includes(day)) {
      setForm(prev => ({
        ...prev,
        preferredLearningDays: prev.preferredLearningDays.filter(d => d !== day),
      }));
    } else {
      if (form.preferredLearningDays.length < expectedDays) {
        setForm(prev => ({
          ...prev,
          preferredLearningDays: [...prev.preferredLearningDays, day],
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

    if (!form.paymentReference.trim()) {
      pushToast({
        title: t("becomeStudent.error", "Validation error"),
        description: t("becomeStudent.paymentRequired", "Payment reference is required"),
        variant: "error",
      });
      return;
    }

    try {
      // Prepare conversion data
      const conversionData = {
        fullName: form.fullName,
        branchId: form.learningType === "physical" ? form.branchId : undefined,
        learningType: form.learningType,
        instrumentType: form.instrumentType,
        programDurationMonths: form.programDurationMonths,
        preferredLearningDays: form.preferredLearningDays,
        registrationStartDate: form.registrationStartDate,
        preferredSchedule: form.preferredSchedule || undefined,
        phone: form.phone || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        occupation: form.occupation || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        amount: form.amount,
        currency: form.currency,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        note: form.note || undefined,
      };

      // Create payment request with conversion data
      const paymentRequest = await createPayment({
        type: "student_conversion",
        amount: form.amount,
        currency: form.currency,
        method: form.paymentMethod,
        reference: form.paymentReference,
        reviewNote: form.note || undefined,
        conversionData: JSON.stringify(conversionData),
      }).unwrap();

      // Then convert user to student (this will be pending until admin approves payment)
      // For now, we'll just create the payment request and show a message
      // The actual conversion will happen when admin approves the payment
      pushToast({
        title: t("becomeStudent.submitted", "Application submitted"),
        description: t(
          "becomeStudent.pendingReview",
          "Your student application has been submitted. An admin will review your payment and complete your registration."
        ),
        variant: "success",
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      pushToast({
        title: t("becomeStudent.error", "Unable to submit application"),
        description: error?.data?.message || t("becomeStudent.errorDesc", "Please check your information and try again"),
        variant: "error",
      });
    }
  };

  if (!isLoggedIn) {
    router.push("/login");
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

          {/* Package Selection */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
              <Calendar className="mr-2 inline h-4 w-4" />
              {t("becomeStudent.package", "Program Package")} *
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.months}
                  type="button"
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      programDurationMonths: pkg.months as 3 | 6 | 9,
                      preferredLearningDays: [],
                    }));
                  }}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    form.programDurationMonths === pkg.months
                      ? "border-secondary bg-secondary/10 shadow-md"
                      : "border-border bg-background/50 hover:border-secondary/50"
                  }`}
                >
                  <p className="text-sm font-semibold text-primary">{pkg.label}</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {t("becomeStudent.daysPerWeek", `${pkg.daysPerWeek} days per week`)}
                  </p>
                </button>
              ))}
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

          {/* Time Preferences */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
              <Clock className="mr-2 inline h-4 w-4" />
              {t("becomeStudent.timePreferences", "Time Preferences")}
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
              disabled={isConverting || isCreatingPayment}
              className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95 disabled:opacity-60"
            >
              {isConverting || isCreatingPayment ? (
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
