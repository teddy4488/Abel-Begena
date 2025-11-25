"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAddToCartMutation, useGetProductsQuery } from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StorePage() {
  const router = useRouter();
  const { data, isLoading, error } = useGetProductsQuery();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddToCart = async (productId: string) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    try {
      await addToCart({ productId, quantity: 1 }).unwrap();
      setFeedback("Added to cart");
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback("Unable to add item. Please try again.");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Instrument Boutique</p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">Curated Liturgical Instruments</h1>
          <p className="text-sm text-foreground/70">
            Explore handcrafted Begena, Kirar, Masinko, Washint, and Kebero collections prepared for the EOTC tradition.
          </p>
          {feedback && (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-secondary">
              {feedback}
            </div>
          )}
        </header>

        {isLoading && (
          <p className="text-sm text-foreground/70">Loading sacred instruments...</p>
        )}

        {error && (
          <p className="text-sm text-red-500">Unable to load catalog. Please refresh.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((product) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col rounded-3xl border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
            >
              <Link
                href={`/store/${product._id}`}
                className="relative block aspect-square overflow-hidden rounded-2xl bg-background/80"
              >
                {product.images?.length ? (
                  <div
                    className="h-full w-full scale-100 bg-cover bg-center transition duration-300 hover:scale-105"
                    style={{ backgroundImage: `url(${product.images[0]})` }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-foreground/50">
                    Image coming soon
                  </div>
                )}
              </Link>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">{product.instrumentType}</p>
                  <Link href={`/store/${product._id}`}>
                    <h2 className="text-xl font-serif text-primary">{product.name}</h2>
                  </Link>
                  <p className="text-sm text-foreground/70">{product.shortDescription}</p>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {product.price.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </p>
                <button
                  onClick={() => handleAddToCart(product._id)}
                  disabled={isAdding}
                  className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdding ? "Adding..." : "Add to Cart"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {!isLoading && !error && !data?.length && (
          <p className="text-center text-sm text-foreground/70">
            No instruments available yet. Please check back soon.
          </p>
        )}
      </div>
    </section>
  );
}

