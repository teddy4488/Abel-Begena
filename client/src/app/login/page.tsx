"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLoginMutation } from "@/store/api/authApi";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    if (user?.role === "Admin") {
      router.replace("/admin/console");
    } else {
      router.replace("/dashboard");
    }
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
      await login(form).unwrap();
      setErrorMessage(null);
      pushToast({
        title: t("login.successTitle", "Welcome back"),
        description: t("login.successDescription", "Redirecting you to your dashboard."),
        variant: "success",
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("login.errorMessage", "Invalid credentials. Please try again."),
      );
      pushToast({
        title: t("login.failureTitle", "Login failed"),
        description: t("login.failureDescription", "Double-check your email and password."),
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
        className="w-full max-w-md rounded-3xl border border-border bg-surface/80 p-8 shadow-[0_40px_80px_rgba(0,0,0,0.08)] backdrop-blur"
      >
        <div className="mb-8 text-center">
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
          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
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
          </div>

          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("login.passwordLabel", "Password")}
            </label>
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
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t("login.loading", "Signing In...") : t("login.submit", "Login")}
          </motion.button>
        </form>

        {errorMessage && (
          <p className="mt-4 text-center text-sm text-red-500">{errorMessage}</p>
        )}
      </motion.div>
    </section>
  );
}

