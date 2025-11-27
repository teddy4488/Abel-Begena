"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useRegisterMutation } from "@/store/api/authApi";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { User, Mail, Lock, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [register, { isLoading }] = useRegisterMutation();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) {
      next.firstName = t("register.page.firstNameError");
    }
    if (!form.lastName.trim()) {
      next.lastName = t("register.page.lastNameError");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t("register.page.emailError");
    }
    if (form.password.length < 6) {
      next.password = t("register.page.passwordError");
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
      await register(form).unwrap();
      pushToast({
        title: t("register.toast.success"),
        description: t("register.toast.successDesc"),
        variant: "success",
      });
      router.push("/login");
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("register.toast.error"),
        description: t("register.toast.errorDesc"),
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
        className="w-full max-w-2xl rounded-3xl border border-border bg-surface/80 p-10 shadow-[0_40px_80px_var(--color-primary-glow)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10"
          >
            <User className="h-8 w-8 text-secondary" />
          </motion.div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("register.page.kicker")}
          </p>
          <h1 className="mt-3 text-3xl font-serif text-primary">
            {t("register.page.title")}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {t("register.page.subtitle")}
          </p>
        </div>

        <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-1"
          >
            <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <User className="h-4 w-4" />
              {t("register.page.firstName")}
            </label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                fieldErrors.firstName ? "border-red-400" : "border-border focus:border-secondary"
              } bg-background/80`}
              placeholder="Kidus"
            />
            {fieldErrors.firstName && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-1"
          >
            <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <User className="h-4 w-4" />
              {t("register.page.lastName")}
            </label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                fieldErrors.lastName ? "border-red-400" : "border-border focus:border-secondary"
              } bg-background/80`}
              placeholder="Haile"
            />
            {fieldErrors.lastName && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2"
          >
            <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <Mail className="h-4 w-4" />
              {t("register.page.email")}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="md:col-span-2"
          >
            <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <Lock className="h-4 w-4" />
              {t("register.page.password")}
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                fieldErrors.password ? "border-red-400" : "border-border focus:border-secondary"
              } bg-background/80`}
              placeholder={t("register.page.passwordPlaceholder")}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="md:col-span-2"
          >
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {isLoading ? t("register.page.submitting") : t("register.page.submit")}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </span>
            </motion.button>
          </motion.div>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-sm text-foreground/70"
        >
          {t("register.page.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-secondary hover:underline">
            {t("register.page.signIn")}
          </Link>
        </motion.p>
      </motion.div>
    </section>
  );
}
