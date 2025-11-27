"use client";

import { useState } from "react";
import {
  useCreateBlockMutation,
  useDeleteBlockMutation,
  useGetAllBlocksQuery,
  useUpdateBlockMutation,
  type CmsBlock,
} from "@/store/api/cmsApi";

const emptyBlock = {
  key: "",
  label: "",
  description: "",
  en: "",
  am: "",
};

export default function AdminCmsPage() {
  const { data: blocks } = useGetAllBlocksQuery();
  const [createBlock] = useCreateBlockMutation();
  const [updateBlock] = useUpdateBlockMutation();
  const [deleteBlock] = useDeleteBlockMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBlock);

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
    if (editingKey) {
      await updateBlock({
        key: editingKey,
        data: { label: form.label, description: form.description, en: form.en, am: form.am },
      });
    } else {
      await createBlock({
        key: form.key,
        label: form.label,
        description: form.description,
        content: { en: form.en, am: form.am },
      });
    }
    reset();
  };

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-border bg-surface p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
              CMS
            </p>
            <h2 className="text-xl font-serif text-primary">
              {editingKey ? "Update copy block" : "Create copy block"}
            </h2>
          </div>
          {editingKey && (
            <button
              type="button"
              onClick={reset}
              className="text-xs uppercase tracking-[0.3em] text-secondary"
            >
              Reset
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
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {editingKey ? "Save block" : "Create block"}
        </button>
      </form>
      <div className="rounded-3xl border border-border bg-surface">
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
                    className="mr-3 rounded-full border border-border px-3 py-1 uppercase tracking-[0.3em]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteBlock(block.key)}
                    className="rounded-full border border-border px-3 py-1 uppercase tracking-[0.3em] text-red-500"
                  >
                    Delete
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
                  No content blocks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

