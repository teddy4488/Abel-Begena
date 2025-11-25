"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCheckoutMutation,
  useGetCartQuery,
} from "@/store/api/storeApi";
import { useAppSelector } from "@/store/hooks";
import { motion } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";

export default function CheckoutPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetCartQuery(undefined, {
    skip: !isLoggedIn,
  });
  const [checkout, { isLoading: isSubmitting }] = useCheckoutMutation();
  const [form, setForm] = useState({
    city: "",
    street: "",
    postalCode: "",
    phone: "",
    paymentMethod: "CashOnDelivery",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { pushToast } = useToast();

  if (!isLoggedIn) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data || data.items.length === 0) {
      setErrorMessage("Your cart is empty.");
      return;
    }

    try {
      await checkout({
        shippingAddress: {
          city: form.city,
          street: form.street,
          postalCode: form.postalCode,
          phone: form.phone,
        },
        paymentMethod: form.paymentMethod,
      }).unwrap();
      pushToast({
        title: "Order placed",
        description: "Check your order history for status updates.",
        variant: "success",
      });
      router.push("/account/orders");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Checkout failed. Please try again.",
      );
      pushToast({
        title: "Checkout failed",
        description: "Please verify the form and try again.",
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-8 shadow-[0_25px_60px_rgba(45,10,18,0.08)]">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-serif text-primary">
            Shipping Information
          </h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {errorMessage && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
                City
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Street / House
              </label>
              <input
                type="text"
                required
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Postal Code
              </label>
              <input
                type="text"
                required
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Phone
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Payment Method
              </p>
              <div className="mt-3 space-y-2">
                {["CashOnDelivery", "BankTransfer"].map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={form.paymentMethod === method}
                      onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value })
                      }
                      className="h-4 w-4"
                    />
                    <span>{method === "CashOnDelivery" ? "Cash on Delivery" : "Bank Transfer"}</span>
                  </label>
                ))}
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting || isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : "Place Order"}
            </motion.button>
          </form>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-8 shadow-[0_25px_60px_rgba(45,10,18,0.08)]">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Order Summary
          </p>
          {isLoading && (
            <p className="mt-4 text-sm text-foreground/70">
              Loading cart summary...
            </p>
          )}
          {data && data.items.length > 0 ? (
            <div className="mt-4 space-y-4">
              {data.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {item.product?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-foreground/60">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {item.subtotal.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-foreground/70">Total</span>
                <span className="text-2xl font-semibold text-primary">
                  {data.totalAmount.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground/70">
              No items in cart.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

