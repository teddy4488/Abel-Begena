"use client";

import dynamic from "next/dynamic";
import { useGetBranchesQuery } from "@/store/api/branchApi";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import FadeIn from "@/components/animations/FadeIn";

const BranchesMap = dynamic(
  () => import("@/components/branches/BranchesPublicMap"),
  { ssr: false },
);

export default function BranchesPage() {
  const { t } = useI18n();
  const { data: branches, isLoading, isError, refetch } = useGetBranchesQuery();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:gap-8 md:px-10 md:py-12 md:gap-10 lg:px-16 lg:py-16">
      <header className="space-y-3 sm:space-y-4">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            {t("branches.public.kicker", "Branches")}
          </p>
          <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl md:text-4xl">
            {t("branches.public.title", "Find the Abel Begena branches")}
          </h1>
          <p className="mt-2 max-w-2xl text-xs text-foreground/70 sm:text-sm">
            {t(
              "branches.public.subtitle",
              "Explore our Addis Ababa studios and heritage branches. Each marker shows the approximate catchment area so you can see which location is closest to you.",
            )}
          </p>
        </FadeIn>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[280px] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg sm:h-[320px] sm:rounded-3xl md:h-[360px] md:rounded-4xl md:shadow-[0_40px_80px_var(--color-primary-glow)]"
        >
          <div className="absolute inset-0 bg-linear-to-br from-background via-surface to-(--color-secondary-soft) opacity-70" />
          <div className="relative h-full">
            {isLoading || !branches ? (
              <div className="flex h-full items-center justify-center text-sm text-foreground/70">
                {t("branches.public.loading", "Loading map...")}
              </div>
            ) : isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-foreground/70">
                <p>
                  {t(
                    "branches.public.error",
                    "Unable to load branches at the moment.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-secondary hover:border-secondary"
                >
                  {t("button.retry", "Retry")}
                </button>
              </div>
            ) : (
              <BranchesMap branches={branches} />
            )}
          </div>
        </motion.div>

        <FadeIn className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:p-6 md:rounded-4xl md:shadow-[0_40px_80px_var(--color-primary-glow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
            {t("branches.public.listTitle", "Studios & heritage branches")}
          </p>
          {isLoading || !branches ? (
            <p className="text-sm text-foreground/70">
              {t("branches.public.loadingList", "Loading branches...")}
            </p>
          ) : branches.length === 0 ? (
            <p className="text-sm text-foreground/70">
              {t(
                "branches.public.empty",
                "Branches will appear here once locations are configured.",
              )}
            </p>
          ) : (
            <ul className="space-y-3">
              {branches.map((branch) => (
                <li
                  key={branch._id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-background/80 p-3"
                >
                  <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-primary">{branch.name}</p>
                    {branch.address && (
                      <p className="text-foreground/70">{branch.address}</p>
                    )}
                    <p className="text-xs text-foreground/60">
                      {[branch.city, branch.region]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </FadeIn>
      </section>
    </div>
  );
}


