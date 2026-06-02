"use client";

import { useState } from "react";
import { useGetDayOccupancyQuery } from "@/store/api/adminApi";
import { useGetBranchesAdminQuery } from "@/store/api/branchApi";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { OccupancyAreaChart } from "@/components/admin/charts/OccupancyAreaChart";
import { Loader2, Users } from "lucide-react";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const INSTRUMENTS = ["Begena", "Kirar", "Masinko", "Washint", "Kebero", "Other"];

export default function OccupancyVisualizer() {
  const { t } = useI18n();
  const { user } = useAppSelector((s) => s.auth);
  const isSuperAdmin = user?.role === "SuperAdmin";

  const [day, setDay] = useState<string>("monday");
  const [branchId, setBranchId] = useState<string>("");
  const [instrumentType, setInstrumentType] = useState<string>("");

  const { data: branches = [] } = useGetBranchesAdminQuery(undefined, {
    skip: !isSuperAdmin,
  });

  const { data, isFetching } = useGetDayOccupancyQuery({
    day,
    branchId: branchId || undefined,
    instrumentType: instrumentType || undefined,
  });

  const peak = data?.buckets.reduce((m, b) => Math.max(m, b.count), 0) ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.occupancy.kicker", "Scheduling")}
        </p>
        <h2 className="text-2xl font-serif text-primary">
          {t("admin.occupancy.title", "Daily Occupancy")}
        </h2>
        <p className="mt-1 text-xs text-foreground/60">
          {t(
            "admin.occupancy.subtitle",
            "Students in session across the day. Each session lasts 1.5 hours.",
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface-elevated p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-foreground/50">
            {t("admin.occupancy.day", "Day")}
          </label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs capitalize text-foreground"
          >
            {DAYS.map((d) => (
              <option key={d} value={d} className="capitalize">
                {d}
              </option>
            ))}
          </select>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-foreground/50">
              {t("admin.occupancy.branch", "Branch")}
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            >
              <option value="">{t("admin.occupancy.allBranches", "All branches")}</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-foreground/50">
            {t("admin.occupancy.instrument", "Instrument")}
          </label>
          <select
            value={instrumentType}
            onChange={(e) => setInstrumentType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            <option value="">{t("admin.occupancy.allInstruments", "All instruments")}</option>
            {INSTRUMENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-foreground/70">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-secondary" />
            {data?.totalStudents ?? 0} {t("admin.occupancy.students", "students")}
          </span>
          <span>
            {t("admin.occupancy.peak", "Peak")}: {peak}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-surface-elevated p-4">
        {isFetching && !data ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : !data || data.totalSessions === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-foreground/50">
            {t("admin.occupancy.empty", "No sessions scheduled for this day.")}
          </div>
        ) : (
          <OccupancyAreaChart data={data.buckets} />
        )}
      </div>

      {/* Per-start-time breakdown */}
      {data && data.bySlot.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground/50">
            {t("admin.occupancy.byStartTime", "Students by start time")}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.bySlot.map((s) => (
              <span
                key={s.startTime}
                className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary"
              >
                {s.startTime} · {s.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
