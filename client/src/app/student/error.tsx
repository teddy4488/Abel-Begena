"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Student error:", error);
  }, [error]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="mx-auto max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 -z-10 mx-auto h-64 w-64 rounded-full bg-linear-to-br from-red-500/20 via-primary/10 to-red-500/20 blur-3xl" />
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10"
          >
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-serif text-primary">
            Student area error
          </h2>
          <p className="text-foreground/70">
            Something went wrong. You can try again or go home.
          </p>
          {error.digest && (
            <p className="text-xs text-foreground/50">Error ID: {error.digest}</p>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="btn-ghost-strong inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
