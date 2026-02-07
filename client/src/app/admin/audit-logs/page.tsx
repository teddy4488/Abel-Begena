"use client";

import { useCallback, useState } from "react";
import { useGetAuditLogsQuery, useLazyGetAuditLogsExportQuery } from "@/store/api/adminApi";
import type { AuditLogItem } from "@/store/api/adminApi";
import { useI18n } from "@/components/providers/I18nProvider";
import { Skeleton } from "@/components/ui/Skeleton";

function formatAdmin(admin: AuditLogItem["adminId"]): string {
  if (!admin) return "—";
  if (typeof admin === "string") return admin;
  const a = admin as { email?: string; firstName?: string; lastName?: string };
  if (a.email) return a.email;
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || "—";
}

export default function AdminAuditLogsPage() {
  const { t } = useI18n();
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [resource, setResource] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { data, isLoading, isError } = useGetAuditLogsQuery({
    limit,
    offset,
    ...(resource && { resource }),
    ...(from && { from }),
    ...(to && { to }),
  });

  const [triggerExport, { isLoading: isExporting }] = useLazyGetAuditLogsExportQuery();
  const handleExport = useCallback(async () => {
    try {
      const result = await triggerExport({
        ...(from && { from }),
        ...(to && { to }),
      }).unwrap();
      if (typeof result === "string") {
        const blob = new Blob([result], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // error already handled by RTK
    }
  }, [triggerExport, from, to]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          {t("admin.auditLogs.title", "Audit log")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("admin.auditLogs.resource", "Resource")}
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="w-32 rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isExporting
              ? t("admin.auditLogs.exporting", "Exporting…")
              : t("admin.auditLogs.exportCsv", "Export CSV")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <p className="text-destructive">
          {t("admin.auditLogs.loadError", "Failed to load audit logs.")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 font-medium">{t("admin.auditLogs.time", "Time")}</th>
                <th className="p-2 font-medium">{t("admin.auditLogs.admin", "Admin")}</th>
                <th className="p-2 font-medium">{t("admin.auditLogs.action", "Action")}</th>
                <th className="p-2 font-medium">{t("admin.auditLogs.resource", "Resource")}</th>
                <th className="p-2 font-medium">{t("admin.auditLogs.resourceId", "ID")}</th>
                <th className="p-2 font-medium">{t("admin.auditLogs.ip", "IP")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    {t("admin.auditLogs.empty", "No audit logs found.")}
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr key={log._id} className="border-b border-border/50">
                    <td className="p-2">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-2">{formatAdmin(log.adminId)}</td>
                    <td className="p-2">{log.action}</td>
                    <td className="p-2">{log.resource}</td>
                    <td className="p-2 font-mono text-xs">{log.resourceId ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{log.ip ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            {t("admin.auditLogs.prev", "Previous")}
          </button>
          <span className="py-1 text-sm">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            type="button"
            disabled={offset + limit >= total}
            onClick={() => setOffset((o) => o + limit)}
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            {t("admin.auditLogs.next", "Next")}
          </button>
        </div>
      )}
    </div>
  );
}
