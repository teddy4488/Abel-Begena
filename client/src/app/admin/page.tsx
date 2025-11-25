"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  useGetAllOrdersQuery,
  useGetProductsQuery,
} from "@/store/api/storeApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { BlogStudio } from "@/components/blog/BlogStudio";

export default function AdminPage() {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { data: orders } = useGetAllOrdersQuery();
  const { data: products } = useGetProductsQuery();
  const { data: users } = useGetAllUsersQuery();

  const revenue = useMemo(
    () =>
      (orders ?? []).reduce((sum, order) => sum + (order.totalAmount ?? 0), 0),
    [orders],
  );
  const pendingOrders = (orders ?? []).filter(
    (order) => order.status === "Pending",
  ).length;
  const deliveredOrders = (orders ?? []).filter(
    (order) => order.status === "Delivered",
  ).length;

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "Admin") {
      router.replace(isLoggedIn ? "/dashboard" : "/login");
    }
  }, [isLoggedIn, router, user?.role]);

  
  if (!isLoggedIn || user?.role !== "Admin") {
    return null;
  }


  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-4 rounded-[32px] border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-8 shadow-[0_40px_100px_rgba(34,6,9,0.25)]">
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            Admin Command Center
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Oversee commerce, enrollment, and heritage.
          </h1>
          <p className="text-sm text-foreground/75">
            Run inventory, reconcile payments, and publish cultural dispatches
            from a single console.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Total revenue",
                value: revenue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                }),
              },
              {
                label: "New registrations",
                value: users?.length ?? 0,
              },
              {
                label: "Pending orders",
                value: pendingOrders,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border bg-background/70 p-4"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                  {card.label}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Inventory",
              copy: "Add instruments, adjust stock, and sync Cloudinary galleries.",
              href: "/store",
            },
            {
              title: "Orders",
              copy: "Verify payments, update statuses, and coordinate delivery.",
              href: "/account/orders",
            },
            {
              title: "Users & Roles",
              copy: "Promote teachers, deactivate dormants, or invite admins.",
              href: "/dashboard",
            },
          ].map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            >
              <h2 className="text-2xl font-serif text-primary">{card.title}</h2>
              <p className="mt-2 text-sm text-foreground/70">{card.copy}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center text-sm font-semibold text-secondary"
              >
                Open →
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                Orders
              </p>
              <h2 className="text-2xl font-serif text-primary">
                Fulfillment radar
              </h2>
            </div>
            <div className="text-sm text-foreground/70">
              {deliveredOrders} delivered • {pendingOrders} pending
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orders ?? []).slice(0, 6).map((order) => (
                  <tr key={order._id} className="py-3">
                    <td className="py-3 font-semibold">
                      #{order._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 text-foreground/70">
                      {order.items[0]?.product?.name ?? "Custom order"}
                    </td>
                    <td className="py-3 text-primary">
                      {order.totalAmount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          order.status === "Delivered"
                            ? "bg-green-500/10 text-green-600"
                            : order.status === "Pending"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!orders?.length && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sm text-foreground/70">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                Inventory highlights
              </p>
              <h2 className="text-2xl font-serif text-primary">
                Storefront snapshot
              </h2>
            </div>
            <span className="text-sm text-foreground/70">
              {products?.length ?? 0} active SKUs
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(products ?? []).slice(0, 3).map((product) => (
              <div
                key={product._id}
                className="rounded-2xl border border-border bg-background/70 p-4"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                  {product.instrumentType}
                </p>
                <p className="text-lg font-semibold text-primary">
                  {product.name}
                </p>
                <p className="text-sm text-foreground/60">
                  Stock: {product.stock}
                </p>
              </div>
            ))}
            {!products?.length && (
              <p className="text-sm text-foreground/70">
                No products yet. Add your first instrument via the Store page.
              </p>
            )}
          </div>
        </div>

        <BlogStudio title="Heritage Publishing" />
      </div>
    </section>
  );
}

