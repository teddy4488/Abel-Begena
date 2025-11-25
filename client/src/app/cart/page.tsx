"use client";

import { useRouter } from "next/navigation";
import {
  useAddToCartMutation,
  useGetCartQuery,
} from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { motion } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";

export default function CartPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetCartQuery(undefined, {
    skip: !isLoggedIn,
  });
  const [addToCart, { isLoading: isUpdating }] = useAddToCartMutation();
  const { pushToast } = useToast();

  if (!isLoggedIn) {
    router.replace("/login");
    return null;
  }

  const handleQuantityChange = async (productId: string, delta: number) => {
    try {
      await addToCart({ productId, quantity: delta }).unwrap();
    } catch {
      pushToast({
        title: "Unable to update cart",
        description: "Please try again.",
        variant: "error",
      });
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await addToCart({ productId, quantity: 0 }).unwrap();
      pushToast({
        title: "Item removed",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Unable to remove item",
        description: "Please refresh and try again.",
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Sacred Cart
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Your Selected Instruments
          </h1>
          <p className="text-sm text-foreground/70">
            Review your cart before completing checkout.
          </p>
        </header>

        {isLoading && (
          <p className="text-sm text-foreground/70">Loading cart...</p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            Unable to load cart. Please refresh.
          </p>
        )}

        {data && data.items.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/80 p-8 text-center">
            <p className="text-lg font-semibold text-primary">
              Your cart is empty.
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              Browse the store to add handcrafted instruments.
            </p>
            <button
              onClick={() => router.push("/store")}
              className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
            >
              Visit Store
            </button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-6">
            <div className="space-y-4">
              {data.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-secondary">
                      {item.product?.name ?? "Unknown Instrument"}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {item.priceAtCheckout.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                    <p className="text-sm text-foreground/70">
                      Subtotal:{" "}
                      {item.subtotal.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex items-center rounded-full border border-border">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          handleQuantityChange(item.productId, -1)
                        }
                        disabled={isUpdating}
                        className="px-4 py-2 text-lg disabled:opacity-50"
                      >
                        -
                      </motion.button>
                      <span className="w-12 text-center text-lg font-semibold">
                        {item.quantity}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleQuantityChange(item.productId, 1)}
                        disabled={isUpdating}
                        className="px-4 py-2 text-lg disabled:opacity-50"
                      >
                        +
                      </motion.button>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleRemove(item.productId)}
                      disabled={isUpdating}
                      className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary/10 disabled:opacity-60"
                    >
                      Remove
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-background/80 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-foreground/70">Total Amount</p>
                <p className="text-2xl font-semibold text-primary">
                  {data.totalAmount.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              </div>
              <motion.button
                onClick={() => router.push("/checkout")}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95"
              >
                Proceed to Checkout
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

