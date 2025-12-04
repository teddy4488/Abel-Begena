"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  useCreateBlockMutation,
  useDeleteBlockMutation,
  useGetAllBlocksQuery,
  useUpdateBlockMutation,
  type CmsBlock,
} from "@/store/api/cmsApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { FileText, Edit, Trash2, Loader2, Save, X } from "lucide-react";

const emptyBlock = {
  key: "",
  label: "",
  description: "",
  en: "",
  am: "",
};

export default function AdminCmsPage() {
  const { data: blocks, isLoading } = useGetAllBlocksQuery();
  const [createBlock, { isLoading: isCreating }] = useCreateBlockMutation();
  const [updateBlock, { isLoading: isUpdating }] = useUpdateBlockMutation();
  const [deleteBlock, { isLoading: isDeleting }] = useDeleteBlockMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBlock);
  const { pushToast } = useToast();
  const { t } = useI18n();

  const startEdit = (block: CmsBlock) => {
    setEditingKey(block.key);
    setForm({
      key: block.key,
      label: block.label,
      description: block.description ?? "",
      en: block.content?.en ?? "",
      am: block.content?.am ?? "",
    });
  };

  const reset = () => {
    setEditingKey(null);
    setForm(emptyBlock);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingKey) {
        await updateBlock({
          key: editingKey,
          data: { label: form.label, description: form.description, en: form.en, am: form.am },
        }).unwrap();
        pushToast({
          title: t("admin.cms.toast.updated", "Block updated"),
          variant: "success",
        });
      } else {
        await createBlock({
          key: form.key,
          label: form.label,
          description: form.description,
          content: { en: form.en, am: form.am },
        }).unwrap();
        pushToast({
          title: t("admin.cms.toast.created", "Block created"),
          variant: "success",
        });
      }
      reset();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.cms.toast.error", "Unable to save block"),
        variant: "error",
      });
    }
  };

  const handleDelete = async (key: string) => {
    if (
      !confirm(
        t(
          "admin.cms.confirmDelete",
          "Are you sure you want to delete this content block? This action cannot be undone.",
        ),
      )
    ) {
      return;
    }
    try {
      await deleteBlock(key).unwrap();
      pushToast({
        title: t("admin.cms.toast.deleted", "Block deleted"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.cms.toast.deleteError", "Unable to delete block"),
        variant: "error",
      });
    }
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.cms.kicker", "Content Management")}
        </p>
        <h1 className="text-2xl font-serif text-primary sm:text-3xl md:text-4xl">
          {t("admin.cms.title", "CMS Blocks")}
        </h1>
        <p className="mt-2 text-xs text-foreground/70 sm:text-sm">
          {t(
            "admin.cms.subtitle",
            "Manage reusable content blocks for the website. These blocks can be used across pages.",
          )}
        </p>
      </motion.div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <motion.form
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {t("admin.cms.cms", "CMS")}
              </p>
              <h2 className="text-lg font-serif text-primary sm:text-xl">
                {editingKey
                  ? t("admin.cms.updateBlock", "Update copy block")
                  : t("admin.cms.createBlock", "Create copy block")}
              </h2>
            </div>
            {editingKey && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-secondary hover:underline"
              >
                <X className="h-3 w-3" />
                {t("button.reset", "Reset")}
              </button>
            )}
          </div>
        {!editingKey && (
          <input
            required
            value={form.key}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value.trim().toLowerCase() }))}
            placeholder="Key (e.g. hero.headline)"
            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <input
            required
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Label"
            className="rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            className="rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <textarea
            value={form.en}
            onChange={(e) => setForm((prev) => ({ ...prev, en: e.target.value }))}
            placeholder="English content"
            rows={4}
            className="rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          />
          <textarea
            value={form.am}
            onChange={(e) => setForm((prev) => ({ ...prev, am: e.target.value }))}
            placeholder="Amharic content"
            rows={4}
            className="rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          />
        </div>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isCreating || isUpdating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-95 disabled:opacity-50"
          >
            {(isCreating || isUpdating) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("button.saving", "Saving...")}
              </>
            ) : editingKey ? (
              <>
                <Save className="h-4 w-4" />
                {t("admin.cms.saveBlock", "Save block")}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                {t("admin.cms.createBlock", "Create block")}
              </>
            )}
          </motion.button>
        </motion.form>
        <div className="rounded-3xl border border-border bg-surface">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-foreground/70">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              {t("admin.cms.loading", "Loading content blocks...")}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(blocks ?? []).map((block) => (
                  <tr key={block.key}>
                    <td className="px-4 py-3 font-mono text-xs">{block.key}</td>
                    <td className="px-4 py-3">{block.label}</td>
                    <td className="px-4 py-3 text-foreground/70">
                      {block.content?.en?.slice(0, 60) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <button
                        type="button"
                        onClick={() => startEdit(block)}
                        className="mr-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 uppercase tracking-[0.3em] transition hover:bg-secondary/10"
                      >
                        <Edit className="h-3 w-3" />
                        {t("button.edit", "Edit")}
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(block.key)}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-3 py-1 uppercase tracking-[0.3em] text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        {t("button.delete", "Delete")}
                      </button>
                    </td>
                  </tr>
                ))}
                {!blocks?.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-foreground/70"
                    >
                      {t("admin.cms.empty", "No content blocks yet.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

