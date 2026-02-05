"use client";

import Link from "next/link";
import { useGetMyOrdersQuery, useUploadReceiptMutation } from "@/store/api/storeApi";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { motion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { Package, ShoppingBag, ArrowRight, CheckCircle, Clock, Truck, XCircle, CreditCard, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useCreatePaymentRequestMutation } from "@/store/api/paymentApi";

const statusConfig: Record<
  string,
  { color: string; bg: string; icon: React.ElementType }
> = {
  Pending: { color: "text-amber-600", bg: "bg-amber-500/10", icon: Clock },
  PaymentPending: { color: "text-amber-600", bg: "bg-amber-500/10", icon: Clock },
  PaymentRejected: { color: "text-rose-600", bg: "bg-rose-500/10", icon: XCircle },
  Processing: { color: "text-blue-600", bg: "bg-blue-500/10", icon: Package },
  Shipped: { color: "text-indigo-600", bg: "bg-indigo-500/10", icon: Truck },
  Delivered: { color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle },
  Cancelled: { color: "text-red-600", bg: "bg-red-500/10", icon: XCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { data, isLoading, error } = useGetMyOrdersQuery(undefined, {
    skip: !isLoggedIn,
  });
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();
  const [createPaymentRequest, { isLoading: isSubmittingPayment }] =
    useCreatePaymentRequestMutation();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNote, setReceiptNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) router.replace("/login");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  const getStatusTranslation = (status: string) => {
    const key = `orders.status.${status.toLowerCase()}`;
    return t(key, status);
  };

  const resetModalState = () => {
    setSelectedOrderId(null);
    setReceiptFile(null);
    setReceiptNote("");
    setFieldError(null);
  };

  const handleResubmitReceipt = async () => {
    if (!selectedOrderId || !data) return;
    const order = data.find((o) => o._id === selectedOrderId);
    if (!order) return;

    if (!receiptFile && !receiptNote.trim()) {
      setFieldError(
        t(
          "orders.resubmit.receiptRequired",
          "Please upload a receipt file or add a short note/link about your payment.",
        ),
      );
      return;
    }

    try {
      setFieldError(null);
      let receiptUrl: string | undefined =
        receiptNote.trim().length > 0 ? receiptNote.trim() : undefined;

      if (receiptFile) {
        const uploaded = await uploadReceipt({ file: receiptFile }).unwrap();
        receiptUrl = uploaded.url;
      }

      await createPaymentRequest({
        type: "order",
        targetId: order._id,
        amount: order.totalAmount,
        currency: "ETB",
        method: order.paymentMethod,
        receiptUrl,
      }).unwrap();

      resetModalState();
    } catch {
      setFieldError(
        t(
          "orders.resubmit.error",
          "We could not submit your receipt. Please try again or contact support.",
        ),
      );
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 rounded-2xl surface-elevated bg-linear-to-br from-surface via-background to-secondary/5 p-4 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:rounded-[32px] sm:p-6 md:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <Package className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("orders.page.kicker")}
              </p>
              <h1 className="text-3xl font-serif text-primary md:text-4xl">
                {t("orders.page.title")}
              </h1>
            </div>
          </div>
          <p className="text-sm text-foreground/70">
            {t("orders.page.subtitle")}
          </p>
        </motion.header>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl surface-elevated p-6 shadow-lg">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl surface-elevated bg-red-500/10 p-6 text-center shadow-lg"
          >
            <p className="text-sm text-red-500">
              {t("orders.page.error")}
            </p>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="mt-4 rounded-full border border-red-500/50 px-6 py-2 text-sm text-red-500 transition hover:bg-red-500/10"
            >
              {t("button.retry")}
            </button>
          </motion.div>
        )}

        {data && data.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl surface-elevated p-12 text-center shadow-lg"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <ShoppingBag className="h-10 w-10 text-secondary/60" />
            </div>
            <p className="text-xl font-serif text-primary">
              {t("orders.page.empty")}
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              {t("orders.page.emptyDesc")}
            </p>
            <Link
              href="/store"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
            >
              {t("orders.page.browseStore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}

        <div className="space-y-4">
          {data?.map((order, index) => {
            const statusStyle = statusConfig[order.status] ?? statusConfig.Pending;
            const StatusIcon = statusStyle.icon;
            
            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] transition hover:shadow-[0_30px_70px_rgba(18,6,6,0.15)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                      {t("orders.page.orderId")} #{order._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-foreground/60">{t("orders.page.total")}</p>
                    <p className="text-2xl font-serif text-primary">
                      {order.totalAmount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "ETB",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusStyle.color} ${statusStyle.bg}`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {getStatusTranslation(order.status)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm text-foreground/70">
                    <CreditCard className="h-4 w-4" />
                    {order.paymentMethod}
                  </span>
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      order.isPaid
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {order.isPaid
                      ? t("orders.page.paid")
                      : order.status === "PaymentPending"
                        ? t("orders.page.paymentPending", "Payment pending review")
                        : order.status === "PaymentRejected"
                          ? t("orders.page.paymentRejected", "Payment rejected")
                          : t("orders.page.unpaid")}
                  </span>
              {!order.isPaid &&
                order.paymentMethod !== "CashOnDelivery" &&
                (order.status === "PaymentRejected" || order.status === "PaymentPending") && (
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(order._id)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold text-secondary transition hover:border-secondary"
                >
                  <FileText className="h-3 w-3" />
                  {t("orders.resubmit.button", "Resubmit receipt")}
                </button>
              )}
                </div>

                <div className="mt-6 space-y-3 rounded-2xl surface-elevated p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    {t("orders.page.items")} ({order.items.length})
                  </p>
                  {order.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                          <Package className="h-5 w-5 text-secondary/60" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">
                            {item.product?.name ?? "Unknown item"}
                          </p>
                          <p className="text-xs text-foreground/60">
                            {t("cart.quantity")}: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-secondary">
                        {item.subtotal.toLocaleString("en-US", {
                          style: "currency",
                          currency: "ETB",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {selectedOrderId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface-elevated p-6 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-xl font-serif text-primary">
                {t("orders.resubmit.title", "Resubmit payment receipt")}
              </h2>
              <p className="mt-1 text-sm text-foreground/70">
                {t(
                  "orders.resubmit.subtitle",
                  "Upload a new receipt or paste a link/note so the admin can verify your payment.",
                )}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("orders.resubmit.fileLabel", "Receipt file (image or PDF)")}
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setReceiptFile(file);
                  }}
                  className="mt-1 block w-full text-xs text-foreground/80"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t(
                    "orders.resubmit.noteLabel",
                    "Link or short note (optional if file uploaded)",
                  )}
                </label>
                <textarea
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  placeholder={t(
                    "orders.resubmit.notePlaceholder",
                    "Paste a shared link or add a short description of your payment.",
                  )}
                />
              </div>
              {fieldError && (
                <p className="text-xs text-red-500">
                  {fieldError}
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={resetModalState}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-surface"
              >
                {t("button.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleResubmitReceipt}
                disabled={isUploading || isSubmittingPayment}
                className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_var(--color-primary-glow)] transition hover:brightness-95 disabled:opacity-60"
              >
                {isUploading || isSubmittingPayment
                  ? t("orders.resubmit.submitting", "Submitting...")
                  : t("orders.resubmit.submit", "Submit receipt")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
