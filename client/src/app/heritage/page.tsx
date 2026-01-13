"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useGetPublishedPostsQuery } from "@/store/api/blogApi";
import { useI18n } from "@/components/providers/I18nProvider";

export default function HeritagePage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { data, isLoading, error } = useGetPublishedPostsQuery(
    searchTerm ? { search: searchTerm } : undefined,
  );
  
  // Move posts initialization inside useMemo to fix dependency warning
  const posts = useMemo(() => data ?? [], [data]);
  
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0.4]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.94]);

  const filteredPosts = useMemo(() => {
    const normalized = searchTerm.toLowerCase();
    return [...posts]
      .filter((post) => {
        if (!normalized) return true;
        return (
          post.title.toLowerCase().includes(normalized) ||
          post.content.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.publishedAt ?? a.createdAt ?? new Date());
        const dateB = new Date(b.publishedAt ?? b.createdAt ?? new Date());
        const delta = dateA.getTime() - dateB.getTime();
        return sortOrder === "newest" ? -delta : delta;
      });
  }, [posts, searchTerm, sortOrder]);

  const excerptFor = (content: string) =>
    content
      .replace(/[#>*_`]/g, "")
      .slice(0, 160)
      .concat(content.length > 160 ? "…" : "");

  // Safe date formatter function
  const formatPostDate = (post: typeof posts[0]) => {
    const date = post.publishedAt ?? post.createdAt;
    if (!date) return t("heritage.page.recent");
    
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-10">
        <motion.header
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="space-y-3 rounded-2xl border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-4 shadow-lg sm:rounded-[32px] sm:p-6 md:p-8"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            {t("heritage.page.kicker")}
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            {t("heritage.page.title")}
          </h1>
          <p className="text-sm text-foreground/80">
            {t("heritage.page.subtitle")}
          </p>
        </motion.header>

        <div className="sticky top-20 z-30 rounded-2xl border border-border bg-background/80 p-3 shadow-lg backdrop-blur sm:top-24 sm:rounded-3xl sm:p-5">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("heritage.page.search")}
              className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "oldest")
              }
              className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            >
              <option value="newest">{t("heritage.page.sort.newest")}</option>
              <option value="oldest">{t("heritage.page.sort.oldest")}</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-foreground/70">{t("heritage.page.loading")}</p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {t("heritage.page.error")}
          </p>
        )}

        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <motion.article
              key={post._id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] md:flex-row"
            >
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-border md:h-auto md:w-56">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${post.coverImage})` }}
                />
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {formatPostDate(post)}
                </p>
                <h2 className="text-2xl font-serif text-primary">
                  {post.title}
                </h2>
                <p className="text-sm text-foreground/70">
                  {excerptFor(post.content)}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-secondary/70">
                  <span>
                    {post.author?.firstName || post.author?.email || t("heritage.page.editorial")}
                  </span>
                  <span>•</span>
                  <span>{t("heritage.page.published", "Published")}</span>
                </div>
                <Link
                  href={`/heritage/${post.slug}`}
                  className="inline-flex text-sm font-semibold text-secondary"
                >
                  {t("heritage.page.readMore")}
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        {!isLoading && !error && !filteredPosts.length && (
          <p className="text-center text-sm text-foreground/70">
            {t("heritage.page.empty")}
          </p>
        )}
      </div>
    </section>
  );
}