"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  useAddToCartMutation,
  useGetProductsQuery,
} from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

const instrumentFilters = [
  "All",
  "Begena",
  "Kirar",
  "Masinko",
  "Washint",
  "Kebero",
  "Other",
];

export default function StorePage() {
  const router = useRouter();
  const { data, isLoading, error } = useGetProductsQuery();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const [addToCart] = useAddToCartMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "priceAsc" | "priceDesc">(
    "newest",
  );
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const heroTranslate = useTransform(scrollYProgress, [0, 0.2], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.4]);

  const resolvePrice = (product: {
    promoActive?: boolean;
    discountPrice?: number;
    price: number;
  }) =>
    product.promoActive && typeof product.discountPrice === "number"
      ? product.discountPrice
      : product.price;

  const filteredProducts = useMemo(() => {
    if (!data) {
      return [];
    }
    return data
      .filter((product) => {
        const matchesSearch =
          !searchTerm ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.instrumentType
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesCategory =
          category === "All" || product.instrumentType === category;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOrder === "priceAsc") {
          return resolvePrice(a) - resolvePrice(b);
        }
        if (sortOrder === "priceDesc") {
          return resolvePrice(b) - resolvePrice(a);
        }
        return (
          new Date(b.createdAt ?? "").getTime() -
          new Date(a.createdAt ?? "").getTime()
        );
      });
  }, [category, data, searchTerm, sortOrder]);

  const handleAddToCart = async (productId: string) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    try {
      setPendingProductId(productId);
      await addToCart({ productId, quantity: 1 }).unwrap();
      pushToast({
        title: t("store.toast.added"),
        description: t("store.toast.addedDesc"),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("store.toast.error"),
        description: t("store.toast.errorDesc"),
        variant: "error",
      });
    } finally {
      setPendingProductId(null);
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-10">
        <motion.header
          style={{ y: heroTranslate, opacity: heroOpacity }}
          className="space-y-4 rounded-[32px] border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-8 shadow-[0_40px_100px_rgba(34,6,9,0.25)]"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("store.page.kicker")}
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            {t("store.page.title")}
          </h1>
          <p className="text-sm text-foreground/80">
            {t("store.page.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-secondary/70">
            <span>{t("store.page.features.archive")}</span>
            <span>{t("store.page.features.delivery")}</span>
            <span>{t("store.page.features.blessed")}</span>
          </div>
        </motion.header>

        <div className="sticky top-24 z-30 rounded-3xl border border-border bg-background/80 p-5 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("store.page.search")}
              className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "priceAsc" | "priceDesc")
              }
              className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            >
              <option value="newest">{t("store.page.sort.newest")}</option>
              <option value="priceAsc">{t("store.page.sort.priceAsc")}</option>
              <option value="priceDesc">{t("store.page.sort.priceDesc")}</option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {instrumentFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCategory(filter)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  category === filter
                    ? "border-secondary bg-secondary/20 text-secondary"
                    : "border-border text-foreground/70 hover:border-secondary/60"
                }`}
              >
                {filter === "All" ? t("store.page.filter.all") : filter}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-foreground/70">{t("store.page.loading")}</p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {t("store.page.error")}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const onPromo =
              product.promoActive && typeof product.discountPrice === "number";
            const displayPrice = resolvePrice(product);
            return (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="group flex flex-col rounded-3xl border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
              >
                <Link
                  href={`/store/${product._id}`}
                  className="relative block aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-background/80"
                >
                {onPromo && (
                  <span className="absolute left-3 top-3 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                    {t("store.page.promo")}
                  </span>
                )}
                {product.images?.length ? (
                  <motion.div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${product.images[0]})` }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.6 }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-foreground/50">
                    {t("store.page.imageSoon")}
                  </div>
                )}
              </Link>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    {product.instrumentType}
                  </p>
                  <Link href={`/store/${product._id}`}>
                    <h2 className="text-xl font-serif text-primary">
                      {product.name}
                    </h2>
                  </Link>
                  <p className="text-sm text-foreground/70">
                    {product.shortDescription || "Awaiting description."}
                  </p>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {onPromo && (
                    <span className="mr-2 text-sm text-foreground/50 line-through">
                      {product.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  )}
                  <span className="text-secondary">
                    {displayPrice.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </div>
                <motion.button
                  onClick={() => handleAddToCart(product._id)}
                  disabled={pendingProductId === product._id}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingProductId === product._id ? t("store.page.adding") : t("store.page.addToCart")}
                </motion.button>
              </div>
              </motion.div>
            );
          })}
        </div>

        {!isLoading && !error && filteredProducts.length === 0 && (
          <p className="text-center text-sm text-foreground/70">
            {t("store.page.empty")}
          </p>
        )}
      </div>
    </section>
  );
}

