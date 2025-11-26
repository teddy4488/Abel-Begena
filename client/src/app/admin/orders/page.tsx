"use client";

import {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} from "@/store/api/storeApi";

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useGetAllOrdersQuery();
  const [updateStatus] = useUpdateOrderStatusMutation();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-foreground/70">
        Loading orders...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
          Orders
        </p>
        <h1 className="text-2xl font-serif text-primary">
          Payment & fulfillment
        </h1>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {(orders ?? []).map((order) => (
              <tr key={order._id}>
                <td className="px-4 py-3 font-semibold">
                  #{order._id.slice(-6).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {order.items[0]?.product?.name ?? "Custom"}
                </td>
                <td className="px-4 py-3 text-primary">
                  {order.totalAmount.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      updateStatus({
                        id: order._id,
                        status: e.target.value,
                        isPaid: order.isPaid,
                      })
                    }
                    className="rounded-xl border border-border bg-background/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                  >
                    {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      ),
                    )}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateStatus({
                        id: order._id,
                        status: order.status,
                        isPaid: !order.isPaid,
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      order.isPaid
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {order.isPaid ? "Paid" : "Unverified"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-foreground/60">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-foreground/70"
                >
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

