"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLoginMutation } from "@/store/api/authApi";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login(form).unwrap();
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Invalid credentials. Please try again.",
      );
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
            Welcome back
          </p>
          <h1 className="mt-3 text-3xl font-serif text-primary">
            Enter the Portal
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            Access your lessons, store orders, and sacred archives.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
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

          <div>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing In..." : "Login"}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-4 text-center text-sm text-red-500">{errorMessage}</p>
        )}
      </motion.div>
    </section>
  );
}

