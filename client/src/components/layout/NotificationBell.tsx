"use client";

import { useState, useRef } from "react";
import { Bell } from "lucide-react";
import { useGetNotificationsQuery, useMarkAsReadMutation } from "@/store/api/notificationApi";
import clsx from "clsx";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30_000,
  });
  const [markAsRead] = useMarkAsReadMutation();

  const unread = notifications.filter((n) => !n.readAt);
  const recent = notifications.slice(0, 8);

  const handleOpen = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setOpen(true);
  };

  const handleClose = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 120);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-(--color-secondary-soft) transition hover:opacity-80"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary-foreground shadow">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl bg-(--color-surface-elevated) shadow-xl ring-1 ring-border/10 z-50"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">
              Notifications
            </span>
            {unread.length > 0 && (
              <span className="text-[10px] text-foreground/50">
                {unread.length} unread
              </span>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-foreground/50">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {recent.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n._id)}
                    className={clsx(
                      "w-full px-4 py-3 text-left transition hover:bg-(--color-secondary-soft)",
                      !n.readAt && "bg-(--color-primary)/5",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                      )}
                      <div className={clsx(!n.readAt ? "" : "pl-4")}>
                        <p className="text-xs font-semibold text-foreground">
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="mt-0.5 text-xs text-foreground/60 line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        {n.createdAt && (
                          <p className="mt-1 text-[10px] text-foreground/40">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
