"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useGetAuditLogsQuery, getAuditExportUrl, type AuditLogAdmin } from "@/store/api/auditApi";
import { useAppSelector } from "@/store/hooks";

const RESOURCES = [
  "user", "teacher", "admin", "class", "product", "order",
  "payment", "blog", "comment", "faq", "branch", "enrollment",
  "attendance", "material",
];

const PAGE_SIZE = 50;

function adminLabel(adminId: string | AuditLogAdmin | undefined): string {
  if (!adminId) return "—";
  if (typeof adminId === "string") return adminId.slice(-6);
  const name = [adminId.firstName, adminId.lastName].filter(Boolean).join(" ");
  return name || adminId.email || "—";
}

export default function AuditLogsPage() {
  const { user } = useAppSelector((s) => s.auth);
  const isSuperAdmin = user?.role === "SuperAdmin";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resource, setResource] = useState("");
  const [page, setPage] = useState(0);

  const { data, isFetching, refetch } = useGetAuditLogsQuery(
    {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      from: from || undefined,
      to: to || undefined,
      resource: resource || undefined,
    },
    { skip: !isSuperAdmin },
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportUrl = getAuditExportUrl({
    from: from || undefined,
    to: to || undefined,
    resource: resource || undefined,
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-foreground/50">
        Audit logs are restricted to SuperAdmin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">System</p>
          <h1 className="text-2xl font-serif text-primary">Audit Logs</h1>
          <p className="mt-1 text-xs text-foreground/60">
            All admin-level mutations.{total > 0 ? ` ${total.toLocaleString()} total entries.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground/70 hover:bg-(--color-secondary-soft)"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href={exportUrl}
            download="audit-logs.csv"
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-(--color-surface-elevated) p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-foreground/50">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-foreground/50">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-foreground/50">Resource</label>
          <select
            value={resource}
            onChange={(e) => { setResource(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            <option value="">All resources</option>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {(from || to || resource) && (
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => { setFrom(""); setTo(""); setResource(""); setPage(0); }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground/60 hover:bg-(--color-secondary-soft)"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-(--color-surface-elevated)">
            <tr>
              {["Timestamp", "Admin", "Action", "Resource", "Resource ID", "IP"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-semibold uppercase tracking-widest text-foreground/50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isFetching && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-foreground/40">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-foreground/40">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              items.map((entry) => (
                <tr
                  key={entry._id}
                  className="transition hover:bg-(--color-secondary-soft)/30"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-foreground/60">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {adminLabel(entry.adminId)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground/70">{entry.resource}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-foreground/50">
                    {entry.resourceId ? entry.resourceId.slice(-8) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-foreground/40">{entry.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-foreground/60">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-(--color-secondary-soft)"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-(--color-secondary-soft)"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
