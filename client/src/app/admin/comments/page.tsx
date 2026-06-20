"use client";

import { useState } from "react";
import {
  useGetManageCommentsQuery,
  useDeleteCommentMutation,
} from "@/store/api/blogApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function AdminCommentsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: comments = [], isLoading, refetch, isFetching } =
    useGetManageCommentsQuery(search ? { search } : undefined);
  const [deleteComment, { isLoading: isDeleting }] =
    useDeleteCommentMutation();
  const { pushToast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages =
    comments.length > 0 ? Math.ceil(comments.length / itemsPerPage) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = comments.slice(startIndex, endIndex);

  const openDeleteConfirm = (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteComment(pendingDeleteId).unwrap();
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
    } finally {
      setConfirmDeleteOpen(false);
      setPendingDeleteId(null);
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
            {t("admin.comments.subtitle", "Review and delete comments on posts.")}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
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
            {paginated.map((c) => {
              const postMeta =
                typeof c.postId === "object" && c.postId !== null
                  ? c.postId
                  : undefined;
              const postSlug =
                postMeta?.slug ??
                (typeof c.postId === "string" ? c.postId : "");

              return (
                <div key={c._id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">
                      {c.authorId?.firstName || c.authorId?.email || "User"}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {postMeta?.title ?? "Untitled"} ({postSlug})
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
                      disabled={isDeleting}
                      onClick={() => openDeleteConfirm(c._id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("button.delete", "Delete")}
                    </button>
                  </div>
                </div>
              );
            })}
            {comments.length > 0 && (
              <div className="border-t border-border/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                      {t("pagination.itemsPerPage", "Items per page")}:
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
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
                    totalItems={comments.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title={t("admin.comments.confirmDeleteTitle", "Delete comment?")}
        description={t(
          "admin.comments.confirmDelete",
          "Delete this comment? This cannot be undone.",
        )}
        confirmLabel={t("button.delete", "Delete")}
        cancelLabel={t("button.cancel", "Cancel")}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setConfirmDeleteOpen(false);
            setPendingDeleteId(null);
          }
        }}
      />
    </section>
  );
}
