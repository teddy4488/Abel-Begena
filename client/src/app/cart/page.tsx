"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useAddToCartMutation,
  useGetCartQuery,
} from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CartPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetCartQuery(undefined, {
    skip: !isLoggedIn,
  });
  const [addToCart, { isLoading: isUpdating }] = useAddToCartMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();

  if (!isLoggedIn) {
    router.replace("/login");
    return null;
  }

  const handleQuantityChange = async (productId: string, delta: number) => {
    try {
      await addToCart({ productId, quantity: delta }).unwrap();
    } catch {
      pushToast({
        title: t("cart.toast.updateError"),
        description: t("nav.retry"),
        variant: "error",
      });
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await addToCart({ productId, quantity: 0 }).unwrap();
      pushToast({
        title: t("cart.toast.removeSuccess"),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("cart.toast.removeError"),
        description: t("nav.retry"),
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 rounded-2xl border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-4 shadow-lg sm:rounded-[32px] sm:p-6 md:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <ShoppingCart className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("cart.page.kicker")}
              </p>
              <h1 className="text-3xl font-serif text-primary md:text-4xl">
                {t("cart.page.title")}
              </h1>
            </div>
          </div>
          <p className="text-sm text-foreground/70">
            {t("cart.page.subtitle")}
          </p>
        </motion.header>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl border border-border bg-surface p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Skeleton className="h-24 w-24 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 text-center"
          >
            <p className="text-sm text-red-500">
              {t("cart.page.error")}
            </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
              className="mt-4 rounded-full border border-red-500/50 px-6 py-2 text-sm text-red-500 transition hover:bg-red-500/10"
            >
              {t("button.retry")}
            </button>
          </motion.div>
        )}

        {data && data.items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-border bg-surface/80 p-12 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <ShoppingBag className="h-10 w-10 text-secondary/60" />
            </div>
            <p className="text-xl font-serif text-primary">
              {t("cart.page.empty")}
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              {t("cart.page.emptyDesc")}
            </p>
            <Link
              href="/store"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
            >
              {t("cart.page.visitStore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {data.items.map((item, index) => (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-lg transition hover:border-secondary/30 sm:rounded-3xl sm:flex-row sm:items-center sm:p-6"
                >
                  {/* Product Image */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-background/80 sm:h-24 sm:w-24 sm:rounded-2xl">
                    {item.product?.images?.[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product?.name ?? "Product"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-foreground/30">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                      {t("cart.item")}
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      {item.product?.name ?? "Unknown Instrument"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-foreground/70">
                        {item.priceAtCheckout.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                      <span className="text-foreground/40">×</span>
                      <span className="font-semibold text-secondary">
                        {item.quantity}
                      </span>
                      <span className="text-foreground/40">=</span>
                      <span className="font-semibold text-primary">
                        {item.subtotal.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-full border border-border bg-background/50">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleQuantityChange(item.productId, -1)}
                        disabled={isUpdating}
                        className="flex h-10 w-10 items-center justify-center rounded-l-full text-foreground/70 transition hover:bg-secondary/10 hover:text-secondary disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </motion.button>
                      <span className="w-10 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleQuantityChange(item.productId, 1)}
                        disabled={isUpdating}
                        className="flex h-10 w-10 items-center justify-center rounded-r-full text-foreground/70 transition hover:bg-secondary/10 hover:text-secondary disabled:opacity-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </motion.button>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRemove(item.productId)}
                      disabled={isUpdating}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
                      aria-label={t("cart.page.remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Cart Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-4 rounded-3xl border border-secondary/30 bg-linear-to-br from-secondary/5 via-surface to-primary/5 p-6 shadow-[0_25px_60px_var(--color-primary-glow)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-foreground/70">{t("cart.page.totalAmount")}</p>
                <p className="text-3xl font-serif text-primary">
                  {data.totalAmount.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
                <p className="text-xs text-foreground/50">
                  {data.itemCount} {data.itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/store"
                  className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold transition hover:border-secondary hover:bg-(--color-secondary-soft)"
                >
                  {t("cart.continueShopping")}
                </Link>
                <motion.button
                  onClick={() => router.push("/checkout")}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  {t("cart.page.checkout")}
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}
