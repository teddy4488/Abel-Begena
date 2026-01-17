"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useChangePasswordMutation } from "@/store/api/authApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Only allow access if user is logged in and must change password (for students)
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    
    // Only students should be here, but allow any user type to change password
    if (user?.userType === "student" && !user?.mustChangePassword) {
      // Redirect to student dashboard if password already changed
      router.replace("/student");
    }
  }, [isLoggedIn, router, user]);

  if (!isLoggedIn) return null;

  const validate = () => {
    const next: Record<string, string> = {};
    
    if (!form.currentPassword.trim()) {
      next.currentPassword = t("changePassword.currentPasswordError", "Current password is required");
    }
    
    if (!form.newPassword || form.newPassword.length < 6) {
      next.newPassword = t("changePassword.newPasswordError", "Password must be at least 6 characters");
    }
    
    if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = t("changePassword.confirmPasswordError", "Passwords do not match");
    }
    
    if (form.currentPassword === form.newPassword) {
      next.newPassword = t("changePassword.samePasswordError", "New password must be different from current password");
    }
    
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    
    if (!validate()) {
      setErrorMessage(t("changePassword.fixFields", "Please fix the highlighted fields"));
      return;
    }

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }).unwrap();

      pushToast({
        title: t("changePassword.successTitle", "Password changed"),
        description: t("changePassword.successDescription", "Your password has been updated successfully."),
        variant: "success",
      });

      // Update user in store to clear mustChangePassword flag
      // This will be done when the user refreshes or navigates, as the session endpoint will return updated user data
      
      // Redirect based on user type
      const destination = user?.userType === "student" ? "/student" : "/dashboard";
      router.replace(destination);
    } catch (err: any) {
      const message = err?.data?.message || err?.message || t("changePassword.error", "Failed to change password. Please try again.");
      setErrorMessage(message);
      pushToast({
        title: t("changePassword.errorTitle", "Password change failed"),
        description: message,
        variant: "error",
      });
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-24 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md rounded-3xl bg-surface-elevated p-8 shadow-[0_40px_80px_var(--color-primary-glow)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <Lock className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="mb-2 text-2xl font-serif text-primary">
            {user?.mustChangePassword 
              ? t("changePassword.titleRequired", "Change Your Password")
              : t("changePassword.title", "Change Password")}
          </h1>
          <p className="text-sm text-foreground/70">
            {user?.mustChangePassword
              ? t("changePassword.subtitleRequired", "You must change your password before accessing your account.")
              : t("changePassword.subtitle", "Update your account password")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              {t("changePassword.currentPassword", "Current Password")}
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                className={`w-full rounded-2xl border px-4 py-3 pr-12 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                  fieldErrors.currentPassword ? "border-red-400" : "border-border focus:border-secondary"
                } bg-background/80`}
                placeholder={t("changePassword.currentPasswordPlaceholder", "Enter current password")}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.currentPassword}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              {t("changePassword.newPassword", "New Password")}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                className={`w-full rounded-2xl border px-4 py-3 pr-12 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                  fieldErrors.newPassword ? "border-red-400" : "border-border focus:border-secondary"
                } bg-background/80`}
                placeholder={t("changePassword.newPasswordPlaceholder", "Enter new password (min. 6 characters)")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              {t("changePassword.confirmPassword", "Confirm New Password")}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={`w-full rounded-2xl border px-4 py-3 pr-12 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                  fieldErrors.confirmPassword ? "border-red-400" : "border-border focus:border-secondary"
                } bg-background/80`}
                placeholder={t("changePassword.confirmPasswordPlaceholder", "Confirm new password")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-full bg-primary px-6 py-4 text-center text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? t("changePassword.processing", "Changing password...")
              : t("changePassword.submit", "Change Password")}
          </motion.button>
        </form>
      </motion.div>
    </section>
  );
}
