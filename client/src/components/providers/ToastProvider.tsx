"use client";

import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastVariant = "default" | "success" | "error";

type ToastPayload = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastRecord = ToastPayload & { id: string; variant: ToastVariant };

type ToastContextValue = {
  pushToast: (toast: ToastPayload) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  default:
    "border-border bg-[color:var(--color-background-soft)] text-foreground",
  success:
    "border-green-500/40 bg-green-500/10 text-green-100 dark:text-green-200",
  error:
    "border-red-500/40 bg-red-500/10 text-red-100 dark:text-red-200",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, description, variant = "default" }: ToastPayload) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [
        ...current,
        { id, title, description, variant },
      ]);
      window.setTimeout(() => dismissToast(id), 5500);
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [pushToast, dismissToast],
  );

  useEffect(() => {
    const handleSessionExpiry = () => {
      // Only show session expired if user was actually logged in
      // This prevents showing it on page refresh when not logged in
      const authData = typeof window !== "undefined" 
        ? window.localStorage.getItem("abel-begena-auth")
        : null;
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.user && parsed.isLoggedIn) {
            pushToast({
              title: "Session expired",
              description: "Please sign in again to continue.",
              variant: "error",
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    const handleApiError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      pushToast({
        title: "Something went wrong",
        description: detail?.message ?? "Please try again.",
        variant: "error",
      });
    };
    if (typeof window !== "undefined") {
      window.addEventListener("session-expired", handleSessionExpiry);
      window.addEventListener("api-error", handleApiError);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("session-expired", handleSessionExpiry);
        window.removeEventListener("api-error", handleApiError);
      }
    };
  }, [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className={clsx(
                "pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur",
                variantClasses[toast.variant],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="text-xs text-foreground/80">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-xs uppercase tracking-wide text-foreground/70 transition hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  Close
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export default ToastProvider;

