"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  /** Tone of the confirm action. "danger" = red (destructive), "primary" = brand. */
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Confirm",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "danger",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          if (!isLoading) onCancel();
        }}
      />

      <div className="z-10 w-full max-w-xl rounded-3xl border border-border bg-surface-elevated p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="mt-2 text-sm text-foreground/70">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            className="ml-4 rounded-full p-2 text-foreground/70 hover:bg-secondary/5"
            onClick={() => {
              if (!isLoading) onCancel();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-ghost-strong rounded-full px-5 py-2 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`${variant === "primary" ? "btn-primary-strong" : "btn-danger-strong"} inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm`}
          >
            {isLoading ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} strokeOpacity="0.2" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
              </svg>
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
