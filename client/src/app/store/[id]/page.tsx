"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  useAddToCartMutation,
  useGetProductByIdQuery,
} from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { ShoppingCart, Loader2, ArrowLeft } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetProductByIdQuery(productId);
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const [quantity, setQuantity] = useState(1);
  const { pushToast } = useToast();
  const { t } = useI18n();

  const attributes = useMemo(() => {
    if (!data?.attributes) return [] as [string, unknown][];
    return Object.entries(data.attributes);
  }, [data]);

  const [activeImage, setActiveImage] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    try {
      await addToCart({ productId, quantity }).unwrap();
      pushToast({
        title: t("store.toast.added", "Added to cart"),
        description: t("store.toast.addedDesc", "Product added successfully"),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("store.toast.error", "Error"),
        description: t("store.toast.errorDesc", "Unable to add to cart. Please try again."),
        variant: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-secondary mb-4" />
          <p className="text-sm text-foreground/70">{t("store.loading", "Loading product...")}</p>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-lg font-semibold text-primary mb-2">
            {t("store.notFound", "Product not found")}
          </p>
          <button
            onClick={() => router.push("/store")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("store.backToStore", "Back to Store")}
          </button>
        </motion.div>
      </section>
    );
  }

  const onPromo =
    data.promoActive && typeof data.discountPrice === "number";
  const displayPrice = onPromo ? data.discountPrice! : data.price;

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:gap-8 lg:flex-row lg:gap-10">
        <div className="flex-1 space-y-3 sm:space-y-4">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-background/80 sm:rounded-3xl">
            {data.images?.length ? (
              <Image
                src={activeImage ?? data.images[0]}
                alt={data.name}
                width={800}
                height={800}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-foreground/50">
                Image coming soon
              </div>
            )}
          </div>
          {data.images && data.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {data.images.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`aspect-square overflow-hidden rounded-2xl border bg-background/80 ${
                    (activeImage ?? data.images?.[0]) === image
                      ? "border-secondary ring-2 ring-secondary/60"
                      : "border-border hover:border-secondary/60"
                  }`}
                >
                  <Image
                    src={image}
                    alt={data.name}
                    width={200}
                    height={200}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:space-y-6 sm:p-6 md:p-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {data.instrumentType}
            </p>
            <h1 className="text-2xl font-serif text-primary sm:text-3xl">{data.name}</h1>
            <p className="text-xs text-foreground/70 sm:text-sm">{data.shortDescription}</p>
          </div>

          <div className="text-2xl font-semibold text-secondary sm:text-3xl">
            {onPromo && (
              <span className="mr-3 text-lg text-foreground/50 line-through">
                {data.price.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            )}
            <span>
              {displayPrice.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary sm:text-sm">
              {t("store.quantity", "Quantity")}
            </span>
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="px-3 py-2 text-base transition hover:bg-secondary/10 sm:px-4 sm:text-lg"
                aria-label={t("store.decreaseQuantity", "Decrease quantity")}
              >
                -
              </button>
              <span className="w-12 text-center text-base font-semibold sm:text-lg">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((prev) => prev + 1)}
                className="px-3 py-2 text-base transition hover:bg-secondary/10 sm:px-4 sm:text-lg"
                aria-label={t("store.increaseQuantity", "Increase quantity")}
              >
                +
              </button>
            </div>
          </div>

          <motion.button
            onClick={handleAddToCart}
            disabled={isAdding}
            whileTap={{ scale: 0.97 }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4 sm:text-base"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("store.adding", "Adding...")}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                {t("store.addToCart", "Add to Cart")}
              </>
            )}
          </motion.button>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary sm:text-sm">
              {t("store.details", "Instrument Details")}
            </p>
            {attributes.length ? (
              <dl className="space-y-2 text-sm text-foreground/80">
                {attributes.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 rounded-2xl border border-border px-4 py-3"
                  >
                    <dt className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </dt>
                    <dd className="text-right">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-foreground/60 sm:text-sm">
                {t("store.noAttributes", "No additional attributes provided.")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

