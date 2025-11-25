"use client";

import Link from "next/link";
import { useGetMyOrdersQuery } from "@/store/api/storeApi";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

const statusColors: Record<string, string> = {
  Pending: "text-yellow-600",
  Processing: "text-blue-600",
  Shipped: "text-indigo-600",
  Delivered: "text-green-600",
  Cancelled: "text-red-600",
};

export default function OrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetMyOrdersQuery(undefined, {
    skip: !isLoggedIn,
  });

  if (!isLoggedIn) {
    router.replace("/login");
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            My Orders
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Order History
          </h1>
          <p className="text-sm text-foreground/70">
            Track the status of your recent instrument purchases.
          </p>
        </header>

        {isLoading && (
          <p className="text-sm text-foreground/70">Loading orders...</p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            Unable to load orders. Please refresh.
          </p>
        )}

        {data && data.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/80 p-8 text-center">
            <p className="text-lg font-semibold text-primary">
              No orders placed yet.
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              Begin your journey by exploring our catalog.
            </p>
            <Link
              href="/store"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-2 text-primary-foreground"
            >
              Visit Store
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {data?.map((order) => (
            <div
              key={order._id}
              className="rounded-3xl border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    Order #{order._id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground/60">Total</p>
                  <p className="text-lg font-semibold text-primary">
                    {order.totalAmount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span
                  className={`rounded-full border border-border px-4 py-1 font-semibold ${
                    statusColors[order.status] ?? "text-secondary"
                  }`}
                >
                  {order.status}
                </span>
                <span className="rounded-full border border-border px-4 py-1 text-foreground/70">
                  Payment: {order.paymentMethod}
                </span>
                <span className="rounded-full border border-border px-4 py-1 text-foreground/70">
                  {order.isPaid ? "Paid" : "Payment Pending"}
                </span>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-border bg-background/60 p-4 text-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  Items
                </p>
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between text-foreground/80"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.product?.name ?? "Unknown item"}
                      </p>
                      <p className="text-xs text-foreground/60">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-primary">
                      {item.subtotal.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

