"use client";

import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetAllEnrollmentsQuery, adminApi } from "@/store/api/adminApi";
import { useGetAllOrdersQuery, storeApi } from "@/store/api/storeApi";
import { attendanceApi } from "@/store/api/attendanceApi";
import { classApi } from "@/store/api/classApi";
import { notificationApi } from "@/store/api/notificationApi";
import {
  useGetPendingPaymentRequestsQuery,
  useGetPaymentHistoryQuery,
  useUpdatePaymentStatusMutation,
  useRetryPaymentSideEffectsMutation,
  type PaymentRequest,
} from "@/store/api/paymentApi";
import { useToast } from "@/components/providers/ToastProvider";
import Pagination from "@/components/ui/Pagination";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  History,
  Search,
  ShoppingBag,
  X,
  Check,
  FileText,
  ExternalLink,
} from "lucide-react";

type AdminPaymentStatus = "completed" | "pending" | "processing" | "failed";
type AdminPaymentType = "enrollment" | "order";

type AdminPaymentRecord = {
  id: string;
  type: AdminPaymentType;
  title: string;
  studentOrCustomer: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  status: AdminPaymentStatus;
  date: string | null;
};

export default function AdminPaymentsPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const dispatch = useDispatch();

  // Cross-API cache invalidation after a payment approval/rejection/retry. The
  // payment mutation itself can only invalidate its own "PaymentRequests" tag,
  // but a payment cascades into orders, billing, students, classes, and the
  // notification feed (when side-effect failures alert admins). Bumping these
  // here keeps /admin/orders, /admin/monthly-payments, /admin/users etc. fresh.
  const invalidateAfterPaymentChange = () => {
    dispatch(storeApi.util.invalidateTags(["Orders", "Cart", "Products"]));
    dispatch(
      attendanceApi.util.invalidateTags([
        "Billing",
        "StudentPayments",
        "StudentParticipants",
        "StudentAttendance",
      ]),
    );
    dispatch(classApi.util.invalidateTags(["Classes", "ClassEnrollment"]));
    dispatch(
      adminApi.util.invalidateTags(["Students", "AdminEnrollments", "AdminAnalytics"]),
    );
    dispatch(notificationApi.util.invalidateTags(["Notification"]));
  };

  const { data: enrollments = [], isLoading: enrollmentsLoading } =
    useGetAllEnrollmentsQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetAllOrdersQuery();
  const { data: pendingRequests = [], isLoading: pendingRequestsLoading } =
    useGetPendingPaymentRequestsQuery();
  // Approved requests whose side effects didn't fully apply — surfaced for one-click repair.
  const { data: approvedRequests = [] } = useGetPaymentHistoryQuery({
    status: "approved",
  });
  const [updatePaymentStatus, { isLoading: isUpdating }] =
    useUpdatePaymentStatusMutation();
  const [retrySideEffects, { isLoading: isRetrying }] =
    useRetryPaymentSideEffectsMutation();
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  // Pending inbox is split by payment type so admin reviews tuition, enrollment,
  // and order receipts as separate streams. "all" is the global view.
  const [pendingTab, setPendingTab] = useState<"all" | "student_monthly_fee" | "enrollment" | "order">("all");

  const needsAttention = useMemo(
    () => approvedRequests.filter((r) => r.sideEffectsApplied === false),
    [approvedRequests],
  );

  const handleRetry = async (id: string) => {
    try {
      await retrySideEffects({ id }).unwrap();
      invalidateAfterPaymentChange();
      pushToast({
        title: t("admin.payments.retry.done", "Side effects re-applied"),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("admin.payments.retry.error", "Retry failed"),
        description: t("admin.payments.retry.errorDesc", "Please try again."),
        variant: "error",
      });
    }
  };

  const [historyStatus, setHistoryStatus] = useState<"all" | "approved" | "rejected">("all");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyQ, setHistoryQ] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(15);

  const { data: historyRaw = [], isFetching: historyFetching } = useGetPaymentHistoryQuery(
    { status: historyStatus, from: historyFrom || undefined, to: historyTo || undefined, q: historyQ || undefined },
  );

  const [filterType, setFilterType] = useState<AdminPaymentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AdminPaymentStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const historyPages = Math.ceil(historyRaw.length / historyPerPage);
  const historyRows = historyRaw.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

  const isLoading = enrollmentsLoading || ordersLoading || pendingRequestsLoading;

  const handleApprovePayment = async (request: PaymentRequest) => {
    try {
      await updatePaymentStatus({
        id: request._id,
        body: { status: "approved", reason: reviewNote || undefined },
      }).unwrap();
      invalidateAfterPaymentChange();
      pushToast({
        title: t("admin.payments.review.approved", "Payment approved"),
        description: t(
          "admin.payments.review.approvedDesc",
          "The payment has been approved and enrollment activated.",
        ),
        variant: "success",
      });
      setSelectedRequest(null);
      setReviewNote("");
    } catch {
      pushToast({
        title: t("admin.payments.review.error", "Error"),
        description: t(
          "admin.payments.review.errorDesc",
          "Failed to update payment status.",
        ),
        variant: "error",
      });
    }
  };

  type ConversionDetails = {
    fullName?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    city?: string;
    address?: string;
    preferredLearningDays?: string[];
    preferredTime?: string;
    preferredSchedule?: string;
    learningGoals?: string;
    notesForTeacher?: string;
    month?: number;
    year?: number;
    [key: string]: unknown;
  };

  const parseConversionData = (
    request: PaymentRequest | null,
  ): ConversionDetails | null => {
    if (!request?.conversionData) return null;
    try {
      return JSON.parse(
        request.conversionData as unknown as string,
      ) as ConversionDetails;
    } catch {
      return null;
    }
  };

  const handleRejectPayment = async (request: PaymentRequest) => {
    if (!reviewNote.trim()) {
      pushToast({
        title: t("admin.payments.review.reasonRequired", "Reason required"),
        description: t(
          "admin.payments.review.reasonRequiredDesc",
          "Please provide a reason for rejection.",
        ),
        variant: "error",
      });
      return;
    }
    try {
      await updatePaymentStatus({
        id: request._id,
        body: { status: "rejected", reason: reviewNote },
      }).unwrap();
      invalidateAfterPaymentChange();
      pushToast({
        title: t("admin.payments.review.rejected", "Payment rejected"),
        description: t(
          "admin.payments.review.rejectedDesc",
          "The payment has been rejected.",
        ),
        variant: "success",
      });
      setSelectedRequest(null);
      setReviewNote("");
    } catch {
      pushToast({
        title: t("admin.payments.review.error", "Error"),
        description: t(
          "admin.payments.review.errorDesc",
          "Failed to update payment status.",
        ),
        variant: "error",
      });
    }
  };

  const getUserDisplayName = (userId: PaymentRequest["userId"]) => {
    if (typeof userId === "object" && userId !== null) {
      const parts = [userId.firstName, userId.lastName].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : userId.email || "Unknown";
    }
    return "Unknown";
  };

  // Try to infer a human-friendly context (class title or order summary) for a payment request
  const getRequestContextLabel = (request: PaymentRequest): string | null => {
    // Normalize userId string for joins
    const userIdStr =
      typeof request.userId === "string"
        ? request.userId
        : request.userId?._id ?? "";

    if (request.type === "enrollment") {
      // Find any enrollment for this user; use the most recent class title as context
      const enrollment = enrollments.find(
        (e) => e.student.id === userIdStr && e.status !== "withdrawn",
      );
      if (enrollment?.classTitle) {
        return enrollment.classTitle;
      }
      return t("admin.payments.context.enrollmentFallback", "Class enrollment");
    }

    if (request.type === "order" && request.targetId) {
      const targetIdStr =
        typeof request.targetId === "string"
          ? request.targetId
          : String(request.targetId);
      const order = orders.find((o) => o._id === targetIdStr);
      if (order) {
        const itemCount = order.items.length;
        const itemsLabel =
          itemCount === 1
            ? t("store.item", "item")
            : t("store.items", "items");
        return t(
          "admin.payments.context.orderSummary",
          "{{count}} store {{itemsLabel}}",
        )
          .replace("{{count}}", String(itemCount))
          .replace("{{itemsLabel}}", itemsLabel);
      }
      return t("admin.payments.context.orderFallback", "Store order payment");
    }

    if (request.type === "student_monthly_fee") {
      // Month/year are stored in conversionData; keep it simple for the card
      return t(
        "admin.payments.context.monthlyFee",
        "Student monthly tuition payment",
      );
    }

    return null;
  };

  const enrollmentRecords: AdminPaymentRecord[] = useMemo(
    () =>
      enrollments
        .filter((e) => typeof e.amountPaid === "number" && e.amountPaid! > 0)
        .map((e) => {
          const fullName = [
            e.student.firstName,
            e.student.lastName,
          ]
            .filter(Boolean)
            .join(" ");
          const studentLabel = fullName || e.student.email;
          const status: AdminPaymentStatus =
            e.status === "active"
              ? "completed"
              : e.status === "pending"
              ? "pending"
              : "failed";
          return {
            id: `${e.classId}-${e.student.id}`,
            type: "enrollment" as const,
            title: e.classTitle,
            studentOrCustomer: studentLabel,
            amount: e.amountPaid ?? 0,
            currency: e.currency ?? "ETB",
            method: e.paymentMethod ?? "Manual",
            reference: e.paymentReference,
            status,
            date: e.enrolledAt ?? null,
          };
        }),
    [enrollments],
  );

  const orderRecords: AdminPaymentRecord[] = useMemo(
    () =>
      orders.map((order) => {
        const itemsLabel =
          order.items.length === 1
            ? t("store.item", "item")
            : t("store.items", "items");
        const status: AdminPaymentStatus = order.isPaid
          ? order.status === "Delivered"
            ? "completed"
            : order.status === "Cancelled"
            ? "failed"
            : "processing"
          : "pending";
        return {
          id: order._id,
          type: "order" as const,
          title: `${order.items.length} ${itemsLabel}`,
          studentOrCustomer: t("admin.payments.unknownCustomer", "Store customer"),
          amount: order.totalAmount,
          currency: "ETB",
          method: order.paymentMethod,
          reference: order._id,
          status,
          date: order.createdAt ?? null,
        };
      }),
    [orders, t],
  );

  const allRecords: AdminPaymentRecord[] = useMemo(
    () =>
      [...enrollmentRecords, ...orderRecords].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      }),
    [enrollmentRecords, orderRecords],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      if (filterType !== "all" && record.type !== filterType) return false;
      if (filterStatus !== "all" && record.status !== filterStatus) return false;
      if (normalizedSearch) {
        const haystack = `${record.title} ${record.studentOrCustomer} ${
          record.method
        } ${record.reference ?? ""}`
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [allRecords, filterType, filterStatus, normalizedSearch]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const totalCompleted = filteredRecords
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPending = filteredRecords
    .filter((r) => r.status === "pending" || r.status === "processing")
    .reduce((sum, r) => sum + r.amount, 0);

  const typeBreakdown = filteredRecords.reduce(
    (acc, record) => {
      acc[record.type] += 1;
      return acc;
    },
    { enrollment: 0, order: 0 },
  );

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "ETB",
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currency || "ETB"}`;
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return t("payments.date.unknown", "Unknown");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return t("payments.date.unknown", "Unknown");
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: AdminPaymentStatus) => {
    const base =
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold";
    switch (status) {
      case "completed":
        return (
          <span className={`${base} bg-emerald-500/10 text-emerald-600`}>
            <CheckCircle2 className="h-3 w-3" />
            {t("payments.status.completed", "Completed")}
          </span>
        );
      case "pending":
        return (
          <span className={`${base} bg-amber-500/10 text-amber-600`}>
            <Clock className="h-3 w-3" />
            {t("payments.status.pending", "Pending")}
          </span>
        );
      case "processing":
        return (
          <span className={`${base} bg-sky-500/10 text-sky-600`}>
            <Clock className="h-3 w-3" />
            {t("payments.status.processing", "Processing")}
          </span>
        );
      case "failed":
      default:
        return (
          <span className={`${base} bg-rose-500/10 text-rose-600`}>
            <AlertCircle className="h-3 w-3" />
            {t("payments.status.failed", "Failed")}
          </span>
        );
    }
  };

  const handleExportCsv = () => {
    if (!filteredRecords.length) return;
    const header = [
      "id",
      "type",
      "title",
      "person",
      "amount",
      "currency",
      "method",
      "reference",
      "status",
      "date",
    ];
    const escapeCsv = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    };
    const rows = filteredRecords.map((r) =>
      [
        escapeCsv(r.id),
        escapeCsv(r.type),
        escapeCsv(r.title),
        escapeCsv(r.studentOrCustomer),
        escapeCsv(r.amount.toString()),
        escapeCsv(r.currency),
        escapeCsv(r.method),
        escapeCsv(r.reference ?? ""),
        escapeCsv(r.status),
        escapeCsv(r.date ? formatDate(r.date) : ""),
      ].join(","),
    );
    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `abel-begena-admin-payments-${new Date().toISOString()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6">
        <header className="flex flex-col gap-3 rounded-2xl  surface-elevated/95 p-4 shadow-lg sm:rounded-[32px] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("admin.payments.kicker", "Treasury overview")}
            </p>
            <h1 className="text-3xl font-serif text-primary">
              {t("admin.payments.title", "Payments & settlements")}
            </h1>
            <p className="text-sm text-foreground/70">
              {t(
                "admin.payments.subtitle",
                "Review tuition receipts and store orders in one ledger, then coordinate manual verifications.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!filteredRecords.length}
            className="inline-flex items-center gap-2 rounded-full  px-4 py-2 text-xs font-semibold uppercase tracking-widest transition hover:bg-(--color-secondary-soft) disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t("admin.payments.exportCsv", "Export CSV")}
          </button>
        </header>

        {/* Needs attention — approved payments whose side effects failed to fully apply */}
        {needsAttention.length > 0 && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-serif text-rose-700">
                {t("admin.payments.needsAttention.title", "Needs attention")}
              </h2>
            </div>
            <p className="mb-3 text-sm text-foreground/75">
              {t(
                "admin.payments.needsAttention.subtitle",
                "These payments were approved but their follow-up actions didn't fully apply. Retry to reconcile.",
              )}
            </p>
            <div className="space-y-2">
              {needsAttention.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      {getUserDisplayName(request.userId)} —{" "}
                      {formatAmount(request.amount, request.currency)}
                    </p>
                    <p className="text-xs text-foreground/60">{request.type}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isRetrying}
                    onClick={() => handleRetry(request._id)}
                    className="btn-danger-strong shrink-0 rounded-full px-3 py-1.5 text-xs"
                  >
                    {t("admin.payments.retry", "Retry")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Payment Requests Section */}
        {pendingRequests.length > 0 && (() => {
          const counts = {
            student_monthly_fee: pendingRequests.filter((r) => r.type === "student_monthly_fee").length,
            enrollment: pendingRequests.filter((r) => r.type === "enrollment").length,
            order: pendingRequests.filter((r) => r.type === "order").length,
          };
          const visibleRequests =
            pendingTab === "all"
              ? pendingRequests
              : pendingRequests.filter((r) => r.type === pendingTab);
          const tabs: Array<{ key: typeof pendingTab; label: string; count: number }> = [
            { key: "all", label: t("admin.payments.tabs.all", "All"), count: pendingRequests.length },
            { key: "student_monthly_fee", label: t("admin.payments.tabs.tuition", "Tuition"), count: counts.student_monthly_fee },
            { key: "enrollment", label: t("admin.payments.tabs.enrollment", "Enrollment"), count: counts.enrollment },
            { key: "order", label: t("admin.payments.tabs.orders", "Orders"), count: counts.order },
          ];
          return (
          <div className="rounded-2xl surface-elevated/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-serif text-primary">
                  {t("admin.payments.pendingRequests.title", "Pending Payment Reviews")}
                </h2>
                <p className="mt-1 text-sm text-foreground/70">
                  {t(
                    "admin.payments.pendingRequests.subtitle",
                    "Review and approve payment requests with uploaded receipts.",
                  )}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                <Clock className="h-3 w-3" />
                {pendingRequests.length}
              </span>
            </div>
            {/* Type tabs — keep tuition/enrollment/order review streams separate */}
            <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPendingTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    pendingTab === tab.key
                      ? "bg-secondary text-primary shadow-sm"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      pendingTab === tab.key ? "bg-primary/15 text-primary" : "bg-foreground/10 text-foreground/60"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            {visibleRequests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-foreground/60">
                {t("admin.payments.tabs.empty", "No pending requests in this category.")}
              </p>
            ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {visibleRequests.map((request) => (
                <div
                  key={request._id}
                  className="rounded-2xl border border-border bg-surface/50 p-4 transition hover:border-secondary/50"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {request.type === "enrollment"
                          ? t("payments.filters.enrollments", "Enrollment")
                          : request.type === "order"
                          ? t("payments.filters.orders", "Order")
                          : request.type === "student_monthly_fee"
                          ? t("payments.type.studentMonthlyFee", "Student Monthly Fee")
                          : t("payments.type.tuition", "Tuition")}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewNote("");
                        }}
                        className="mt-1 font-semibold text-primary hover:underline text-left"
                      >
                        {getUserDisplayName(request.userId)}
                      </button>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600">
                      <Clock className="h-3 w-3" />
                      {t("payments.status.pending", "Pending")}
                    </span>
                  </div>
                  <div className="mb-3 space-y-1 text-sm">
                    <p className="text-foreground/80">
                      <span className="font-semibold">
                        {formatAmount(request.amount, request.currency)}
                      </span>
                      {typeof request.expectedFee === "number" &&
                        request.expectedFee > 0 && (
                          <span className="ml-2 text-xs text-foreground/60">
                            {t("admin.payments.expected", "expected")}:{" "}
                            {formatAmount(request.expectedFee, request.currency)}
                          </span>
                        )}
                    </p>
                    {typeof request.expectedFee === "number" &&
                      request.expectedFee > 0 &&
                      request.amount !== request.expectedFee && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            request.amount < request.expectedFee
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {request.amount < request.expectedFee
                            ? t("admin.payments.partial", "Partial / underpaid")
                            : t("admin.payments.overpaid", "Overpaid")}
                        </span>
                      )}
                    {getRequestContextLabel(request) && (
                      <p className="text-xs text-foreground/70">
                        {getRequestContextLabel(request)}
                      </p>
                    )}
                    {request.reference && (
                      <p className="text-xs text-foreground/60">
                        {t("admin.payments.reference", "Reference")}: {request.reference}
                      </p>
                    )}
                    {request.method && (
                      <p className="text-xs text-foreground/60">
                        {t("admin.payments.method", "Method")}: {request.method}
                      </p>
                    )}
                  </div>
                  {request.receiptUrl && (
                    <div className="mb-3">
                      {/\.(png|jpe?g|gif|webp|avif)$/i.test(request.receiptUrl) ? (
                        <a
                          href={request.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={request.receiptUrl}
                            alt={t("admin.payments.receipt", "Receipt")}
                            className="max-h-40 w-full rounded-xl border border-border object-contain"
                          />
                        </a>
                      ) : /\.pdf$/i.test(request.receiptUrl) ? (
                        <object
                          data={request.receiptUrl}
                          type="application/pdf"
                          className="h-40 w-full rounded-xl border border-border"
                        >
                          <a
                            href={request.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-secondary hover:text-primary"
                          >
                            {t("admin.payments.viewReceipt", "View Receipt")}
                          </a>
                        </object>
                      ) : null}
                      <a
                        href={request.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-secondary transition hover:text-primary"
                      >
                        <FileText className="h-3 w-3" />
                        {t("admin.payments.viewReceipt", "View Receipt")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewNote("");
                      }}
                      className="flex-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-95"
                    >
                      {t("admin.payments.review", "Review")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
          );
        })()}

        {/* PaymentRequest History — approved / rejected / all */}
        <div className="rounded-2xl surface-elevated/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-serif text-primary">
                {t("admin.payments.history.title", "Tuition receipt history")}
              </h2>
            </div>
            {/* Status tabs */}
            <div className="flex gap-1 rounded-full border border-border bg-background p-1">
              {(["all", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setHistoryStatus(s); setHistoryPage(1); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${historyStatus === s ? "bg-secondary text-primary shadow-sm" : "text-foreground/60 hover:text-foreground"}`}
                >
                  {s === "all" ? t("payments.filters.all", "All") : s === "approved" ? t("payments.status.approved", "Approved") : t("payments.status.rejected", "Rejected")}
                </button>
              ))}
            </div>
          </div>

          {/* Filters row */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-full bg-background border border-border px-3 py-2 text-xs">
              <Search className="h-3.5 w-3.5 text-secondary/70 shrink-0" />
              <input
                value={historyQ}
                onChange={(e) => { setHistoryQ(e.target.value); setHistoryPage(1); }}
                placeholder={t("admin.payments.history.search", "Search by name or reference…")}
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            <input
              type="date"
              value={historyFrom}
              onChange={(e) => { setHistoryFrom(e.target.value); setHistoryPage(1); }}
              className="rounded-full border border-border bg-background px-3 py-2 text-xs outline-none"
              title={t("admin.payments.history.from", "From")}
            />
            <input
              type="date"
              value={historyTo}
              onChange={(e) => { setHistoryTo(e.target.value); setHistoryPage(1); }}
              className="rounded-full border border-border bg-background px-3 py-2 text-xs outline-none"
              title={t("admin.payments.history.to", "To")}
            />
          </div>

          {historyFetching ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl surface-elevated animate-pulse" />)}
            </div>
          ) : historyRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-foreground/60">
              {t("admin.payments.history.empty", "No payment requests match these filters.")}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.25em] text-secondary/70">
                      <th className="px-3 py-2">{t("admin.payments.table.person", "Student")}</th>
                      <th className="px-3 py-2">{t("admin.payments.table.type", "Type")}</th>
                      <th className="px-3 py-2">{t("admin.payments.table.amount", "Amount")}</th>
                      <th className="px-3 py-2">{t("admin.payments.expected", "Expected")}</th>
                      <th className="px-3 py-2">{t("admin.payments.table.reference", "Reference")}</th>
                      <th className="px-3 py-2">{t("admin.payments.table.status", "Status")}</th>
                      <th className="px-3 py-2">{t("admin.payments.table.date", "Date")}</th>
                      <th className="px-3 py-2">{t("admin.payments.review.receipt", "Receipt")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {historyRows.map((r) => {
                      const isApproved = r.status === "approved";
                      const isRejected = r.status === "rejected";
                      const mismatch = typeof r.expectedFee === "number" && r.expectedFee > 0 && r.amount !== r.expectedFee;
                      return (
                        <tr key={r._id} className="interactive-row">
                          <td className="px-3 py-2.5 font-medium text-primary">{getUserDisplayName(r.userId)}</td>
                          <td className="px-3 py-2.5 text-xs text-foreground/70">{r.type}</td>
                          <td className="px-3 py-2.5 font-semibold">
                            {formatAmount(r.amount, r.currency)}
                            {mismatch && (
                              <span className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${r.amount < (r.expectedFee ?? 0) ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"}`}>
                                {r.amount < (r.expectedFee ?? 0) ? t("admin.payments.partial", "Partial") : t("admin.payments.overpaid", "Over")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-foreground/60">
                            {typeof r.expectedFee === "number" && r.expectedFee > 0 ? formatAmount(r.expectedFee, r.currency) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-foreground/60">{r.reference || "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isApproved ? "bg-emerald-500/10 text-emerald-600" : isRejected ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
                              {isApproved ? <Check className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-foreground/60">{r.reviewedAt ? formatDate(r.reviewedAt) : formatDate(r.createdAt)}</td>
                          <td className="px-3 py-2.5">
                            {r.receiptUrl ? (
                              <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary">
                                <FileText className="h-3 w-3" />
                                {t("admin.payments.viewReceipt", "View")}
                              </a>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 border-t border-border/70 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                      {t("pagination.itemsPerPage", "Items per page")}:
                    </label>
                    <select
                      value={historyPerPage}
                      onChange={(e) => { setHistoryPerPage(Number(e.target.value)); setHistoryPage(1); }}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <Pagination
                    currentPage={historyPage}
                    totalPages={historyPages}
                    totalItems={historyRaw.length}
                    itemsPerPage={historyPerPage}
                    onPageChange={setHistoryPage}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-3xl  surface-elevated p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.totalCollected", "Total collected")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatAmount(totalCompleted, "ETB")}
            </p>
          </div>
          <div className="rounded-3xl  surface-elevated p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.pending", "Pending / processing")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatAmount(totalPending, "ETB")}
            </p>
          </div>
          <div className="rounded-3xl  surface-elevated p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.counts", "Entries by type")}
            </p>
            <p className="mt-2 text-sm text-foreground/75">
              {t("payments.filters.enrollments", "Enrollments")}:{" "}
              <span className="font-semibold">{typeBreakdown.enrollment}</span>
            </p>
            <p className="text-sm text-foreground/75">
              {t("payments.filters.orders", "Orders")}:{" "}
              <span className="font-semibold">{typeBreakdown.order}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl  surface-elevated/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center rounded-full  bg-background px-3 py-2 sm:px-4">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t(
                    "admin.payments.searchPlaceholder",
                    "Search by student, class, reference, or method",
                  )}
                  className="flex-1 bg-transparent text-xs outline-none sm:text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-4">
                <div className="inline-flex items-center gap-2 rounded-full  bg-background px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <Filter className="h-4 w-4" />
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as AdminPaymentType | "all");
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold uppercase tracking-widest outline-none"
                  >
                    <option value="all">
                      {t("payments.filters.all", "All")}
                    </option>
                    <option value="enrollment">
                      {t("payments.filters.enrollments", "Enrollments")}
                    </option>
                    <option value="order">
                      {t("payments.filters.orders", "Orders")}
                    </option>
                  </select>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full  bg-background px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <Filter className="h-4 w-4" />
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(
                        e.target.value as AdminPaymentStatus | "all",
                      );
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold uppercase tracking-widest outline-none"
                  >
                    <option value="all">
                      {t(
                        "payments.filters.allStatuses",
                        "All Statuses",
                      )}
                    </option>
                    <option value="completed">
                      {t("payments.status.completed", "Completed")}
                    </option>
                    <option value="pending">
                      {t("payments.status.pending", "Pending")}
                    </option>
                    <option value="processing">
                      {t("payments.status.processing", "Processing")}
                    </option>
                    <option value="failed">
                      {t("payments.status.failed", "Failed")}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {isLoading ? (
              <p className="py-6 text-sm text-foreground/70">
                {t("payments.loading", "Loading payments...")}
              </p>
            ) : !filteredRecords.length ? (
              <div className="rounded-2xl border border-dashed border-border/70 card-elevated60 p-6 text-center text-sm text-foreground/70">
                {t(
                  "admin.payments.empty",
                  "No payments match your filters. Adjust the filters or try again later.",
                )}
              </div>
            ) : (
              <>
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                      <th className="px-4 py-3">
                        {t("admin.payments.table.type", "Type")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.person", "Student / customer")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.title", "Class / order")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.amount", "Amount")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.method", "Method")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.reference", "Reference")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.status", "Status")}
                      </th>
                      <th className="px-4 py-3">
                        {t("admin.payments.table.date", "Date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="interactive-row">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full /70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                            {record.type === "enrollment" ? (
                              <BookOpen className="h-3 w-3" />
                            ) : (
                              <ShoppingBag className="h-3 w-3" />
                            )}
                            {record.type === "enrollment"
                              ? t(
                                  "payments.filters.enrollments",
                                  "Enrollments",
                                )
                              : t("payments.filters.orders", "Orders")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">
                            {record.studentOrCustomer}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground/80">
                            {record.title}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">
                            {formatAmount(record.amount, record.currency)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground/70">
                          {record.method}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground/70">
                          {record.reference ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground/70">
                          {formatDate(record.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 border-t border-border/70 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                        {t("pagination.itemsPerPage", "Items per page")}:
                      </label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredRecords.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-border bg-surface/95 shadow-2xl">
            {(() => {
              const details = parseConversionData(selectedRequest);
              const isEnrollment = selectedRequest.type === "enrollment";
              const isMonthly = selectedRequest.type === "student_monthly_fee";
              const hasStudentProfile =
                details &&
                (details.fullName ||
                  details.phone ||
                  details.emergencyContactName ||
                  details.city ||
                  details.address);
              return (
                <>
                  {/* header will render below as-is */}
                  {/* extra blocks are rendered later using details */}
                  <span className="hidden">{String(isEnrollment && isMonthly && hasStudentProfile)}</span>
                </>
              );
            })()}
            {/* Header (fixed) */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h3 className="text-xl font-serif text-primary">
                  {t("admin.payments.review.title", "Review Payment Request")}
                </h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {t(
                    "admin.payments.review.subtitle",
                    "Review the payment details and receipt before approving or rejecting.",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewNote("");
                }}
                className="rounded-full p-2 text-foreground/70 transition hover:bg-secondary/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="mb-4 space-y-3 rounded-2xl border border-border bg-background/50 p-4">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.user", "User")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {getUserDisplayName(selectedRequest.userId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.type", "Type")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {selectedRequest.type === "enrollment"
                        ? t("payments.filters.enrollments", "Enrollment")
                        : selectedRequest.type === "order"
                        ? t("payments.filters.orders", "Order")
                        : selectedRequest.type === "student_monthly_fee"
                        ? t("payments.type.studentMonthlyFee", "Student Monthly Fee")
                        : t("payments.type.tuition", "Tuition")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.amount", "Amount")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {formatAmount(selectedRequest.amount, selectedRequest.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.method", "Payment Method")}
                    </p>
                    <p className="mt-1 text-foreground/80">{selectedRequest.method}</p>
                  </div>
                  {selectedRequest.reference && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("admin.payments.review.reference", "Reference")}
                      </p>
                      <p className="mt-1 text-foreground/80">{selectedRequest.reference}</p>
                    </div>
                  )}
                  {selectedRequest.createdAt && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("admin.payments.review.submitted", "Submitted")}
                      </p>
                      <p className="mt-1 text-foreground/80">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                  )}
                  {getRequestContextLabel(selectedRequest) && (
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t(
                          "admin.payments.review.context",
                          "Payment context",
                        )}
                      </p>
                      <p className="mt-1 text-foreground/80">
                        {getRequestContextLabel(selectedRequest)}
                      </p>
                    </div>
                  )}
                </div>
                {selectedRequest.receiptUrl && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.receipt", "Payment Receipt")}
                    </p>
                    <a
                      href={selectedRequest.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:border-secondary"
                    >
                      <FileText className="h-4 w-4" />
                      {t("admin.payments.viewReceipt", "View Receipt")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

            {/* Order details — show the actual items, quantities, and prices for order payments */}
            {selectedRequest.type === "order" && (() => {
              const targetIdStr =
                typeof selectedRequest.targetId === "string"
                  ? selectedRequest.targetId
                  : String(selectedRequest.targetId ?? "");
              const order = orders.find((o) => o._id === targetIdStr);
              if (!order) {
                return (
                  <div className="mb-4 rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-foreground/60">
                    {t(
                      "admin.payments.review.orderMissing",
                      "Order details could not be loaded (the order may have been deleted).",
                    )}
                  </div>
                );
              }
              const orderTotal = order.totalAmount ?? order.items.reduce(
                (sum, it) => sum + (it.subtotal ?? (it.priceAtCheckout ?? 0) * (it.quantity ?? 0)),
                0,
              );
              return (
                <div className="mb-4 space-y-3 rounded-2xl border border-border bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-secondary/70">
                    {t("admin.payments.review.orderItems", "Order items")}
                  </p>
                  <ul className="divide-y divide-border/60">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">
                            {item.productName || item.product?.name || `Item ${idx + 1}`}
                          </p>
                          <p className="text-xs text-foreground/60">
                            {item.quantity}{" × "}{formatAmount(item.priceAtCheckout ?? 0, "ETB")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground/90 tabular-nums">
                          {formatAmount(item.subtotal ?? (item.priceAtCheckout ?? 0) * (item.quantity ?? 0), "ETB")}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.orderTotal", "Order total")}
                    </p>
                    <p className="text-base font-bold text-primary tabular-nums">
                      {formatAmount(orderTotal, "ETB")}
                    </p>
                  </div>
                  {orderTotal !== selectedRequest.amount && (
                    <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                      {t(
                        "admin.payments.review.orderAmountMismatch",
                        "Note: submitted amount differs from order total. Verify the receipt before approving.",
                      )}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Enrollment / payment form details from conversionData */}
            {(() => {
              const details = parseConversionData(selectedRequest);
              if (!details) return null;
              const isEnrollment = selectedRequest.type === "enrollment";
              const isMonthly = selectedRequest.type === "student_monthly_fee";

              return (
                <div className="mb-4 space-y-3 rounded-2xl border border-border bg-background/40 p-4">
                  {isEnrollment && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t(
                          "admin.payments.review.enrollmentDetails",
                          "Enrollment details from student form",
                        )}
                      </p>
                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        {details.fullName && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.fullName", "Full name")}
                            </p>
                            <p className="font-semibold text-primary">{details.fullName}</p>
                          </div>
                        )}
                        {details.phone && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.phone", "Phone number")}
                            </p>
                            <p className="text-foreground/80">{details.phone}</p>
                          </div>
                        )}
                        {details.emergencyContactName && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t(
                                "classes.modal.emergencyContactName",
                                "Emergency contact name",
                              )}
                            </p>
                            <p className="text-foreground/80">
                              {details.emergencyContactName}
                            </p>
                          </div>
                        )}
                        {details.emergencyContactPhone && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t(
                                "classes.modal.emergencyContactPhone",
                                "Emergency contact phone",
                              )}
                            </p>
                            <p className="text-foreground/80">
                              {details.emergencyContactPhone}
                            </p>
                          </div>
                        )}
                        {details.city && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.city", "City")}
                            </p>
                            <p className="text-foreground/80">{details.city}</p>
                          </div>
                        )}
                        {details.address && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.address", "Address / location")}
                            </p>
                            <p className="text-foreground/80">{details.address}</p>
                          </div>
                        )}
                        {details.preferredLearningDays && Array.isArray(details.preferredLearningDays) && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t(
                                "attendance.students.preferredDays",
                                "Preferred learning days",
                              )}
                            </p>
                            <p className="text-foreground/80">
                              {details.preferredLearningDays.join(", ")}
                            </p>
                          </div>
                        )}
                        {details.preferredTime && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.preferredTime", "Preferred time of learning")}
                            </p>
                            <p className="text-foreground/80">{details.preferredTime}</p>
                          </div>
                        )}
                        {details.preferredSchedule && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t("becomeStudent.timePreferences", "Time preferences")}
                            </p>
                            <p className="text-foreground/80">{details.preferredSchedule}</p>
                          </div>
                        )}
                        {details.learningGoals && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t(
                                "classes.modal.learningGoals",
                                "What are your learning goals?",
                              )}
                            </p>
                            <p className="text-foreground/80">{details.learningGoals}</p>
                          </div>
                        )}
                        {details.notesForTeacher && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.notesForTeacher",
                                "Notes for teacher",
                              )}
                            </p>
                            <p className="text-foreground/80">{details.notesForTeacher}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {isMonthly && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t(
                          "admin.payments.review.tuitionDetails",
                          "Monthly tuition period",
                        )}
                      </p>
                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        {details.month && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("monthlyPayments.period", "Period")}
                            </p>
                            <p className="text-foreground/80">
                              {details.month}/{details.year}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.payments.review.note", "Review Note (Optional)")}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder={t(
                  "admin.payments.review.notePlaceholder",
                  "Add any notes about this review...",
                )}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            </div>

            {/* Footer actions (fixed) — strong, accessible primary/danger styling */}
            <div className="border-t border-border bg-surface/80 p-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRejectPayment(selectedRequest)}
                  disabled={isUpdating}
                  className="btn-danger-strong flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm"
                >
                  {isUpdating ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      {t("admin.payments.reject", "Reject")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePayment(selectedRequest)}
                  disabled={isUpdating}
                  className="btn-success-strong flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm"
                >
                  {isUpdating ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {t("admin.payments.approve", "Approve")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


