"use client";

import FadeIn from "@/components/animations/FadeIn";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Music2, Waves, Download, Sparkles } from "lucide-react";

const previewImages = [
  "/assets/abel.jpg",
  "/assets/abel2.jpg",
  "/assets/begena25.jpg",
];

export default function VirtualBegenaPreview() {
  const { t } = useI18n();

  const featurePoints = [
    {
      icon: Music2,
      title: t("virtual.points.simulator.title"),
      description: t("virtual.points.simulator.copy"),
    },
    {
      icon: Waves,
      title: t("virtual.points.qinit.title"),
      description: t("virtual.points.qinit.copy"),
    },
    {
      icon: Download,
      title: t("virtual.points.record.title"),
      description: t("virtual.points.record.copy"),
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[var(--color-surface-elevated)] py-14 px-6 shadow-[0_60px_120px_var(--color-primary-glow)] md:px-12 lg:px-16 dark:bg-[var(--color-surface-elevated)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)]/80 to-[var(--color-secondary-soft)] opacity-60 dark:opacity-40" />
      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("virtual.kicker")}
            </p>
            <h2 className="mt-2 text-3xl font-serif text-primary sm:text-4xl">
              {t("virtual.title")}
            </h2>
            <p className="mt-4 text-sm text-foreground/70">
              {t("virtual.subtitle")}
            </p>
          </FadeIn>

          <div className="space-y-4">
            {featurePoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <FadeIn
                  key={point.title}
                  delay={0.1 * index}
                  className="flex gap-4 rounded-2xl bg-[var(--color-card-bg)] p-4 shadow-[0_10px_30px_var(--color-primary-glow)] transition-all hover:bg-[var(--color-card-hover)] dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">{point.title}</p>
                    <p className="text-sm text-foreground/70">
                      {point.description}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/virtual-begena"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_15px_35px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
            >
              {t("virtual.cta.play")}
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link
              href="#classes"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary-soft)] px-6 py-3 text-sm font-semibold text-secondary transition hover:opacity-80 dark:bg-[var(--color-secondary-soft)] dark:hover:opacity-80"
            >
              {t("virtual.cta.learn")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <motion.div
            className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--color-card-bg)] to-[var(--color-background-subtle)] p-6 shadow-[0_35px_80px_var(--color-primary-glow)] dark:from-[var(--color-card-bg)] dark:to-[var(--color-background-subtle)]"
            animate={{ y: ["0%", "-3%", "0%"] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          >
            <div className="mb-6 flex items-center justify-between text-sm text-secondary/80">
              <span>{t("virtual.preview.label")}</span>
              <span>{t("virtual.preview.modes")}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {previewImages.map((src) => (
                <motion.div
                  key={src}
                  whileHover={{ scale: 1.03 }}
                  className="relative h-36 overflow-hidden rounded-2xl bg-[var(--color-background-subtle)] dark:bg-[var(--color-background-subtle)]"
                >
                  <Image
                    src={src}
                    alt="Begena preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                </motion.div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm uppercase tracking-[0.3em] text-secondary/80">
              <div className="rounded-2xl bg-[var(--color-secondary-soft)] px-4 py-3 dark:bg-[var(--color-secondary-soft)]">
                <p className="text-[var(--color-foreground-muted)] text-[11px]">
                  {t("virtual.stats.presets")}
                </p>
                <p className="mt-1 text-2xl font-serif text-primary">4</p>
              </div>
              <div className="rounded-2xl bg-[var(--color-secondary-soft)] px-4 py-3 dark:bg-[var(--color-secondary-soft)]">
                <p className="text-[var(--color-foreground-muted)] text-[11px]">
                  {t("virtual.stats.export")}
                </p>
                <p className="mt-1 text-2xl font-serif text-primary">WAV</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


