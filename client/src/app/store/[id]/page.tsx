"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  useAddToCartMutation,
  useGetProductByIdQuery,
} from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetProductByIdQuery(productId);
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const attributes = useMemo(() => {
    if (!data?.attributes) return [] as [string, unknown][];
    return Object.entries(data.attributes);
  }, [data]);

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    try {
      await addToCart({ productId, quantity }).unwrap();
      setFeedback("Added to cart");
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback("Unable to add to cart. Please try again.");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p>Loading product...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">Product not found</p>
          <button
            onClick={() => router.push("/store")}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-background/80">
            {data.images?.length ? (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${data.images[0]})` }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-foreground/50">
                Image coming soon
              </div>
            )}
          </div>
          {data.images && data.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {data.images.slice(1, 5).map((image) => (
                <div
                  key={image}
                  className="aspect-square rounded-2xl border border-border bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 rounded-3xl border border-border bg-surface p-8 shadow-[0_25px_60px_rgba(45,10,18,0.08)]">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {data.instrumentType}
            </p>
            <h1 className="text-3xl font-serif text-primary">{data.name}</h1>
            <p className="text-sm text-foreground/70">{data.shortDescription}</p>
          </div>

          <p className="text-3xl font-semibold text-foreground">
            {data.price.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </p>

          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/70">Quantity</span>
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 text-lg"
              >
                -
              </button>
              <span className="w-12 text-center text-lg font-semibold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((prev) => prev + 1)}
                className="px-4 py-2 text-lg"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full rounded-full bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? "Adding..." : "Add to Cart"}
          </button>

          {feedback && (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-secondary">
              {feedback}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Instrument Details
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
              <p className="text-sm text-foreground/60">
                No additional attributes provided.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

