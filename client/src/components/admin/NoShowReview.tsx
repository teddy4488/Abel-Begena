"use client";

import { useMemo, useState } from "react";
import {
  useGetNoShowsQuery,
  useMarkNoShowsAbsentMutation,
  useRevertNoShowsMutation,
  useGetClosedDaysQuery,
  useCreateClosedDayMutation,
  useDeleteClosedDayMutation,
  getAttendanceExportUrl,
} from "@/store/api/attendanceApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { CalendarOff, Download, Loader2, X } from "lucide-react";

function todayStr() {
  // Local YYYY-MM-DD without UTC shift.
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export default function NoShowReview() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [date, setDate] = useState(todayStr());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isFetching } = useGetNoShowsQuery(date);
  const [markAbsent, { isLoading: marking }] = useMarkNoShowsAbsentMutation();
  const [revert, { isLoading: reverting }] = useRevertNoShowsMutation();

  const { data: closedDays = [] } = useGetClosedDaysQuery();
  const [createClosedDay] = useCreateClosedDayMutation();
  const [deleteClosedDay] = useDeleteClosedDayMutation();
  const [closeReason, setCloseReason] = useState("");

  const noShows = data?.noShows ?? [];
  const isClosed = data?.closed ?? false;
  const allSelected = noShows.length > 0 && selected.size === noShows.length;

  const ids = useMemo(() => noShows.map((n) => n.participantId), [noShows]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(ids));

  const doMark = async (participantIds: string[]) => {
    if (participantIds.length === 0) return;
    try {
      const res = await markAbsent({ date, participantIds }).unwrap();
      pushToast({
        title: t("attendance.noShow.marked", "Marked absent"),
        description: `${res.marked} ${t("attendance.noShow.students", "student(s)")}`,
        variant: "success",
      });
      setSelected(new Set());
    } catch {
      pushToast({ title: t("attendance.noShow.error", "Action failed"), variant: "error" });
    }
  };

  const doRevert = async (participantIds: string[]) => {
    if (participantIds.length === 0) return;
    try {
      const res = await revert({ date, participantIds }).unwrap();
      pushToast({
        title: t("attendance.noShow.reverted", "Reverted"),
        description: `${res.reverted} ${t("attendance.noShow.students", "student(s)")}`,
        variant: "success",
      });
      setSelected(new Set());
    } catch {
      pushToast({ title: t("attendance.noShow.error", "Action failed"), variant: "error" });
    }
  };

  const handleAddClosedDay = async () => {
    try {
      await createClosedDay({ date, reason: closeReason || undefined }).unwrap();
      setCloseReason("");
      pushToast({ title: t("attendance.closedDay.added", "Day marked closed"), variant: "success" });
    } catch {
      pushToast({ title: t("attendance.closedDay.error", "Unable to mark closed"), variant: "error" });
    }
  };

  return (
    <div className="space-y-5 rounded-2xl surface-elevated p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("attendance.noShow.kicker", "Attendance")}
          </p>
          <h2 className="text-xl font-serif text-primary">
            {t("attendance.noShow.title", "No-show Review")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => {
              setDate(e.target.value);
              setSelected(new Set());
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <a
            href={getAttendanceExportUrl({ to: date })}
            download="attendance.csv"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            {t("attendance.export", "Export CSV")}
          </a>
        </div>
      </div>

      {/* Closed-day controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-3">
        <CalendarOff className="h-4 w-4 text-foreground/50" />
        {isClosed ? (
          <span className="text-sm text-amber-600">
            {t("attendance.closedDay.isClosed", "This day is marked closed — no no-shows are flagged.")}
          </span>
        ) : (
          <>
            <span className="text-xs text-foreground/60">
              {t("attendance.closedDay.markPrompt", "School closed this day?")}
            </span>
            <input
              type="text"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder={t("attendance.closedDay.reason", "Reason (optional)")}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleAddClosedDay}
              className="rounded-full bg-background/70 px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-background"
            >
              {t("attendance.closedDay.mark", "Mark closed")}
            </button>
          </>
        )}
        {closedDays.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-1">
            {closedDays.slice(0, 6).map((c) => (
              <span
                key={c._id}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600"
              >
                {new Date(c.date).toLocaleDateString()}
                <button type="button" onClick={() => deleteClosedDay(c._id)} aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* No-show list */}
      {isFetching ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-secondary" />
        </div>
      ) : isClosed ? null : noShows.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/60">
          {t("attendance.noShow.none", "No outstanding no-shows for this day.")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-foreground/70">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-secondary" />
              {t("attendance.noShow.selectAll", "Select all")} ({noShows.length})
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={selected.size === 0 || marking}
                onClick={() => doMark([...selected])}
                className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/20 disabled:opacity-40"
              >
                {t("attendance.noShow.markSelected", "Mark selected absent")}
              </button>
              <button
                type="button"
                disabled={marking}
                onClick={() => doMark(ids)}
                className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-500/25 disabled:opacity-40"
              >
                {t("attendance.noShow.markAll", "Mark all absent")}
              </button>
              <button
                type="button"
                disabled={selected.size === 0 || reverting}
                onClick={() => doRevert([...selected])}
                className="rounded-full bg-background/70 px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-background disabled:opacity-40"
              >
                {t("attendance.noShow.revertSelected", "Revert selected")}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {noShows.map((n) => (
              <div
                key={n.participantId}
                className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-2.5"
              >
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(n.participantId)}
                    onChange={() => toggle(n.participantId)}
                    className="h-4 w-4 accent-secondary"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-primary">{n.fullName}</span>
                    <span className="text-xs text-foreground/55">
                      {n.attendanceNumber} • {n.instrumentType}
                    </span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => doMark([n.participantId])}
                    className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/20"
                  >
                    {t("attendance.noShow.absent", "Absent")}
                  </button>
                  <button
                    type="button"
                    onClick={() => doRevert([n.participantId])}
                    className="rounded-full bg-background/70 px-3 py-1 text-xs font-semibold text-foreground/70 hover:bg-background"
                  >
                    {t("attendance.noShow.revert", "Revert")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
