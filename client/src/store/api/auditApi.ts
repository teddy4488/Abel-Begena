import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import { baseUrl } from "./baseQuery";

export type AuditLogAdmin = {
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export type AuditLogEntry = {
  _id: string;
  adminId: string | AuditLogAdmin;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
};

export type AuditLogsResponse = {
  items: AuditLogEntry[];
  total: number;
};

export type AuditFilters = {
  limit?: number;
  offset?: number;
  resource?: string;
  from?: string;
  to?: string;
};

function buildQuery(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  if (filters.resource) params.set("resource", filters.resource);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

export const auditApi = createApi({
  reducerPath: "auditApi",
  baseQuery: authorizedBaseQuery,
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogsResponse, AuditFilters>({
      query: (filters) => {
        const qs = buildQuery(filters);
        return `/audit-logs${qs ? `?${qs}` : ""}`;
      },
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;

export function getAuditExportUrl(filters: Omit<AuditFilters, "limit" | "offset">) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.resource) params.set("resource", filters.resource);
  return `${baseUrl}/audit-logs/export${params.toString() ? `?${params.toString()}` : ""}`;
}
