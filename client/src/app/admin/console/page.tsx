"use client";

import { useGetAnalyticsOverviewQuery } from "@/store/api/adminApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useGetManagedClassesQuery } from "@/store/api/adminApi";
import { useGetProductsQuery } from "@/store/api/storeApi";

export default function AdminConsolePage() {
  const { data: analytics } = useGetAnalyticsOverviewQuery();
  const { data: users } = useGetAllUsersQuery();
  const { data: classes } = useGetManagedClassesQuery();
  const { data: products } = useGetProductsQuery();

  const summaryCards = [
    {
      label: "Total Revenue",
      value: analytics
        ? analytics.revenue.total.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })
        : "—",
    },
    {
      label: "Registered Users",
      value: users?.length ?? "—",
    },
    {
      label: "Live Classes",
      value: analytics?.classes.live ?? "—",
    },
    {
      label: "Products",
      value: products?.length ?? "—",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-border bg-[color:var(--color-background-soft)] p-4"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
              {card.label}
            </p>
            <p className="text-2xl font-semibold text-primary">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-serif text-primary">Latest Classes</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {(classes ?? []).slice(0, 5).map((klass) => (
              <li
                key={klass._id}
                className="flex items-center justify-between rounded-2xl border border-border/80 px-3 py-2"
              >
                <span className="font-medium">{klass.title}</span>
                <span className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {klass.isLive ? "Live" : "Draft"}
                </span>
              </li>
            ))}
            {!classes?.length && (
              <li className="text-sm text-foreground/60">No classes yet.</li>
            )}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-serif text-primary">Order Status</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {analytics &&
              Object.entries(analytics.orders.statusBreakdown).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="rounded-2xl border border-border/70 p-3 text-center"
                  >
                    <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                      {status}
                    </p>
                    <p className="text-xl font-semibold text-primary">
                      {count}
                    </p>
                  </div>
                ),
              )}
            {!analytics && (
              <p className="text-sm text-foreground/60">
                Analytics loading...
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

