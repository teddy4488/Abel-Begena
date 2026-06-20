"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  useResetPasswordMutation,
  useForgotPasswordMutation,
} from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { extractErrorMessage } from "@/lib/errors";
import { Lock, ShieldQuestion, RotateCw, MailCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resetPassword, { isLoading: isResetting }] =
    useResetPasswordMutation();
  const [resend, { isLoading: isResending }] = useForgotPasswordMutation();

  const disableSubmit =
    !email || code.length !== 6 || password.length < 6 || isResetting;
  const canResend = cooldown === 0 && !isResending;

  useEffect(() => {
    if (!cooldown) {
      return;
    }
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (disableSubmit) return;
    try {
      await resetPassword({ email, code, password }).unwrap();
      pushToast({
        title: t("resetPassword.successTitle", "Password updated"),
        description: t(
          "resetPassword.successDescription",
          "You can now sign in with your new password.",
        ),
        variant: "success",
      });
      router.replace("/login");
    } catch (error) {
      pushToast({
        title: t("resetPassword.errorTitle", "Unable to reset password"),
        description: extractErrorMessage(
          error,
          t(
            "resetPassword.errorDescription",
            "Please verify the code and try again.",
          ),
        ),
        variant: "error",
      });
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) {
      return;
    }
    try {
      await resend({ email }).unwrap();
      setCooldown(30);
      pushToast({
        title: t("resetPassword.resendTitle", "Code sent"),
        description: t(
          "resetPassword.resendDescription",
          "Check your inbox for the new password reset code.",
        ),
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: t("resetPassword.errorTitle", "Unable to reset password"),
        description: extractErrorMessage(
          error,
          t(
            "resetPassword.errorDescription",
            "Please verify the code and try again.",
          ),
        ),
        variant: "error",
      });
    }
  };

  const cooldownLabel = useMemo(() => {
    if (!cooldown) {
      return t("resetPassword.resendCta", "Resend code");
    }
    return t(
      "resetPassword.cooldown",
      "Resend in {{seconds}}s",
    ).replace("{{seconds}}", String(cooldown));
  }, [cooldown, t]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-24 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="ornate-frame w-full max-w-lg p-8 backdrop-blur"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 12 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10"
          >
            <ShieldQuestion className="h-8 w-8 text-secondary" />
          </motion.div>
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            {t("resetPassword.kicker", "Account recovery")}
          </p>
          <h1 className="mt-2 text-3xl font-serif text-primary">
            {t("resetPassword.title", "Enter your reset code")}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {t(
              "resetPassword.subtitle",
              "Enter the 6-digit code and your new password to continue.",
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("resetPassword.emailLabel", "Email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="recessed mt-2 w-full px-4 py-3 text-sm text-foreground outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("resetPassword.codeLabel", "Reset code")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="recessed mt-2 w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground outline-none transition"
              placeholder="••••••"
            />
            <p className="mt-2 text-xs text-foreground/60">
              {t(
                "resetPassword.codeHint",
                "Enter the 6-digit code we emailed you.",
              )}
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("resetPassword.passwordLabel", "New password")}
            </label>
            <div className="relative mt-2">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="recessed w-full py-3 pl-12 pr-4 text-sm text-foreground outline-none transition"
                placeholder={t(
                  "resetPassword.passwordPlaceholder",
                  "Enter a new password",
                )}
              />
            </div>
            <p className="mt-2 text-xs text-foreground/60">
              {t(
                "resetPassword.passwordHint",
                "Use at least 6 characters with a mix of numbers and letters.",
              )}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={disableSubmit}
            className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResetting
              ? t("resetPassword.submitting", "Updating...")
              : t("resetPassword.submit", "Update password")}
          </motion.button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm text-foreground/70">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || !email}
            className="btn-ghost-strong inline-flex items-center gap-2 rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className="h-4 w-4" />
            {cooldownLabel}
          </button>
          <p className="text-xs text-foreground/60">
            {t(
              "resetPassword.resendHint",
              "Need a new code? We'll send another to your inbox.",
            )}
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:underline"
          >
            <MailCheck className="h-4 w-4" />
            {t("resetPassword.backToLogin", "Back to login")}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
