"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRegisterMutation } from "@/store/api/authApi";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [register, { isLoading, isSuccess, isError }] = useRegisterMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await register(form);
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
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="Kidus"
            />
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
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="Haile"
            />
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
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="you@example.com"
            />
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
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="Create a strong password"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>

        {isError && (
          <p className="mt-4 text-center text-sm text-red-500">
            Registration failed. Please try again.
          </p>
        )}

        {isSuccess && (
          <p className="mt-4 text-center text-sm text-secondary">
            Registration successful! You may now log in.
          </p>
        )}
      </motion.div>
    </section>
  );
}

  

