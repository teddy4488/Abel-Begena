"use client";

import { motion } from "framer-motion";
import { X, Loader2, FileText } from "lucide-react";
import { useGetStudentPaymentReportQuery } from "@/store/api/attendanceApi";
import { useI18n } from "@/components/providers/I18nProvider";

type StudentPaymentRow = {
  month: number;
  year: number;
  amount?: number;
  status: "paid" | "unpaid";
  dueDate?: string | null;
  dueDateInferred?: boolean;
  duedate?: string[];
  period?: number;
  paidAt?: string;
  receiptUrl?: string;
};

export default function StudentPaymentsModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data: report, isFetching, isError } = useGetStudentPaymentReportQuery(studentId, { skip: !studentId });

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t("monthlyPayments.payments.title", "Payments")}</p>
            <h3 className="text-xl font-serif text-primary">{report?.student?.fullName ?? t("monthlyPayments.payments.unknown", "Student")}</h3>
          </div>
          <div className="flex items-center gap-3">
            {report && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t("monthlyPayments.payments.totalPaid", "Total paid")}</p>
                <p className="mt-0.5 font-semibold text-primary">{new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(report.totalPaid ?? 0)}</p>
              </div>
            )}
            <button type="button" onClick={onClose} className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10 transition" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-[200px]">
          {isFetching ? (
            <p className="py-4 text-sm text-foreground/60 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("monthlyPayments.loading", "Loading...")}</p>
          ) : isError ? (
            <p className="py-4 text-sm text-foreground/60">{t("monthlyPayments.error", "Unable to load payments.")}</p>
          ) : !report || (report.payments || []).length === 0 ? (
            <p className="py-4 text-sm text-foreground/60">{t("monthlyPayments.payments.empty", "No payment records found.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.25em] text-secondary/70">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t("monthlyPayments.payments.table.period", "Period")}</th>
                    <th className="px-3 py-2">{t("monthlyPayments.payments.table.amount", "Amount")}</th>
                    <th className="px-3 py-2">{t("monthlyPayments.payments.table.status", "Status")}</th>
                    <th className="px-3 py-2">{t("monthlyPayments.payments.table.dueDate", "Due Date")}</th>
                    <th className="px-3 py-2">{t("monthlyPayments.payments.table.paidAt", "Paid At")}</th>
                    <th className="px-3 py-2">{t("monthlyPayments.receipt", "Receipt")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(report.payments || []).map((p: StudentPaymentRow, idx: number) => (
                    <tr key={`${p.year}-${p.month}-${idx}`}>
                      <td className="px-3 py-3 align-top text-xs text-foreground/70">{idx + 1}</td>
                      <td className="px-3 py-3 align-top text-xs text-foreground/70">{p.year}-{String(p.month).padStart(2, "0")}</td>
                      <td className="px-3 py-3 align-top">{new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(p.amount ?? 0)}</td>
                      <td className="px-3 py-3 align-top"><span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-foreground/5 text-foreground/80">{p.status}</span></td>
                      <td className="px-3 py-3 align-top">
                        {(() => {
                          let displayDate: Date | null = null;
                          if (p.duedate && Array.isArray(p.duedate) && p.duedate.length > 0) {
                            if (p.period && p.period >= 1 && p.period <= p.duedate.length) {
                              displayDate = new Date(p.duedate[p.period - 1]);
                            } else {
                              displayDate = new Date(p.duedate[0]);
                            }
                          } else if (p.dueDate) {
                            displayDate = new Date(p.dueDate);
                          }

                          return displayDate ? (
                            <div className="flex items-center gap-2">
                              <span>{displayDate.toLocaleDateString()}</span>
                              {p.dueDateInferred && (
                                <span title={t("monthlyPayments.payments.inferredTooltip", "Due date inferred from registration date")} className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t("monthlyPayments.payments.inferredBadge", "Inferred")}</span>
                              )}
                            </div>
                          ) : (
                            "—"
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 align-top">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</td>
                      <td className="px-3 py-3 align-top">
                        {p.receiptUrl ? (
                          <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold transition hover:border-secondary">
                            <FileText className="h-4 w-4" />
                            {t("monthlyPayments.viewReceipt", "View Receipt")}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60">{t("common.close", "Close")}</button>
        </div>
      </motion.div>
    </div>
  );
}
