"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLoginMutation } from "@/store/api/authApi";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUserLandingRoute } from "@/lib/utils";
import { extractErrorMessage } from "@/lib/errors";
import { Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    const destination = getRoleLandingRoute(user?.role);
    router.replace(destination);
  }, [isLoggedIn, user?.role, router]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t("login.emailError", "Enter a valid email address.");
    }
    if (!form.password || form.password.length < 6) {
      next.password = t("login.passwordError", "Password must be at least 6 characters.");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    try {
      const result = await login(form).unwrap();
      setErrorMessage(null);
      setPendingEmail(null);
      pushToast({
        title: t("login.successTitle", "Welcome back"),
        description: t("login.successDescription", "Redirecting you to your dashboard."),
        variant: "success",
      });
      const destination = getUserLandingRoute(
        result.user?.userType,
        result.user?.role,
      );
      router.replace(destination);
    } catch (err) {
      const fallback = t(
        "login.errorMessage",
        "Invalid credentials. Please try again.",
      );
      const message = extractErrorMessage(err, fallback);
      setErrorMessage(message);
      if (message.toLowerCase().includes("verify")) {
        setPendingEmail(form.email);
      } else {
        setPendingEmail(null);
      }
      pushToast({
        title: t("login.failureTitle", "Login failed"),
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
        className="w-full max-w-md rounded-3xl border border-border bg-surface/80 p-8 shadow-[0_40px_80px_var(--color-primary-glow)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10"
          >
            <LogIn className="h-8 w-8 text-secondary" />
          </motion.div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("login.kicker", "Welcome back")}
          </p>
          <h1 className="mt-3 text-3xl font-serif text-primary">
            {t("login.title", "Enter the Portal")}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {t("login.subtitle", "Access your lessons, store orders, and sacred archives.")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <Mail className="h-4 w-4" />
              {t("login.emailLabel", "Email")}
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                fieldErrors.email ? "border-red-400" : "border-border focus:border-secondary"
              } bg-background/80`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                <Lock className="h-4 w-4" />
                {t("login.passwordLabel", "Password")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-secondary hover:underline"
              >
                {t("login.page.forgotPassword")}
              </Link>
            </div>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                fieldErrors.password ? "border-red-400" : "border-border focus:border-secondary"
              } bg-background/80`}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </motion.div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-500"
            >
              <p>{errorMessage}</p>
              {pendingEmail && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(pendingEmail)}`}
                  className="mt-2 inline-flex items-center justify-center text-xs text-secondary hover:underline"
                >
                  {t("login.verifyLink", "Verify my email")}
                </Link>
              )}
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t("login.loading", "Signing In...") : t("login.submit", "Login")}
          </motion.button>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-sm text-foreground/70"
        >
          {t("login.page.noAccount")}{" "}
          <Link href="/register" className="font-semibold text-secondary hover:underline">
            {t("login.page.signUp")}
          </Link>
        </motion.p>
      </motion.div>
    </section>
  );
}
