"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  useResendVerificationMutation,
  useVerifyEmailMutation,
} from "@/store/api/authApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { extractErrorMessage } from "@/lib/errors";
import { ShieldCheck, RotateCw, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [verifyEmail, { isLoading: isVerifying }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();

  const disableSubmit = !email || code.length !== 6 || isVerifying;
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
    if (disableSubmit) {
      return;
    }
    try {
      await verifyEmail({ email, code }).unwrap();
      pushToast({
        title: t("verifyEmail.successTitle", "Email verified"),
        description: t("verifyEmail.successDescription", "You can now sign in."),
        variant: "success",
      });
      router.replace("/login");
    } catch (error) {
      pushToast({
        title: t("verifyEmail.errorTitle", "Verification failed"),
        description: extractErrorMessage(
          error,
          t("verifyEmail.errorDescription", "Unable to verify your email."),
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
      const response = await resendVerification({ email }).unwrap();
      if (response?.devCode) {
        console.info(`[DEV] Verification code for ${email}: ${response.devCode}`);
      }
      setCooldown(30);
      pushToast({
        title: t("verifyEmail.resendTitle", "Code sent"),
        description: t(
          "verifyEmail.resendDescription",
          "Check your inbox for the new verification code.",
        ),
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: t("verifyEmail.errorTitle", "Verification failed"),
        description: extractErrorMessage(
          error,
          t("verifyEmail.errorDescription", "Unable to verify your email."),
        ),
        variant: "error",
      });
    }
  };

  const cooldownLabel = useMemo(() => {
    if (!cooldown) {
      return t("verifyEmail.resendCta", "Resend code");
    }
    return t("verifyEmail.cooldown", "Resend in {{seconds}}s").replace(
      "{{seconds}}",
      String(cooldown),
    );
  }, [cooldown, t]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-24 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-[32px] border border-border bg-surface/90 p-8 shadow-[0_40px_80px_var(--color-primary-glow)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 12 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10"
          >
            <ShieldCheck className="h-8 w-8 text-secondary" />
          </motion.div>
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            {t("verifyEmail.kicker", "Secure Access")}
          </p>
          <h1 className="mt-2 text-3xl font-serif text-primary">
            {t("verifyEmail.title", "Verify your email")}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {t(
              "verifyEmail.subtitle",
              "Enter the 6-digit code we sent to your inbox to unlock your dashboard.",
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("verifyEmail.emailLabel", "Email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("verifyEmail.codeLabel", "Verification code")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              placeholder="••••••"
            />
            <p className="mt-2 text-xs text-foreground/60">
              {t("verifyEmail.codeHint", "Enter the 6-digit code we emailed you.")}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={disableSubmit}
            className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying
              ? t("verifyEmail.submitting", "Verifying...")
              : t("verifyEmail.submit", "Confirm email")}
          </motion.button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm text-foreground/70">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || !email}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className="h-4 w-4" />
            {cooldownLabel}
          </button>
          <p className="text-xs text-foreground/60">
            {t(
              "verifyEmail.resendHint",
              "Need a fresh code? We'll send another to your inbox.",
            )}
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:underline"
          >
            <MailCheck className="h-4 w-4" />
            {t("verifyEmail.backToLogin", "Back to login")}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}


