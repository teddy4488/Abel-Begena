"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle, RotateCw } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useForgotPasswordMutation } from "@/store/api/authApi";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [intendedEmail, setIntendedEmail] = useState("");
  const [forgotPassword, { isLoading, isSuccess }] =
    useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntendedEmail(email);
    try {
      await forgotPassword({ email }).unwrap();
    } catch {
      // suppress to avoid revealing whether email exists
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-border bg-surface p-8 shadow-[0_40px_80px_var(--color-primary-glow)]"
        >
          {!isSuccess ? (
            <>
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                  {t("forgotPassword.kicker")}
                </p>
                <h1 className="mt-2 text-3xl font-serif text-primary">
                  {t("forgotPassword.title")}
                </h1>
                <p className="mt-2 text-sm text-foreground/70">
                  {t("forgotPassword.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    {t("forgotPassword.emailLabel")}
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-border bg-background/80 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!email || isLoading}
                  className="w-full rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? t("forgotPassword.sending")
                    : t("forgotPassword.submit")}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-secondary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("forgotPassword.backToLogin")}
                </Link>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-serif text-primary">
                {t("forgotPassword.success")}
              </h2>
              <p className="mt-4 text-sm text-foreground/70">
                {t(
                  "forgotPassword.successMessage",
                  "If an account exists with that email, you will receive password reset instructions.",
                )}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={`/reset-password?email=${encodeURIComponent(
                    intendedEmail,
                  )}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-secondary"
                >
                  <RotateCw className="h-4 w-4" />
                  {t("forgotPassword.goToReset", "Enter reset code")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("forgotPassword.backToLogin")}
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

