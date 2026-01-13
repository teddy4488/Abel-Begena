"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useGetAllFaqQuery,
  useUpdateFaqMutation,
  type FaqItem,
} from "@/store/api/faqApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Loader2, Plus, Save, Trash2, X, CheckCircle, Circle } from "lucide-react";

const emptyFaq: Omit<FaqItem, "_id"> = {
  question: "",
  answer: "",
  order: 0,
  isActive: true,
};

export default function AdminFaqPage() {
  const { data: faqs = [], isLoading, refetch } = useGetAllFaqQuery();
  const [createFaq, { isLoading: isCreating }] = useCreateFaqMutation();
  const [updateFaq, { isLoading: isUpdating }] = useUpdateFaqMutation();
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyFaq);

  useEffect(() => {
    if (!editingId) return;
    const match = faqs.find((f) => f._id === editingId);
    if (match) {
      setForm({
        question: match.question,
        answer: match.answer,
        order: match.order ?? 0,
        isActive: match.isActive ?? true,
      });
    }
  }, [editingId, faqs]);

  const sortedFaqs = useMemo(
    () =>
      [...faqs].sort((a, b) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        if (aOrder === bOrder) {
          return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
        }
        return aOrder - bOrder;
      }),
    [faqs],
  );

  const reset = () => {
    setEditingId(null);
    setForm(emptyFaq);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      pushToast({
        title: t("admin.faq.missing", "Question and answer are required"),
        variant: "error",
      });
      return;
    }
    try {
      if (editingId) {
        await updateFaq({
          id: editingId,
          data: {
            question: form.question.trim(),
            answer: form.answer.trim(),
            order: form.order ?? 0,
            isActive: form.isActive,
          },
        }).unwrap();
        pushToast({
          title: t("admin.faq.updated", "FAQ updated"),
          variant: "success",
        });
      } else {
        await createFaq({
          question: form.question.trim(),
          answer: form.answer.trim(),
          order: form.order ?? 0,
          isActive: form.isActive,
        }).unwrap();
        pushToast({
          title: t("admin.faq.created", "FAQ created"),
          variant: "success",
        });
      }
      reset();
      refetch();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.faq.error", "Unable to save FAQ"),
        variant: "error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        t(
          "admin.faq.confirmDelete",
          "Delete this FAQ? This action cannot be undone.",
        ),
      )
    ) {
      return;
    }
    try {
      await deleteFaq(id).unwrap();
      pushToast({
        title: t("admin.faq.deleted", "FAQ deleted"),
        variant: "success",
      });
      if (editingId === id) {
        reset();
      }
      refetch();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.faq.deleteError", "Unable to delete FAQ"),
        variant: "error",
      });
    }
  };

  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.faq.kicker", "Knowledge Base")}
        </p>
        <h1 className="text-3xl font-serif text-primary">
          {t("admin.faq.title", "Frequently Asked Questions")}
        </h1>
        <p className="text-sm text-foreground/70">
          {t(
            "admin.faq.subtitle",
            "Manage the public FAQ shown on the homepage.",
          )}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.form
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl  surface-elevated p-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif text-primary">
              {editingId
                ? t("admin.faq.edit", "Edit FAQ")
                : t("admin.faq.new", "New FAQ")}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className="rounded-full p-1 text-foreground/70 hover:card-elevated60"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.faq.question", "Question")}
              </label>
              <input
                value={form.question}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, question: e.target.value }))
                }
                className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                placeholder={t("admin.faq.questionPlaceholder", "How do I enroll?")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.faq.answer", "Answer")}
              </label>
              <textarea
                value={form.answer}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, answer: e.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                placeholder={t("admin.faq.answerPlaceholder", "Provide the detailed answer...")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                  {t("admin.faq.order", "Order")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.order ?? 0}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      order: Number(e.target.value ?? 0),
                    }))
                  }
                  className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                  }
                  className="inline-flex items-center gap-2 rounded-full  px-3 py-2 text-sm font-semibold transition hover:border-secondary"
                >
                  {form.isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-secondary" />
                      {t("admin.faq.active", "Active")}
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 text-foreground/50" />
                      {t("admin.faq.inactive", "Inactive")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95 disabled:opacity-60"
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("admin.faq.saving", "Saving...")}
                </>
              ) : editingId ? (
                <>
                  <Save className="h-4 w-4" />
                  {t("admin.faq.save", "Save")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t("admin.faq.add", "Add FAQ")}
                </>
              )}
            </button>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3 rounded-2xl  surface-elevated p-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-primary">
              {t("admin.faq.list", "FAQ List")}
            </h2>
            <button
              type="button"
              onClick={refetch}
              className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary hover:underline"
            >
              {t("admin.faq.refresh", "Refresh")}
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-foreground/70">
              {t("admin.faq.loading", "Loading FAQs...")}
            </p>
          ) : !sortedFaqs.length ? (
            <p className="text-sm text-foreground/70">
              {t("admin.faq.empty", "No FAQs yet. Create the first entry.")}
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {sortedFaqs.map((faq) => (
                <div
                  key={faq._id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">
                      {faq.question}
                    </p>
                    <p className="text-sm text-foreground/70 line-clamp-2">
                      {faq.answer}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-secondary/70">
                      {t("admin.faq.orderLabel", "Order")}: {faq.order ?? 0} •{" "}
                      {faq.isActive
                        ? t("admin.faq.active", "Active")
                        : t("admin.faq.inactive", "Inactive")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(faq._id)}
                      className="rounded-full  px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition hover:border-secondary"
                    >
                      {t("button.edit", "Edit")}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(faq._id)}
                      className="rounded-full border border-red-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="mr-1 inline h-3 w-3" />
                      {t("button.delete", "Delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
