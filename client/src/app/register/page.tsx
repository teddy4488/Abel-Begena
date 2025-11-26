"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRegisterMutation } from "@/store/api/authApi";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast } = useToast();
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
      next.firstName = "First name is required.";
    }
    if (!form.lastName.trim()) {
      next.lastName = "Last name is required.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address.";
    }
    if (form.password.length < 6) {
      next.password = "Password must be at least 6 characters.";
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
        title: "Registration complete",
        description: "Sign in to access your dashboard.",
        variant: "success",
      });
      router.push("/login");
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Registration failed",
        description: "Please verify the form and try again.",
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
        className="w-full max-w-2xl rounded-3xl border border-border bg-surface/80 p-10 shadow-[0_40px_80px_rgba(0,0,0,0.08)] backdrop-blur"
      >
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Begin your journey
          </p>
          <h1 className="mt-3 text-3xl font-serif text-primary">
            Join the Abel Begena Conservatory
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            Enroll to study the Begena, Masinko, Washint, and more under
            seasoned masters.
          </p>
        </div>

        <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-1">
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              First Name
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
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Last Name
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
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Email
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

          <div className="md:col-span-2">
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                fieldErrors.password ? "border-red-400" : "border-border focus:border-secondary"
              } bg-background/80`}
              placeholder="Create a strong password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </section>
  );
}

