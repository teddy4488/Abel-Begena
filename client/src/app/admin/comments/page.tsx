"use client";

import { useState } from "react";
import {
  useGetManageCommentsQuery,
  useUpdateCommentStatusMutation,
  useDeleteCommentMutation,
} from "@/store/api/blogApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Loader2, CheckCircle, XCircle, Trash2, RefreshCw } from "lucide-react";

export default function AdminCommentsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: comments = [], isLoading, refetch, isFetching } =
    useGetManageCommentsQuery(search ? { search } : undefined);
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateCommentStatusMutation();
  const [deleteComment, { isLoading: isDeleting }] =
    useDeleteCommentMutation();
  const { pushToast } = useToast();

  const handleStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateStatus({ id, status }).unwrap();
      pushToast({
        title: t("admin.comments.updated", "Comment updated"),
        variant: "success",
      });
      refetch();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.comments.updateError", "Unable to update comment"),
        variant: "error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        t(
          "admin.comments.confirmDelete",
          "Delete this comment? This cannot be undone.",
        ),
      )
    ) {
      return;
    }
    try {
      await deleteComment(id).unwrap();
      pushToast({
        title: t("admin.comments.deleted", "Comment deleted"),
        variant: "success",
      });
      refetch();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.comments.deleteError", "Unable to delete comment"),
        variant: "error",
      });
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("admin.comments.kicker", "Moderation")}
          </p>
          <h1 className="text-3xl font-serif text-primary">
            {t("admin.comments.title", "Comments")}
          </h1>
          <p className="text-sm text-foreground/70">
            {t("admin.comments.subtitle", "Approve, reject, or delete comments on posts.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-full  px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em]"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("admin.comments.refresh", "Refresh")}
        </button>
      </div>

      <div className="rounded-2xl  surface-elevated p-4 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.comments.search", "Search comments")}
            className="flex-1 min-w-[220px] rounded-2xl  card-elevated80 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          {(isLoading || isFetching) && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
        </div>

        {isLoading ? (
          <p className="text-sm text-foreground/70">
            {t("admin.comments.loading", "Loading comments...")}
          </p>
        ) : !comments.length ? (
          <p className="text-sm text-foreground/70">
            {t("admin.comments.empty", "No comments found.")}
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {comments.map((c) => (
              <div key={c._id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">
                    {c.authorId?.firstName || c.authorId?.email || "User"}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {c.postId?.title ?? "Untitled"} ({c.postId?.slug ?? ""})
                  </p>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                    {c.content}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/50">
                    {c.status} •{" "}
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleString()
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatus(c._id, "approved")}
                    className="inline-flex items-center gap-1 rounded-full border border-green-500/60 px-3 py-1 text-xs font-semibold text-green-600 transition hover:bg-green-500/10 disabled:opacity-60"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t("admin.comments.approve", "Approve")}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatus(c._id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/60 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-500/10 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    {t("admin.comments.reject", "Reject")}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(c._id)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("button.delete", "Delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
