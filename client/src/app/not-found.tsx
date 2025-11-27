"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="mx-auto max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 mx-auto h-64 w-64 rounded-full bg-gradient-to-br from-secondary/20 via-primary/10 to-secondary/20 blur-3xl" />
          
          {/* 404 Number */}
          <motion.h1
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="text-[150px] font-serif leading-none text-primary/20 sm:text-[200px]"
          >
            404
          </motion.h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-serif text-primary">
            {t("notFound.title")}
          </h2>
          <p className="text-foreground/70">
            {t("notFound.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
          >
            <Home className="h-4 w-4" />
            {t("notFound.cta")}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex justify-center gap-2"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-secondary/40"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

