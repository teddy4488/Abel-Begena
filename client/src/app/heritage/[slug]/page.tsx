"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Facebook, Twitter, Link as LinkIcon } from "lucide-react";
import { useGetPostBySlugQuery, useGetCommentsQuery, useCreateCommentMutation, useUpdateCommentMutation, useDeleteCommentMutation } from "@/store/api/blogApi";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Edit, Trash2, X, Check } from "lucide-react";
import { useState } from "react";

export default function HeritageArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { t } = useI18n();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const {
    data: post,
    isLoading,
    error,
  } = useGetPostBySlugQuery(slug, { skip: !slug });
  const {
    data: comments = [],
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useGetCommentsQuery(
    post?._id ? { slug, postId: post._id } : { slug, postId: "" },
    { skip: !post?._id },
  );
  const [createComment, { isLoading: isSubmitting }] = useCreateCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();
  const { pushToast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const openDeleteConfirm = (commentId: string) => {
    setPendingDeleteId(commentId);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteComment(pendingDeleteId).unwrap();
      pushToast({
        title: t("heritage.comments.deleted", "Comment deleted"),
        variant: "success",
      });
      void refetchComments();
    } catch {
      pushToast({
        title: t("heritage.comments.deleteError", "Failed to delete comment"),
        variant: "error",
      });
    } finally {
      setConfirmDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // ignore
      }
    }
  };

  if (isLoading) {
    return (
      <article className="min-h-screen bg-background text-foreground transition-colors">
        <Skeleton className="h-[240px] w-full rounded-none sm:h-[320px] md:h-[420px]" />
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <div className="space-y-4 pt-8">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>
      </article>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-foreground transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-4xl sm:text-6xl">📜</p>
          <p className="mt-4 text-base font-semibold text-primary sm:text-lg">
            {t("heritage.single.notFound", "This article could not be found.")}
          </p>
          <button
            type="button"
            onClick={() => router.push("/heritage")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("heritage.single.back", "Back to Heritage")}
          </button>
        </motion.div>
      </div>
    );
  }

  const displayDate = new Date(
    post.publishedAt ?? post.createdAt ?? new Date()
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="min-h-screen bg-background text-foreground">
      {/* Hero with cover image */}
      <div className="relative h-[420px] w-full overflow-hidden md:h-[500px]">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${post.coverImage})` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
        
        {/* Back button */}
        <Link
          href="/heritage"
          className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 py-2 text-sm text-white backdrop-blur-md transition hover:bg-black/50 md:left-8 md:top-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("heritage.single.back")}
        </Link>

        <div className="absolute inset-x-0 bottom-0 px-6 py-8 md:px-12 lg:px-16">
          <div className="mx-auto max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs uppercase tracking-[0.3em] text-secondary"
            >
              {t("heritage.page.kicker")}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-2 text-3xl font-serif text-white md:text-4xl lg:text-5xl"
            >
              {post.title}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-200"
            >
              <span>
                {t("heritage.single.by")}{" "}
                <span className="font-semibold text-white">
                  {post.author?.firstName || post.author?.email || t("heritage.page.editorial")}
                </span>
              </span>
              <span className="text-white/50">•</span>
              <span>{displayDate}</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-3xl space-y-8 px-6 py-12 md:px-8"
      >
        {/* Share buttons */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <p className="text-sm font-semibold text-secondary">
            {t("heritage.single.share")}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-secondary hover:bg-(--color-secondary-soft)"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <a
              href={`https://twitter.com/intent/tweet?url=${
                typeof window !== "undefined"
                  ? encodeURIComponent(window.location.href)
                  : ""
              }&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-secondary hover:bg-(--color-secondary-soft)"
              aria-label="Share on Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${
                typeof window !== "undefined"
                  ? encodeURIComponent(window.location.href)
                  : ""
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-secondary hover:bg-(--color-secondary-soft)"
              aria-label="Share on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <button
              onClick={async () => {
                if (
                  typeof window === "undefined" ||
                  typeof navigator === "undefined" ||
                  !navigator.clipboard?.writeText
                ) {
                  return;
                }
                try {
                  await navigator.clipboard.writeText(window.location.href);
                } catch {
                  // ignore
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition hover:border-secondary hover:bg-(--color-secondary-soft)"
              aria-label="Copy link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Article content */}
        <div className="prose-custom">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-6 mt-10 font-serif text-3xl text-primary md:text-4xl">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-4 mt-8 font-serif text-2xl text-primary md:text-3xl">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-3 mt-6 font-serif text-xl text-primary md:text-2xl">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-6 text-lg leading-relaxed text-foreground/90">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-primary">
                  {children}
                </strong>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-secondary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="mb-6 list-disc space-y-2 pl-6 text-foreground/90">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-6 list-decimal space-y-2 pl-6 text-foreground/90">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-lg leading-relaxed">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-8 border-l-4 border-secondary bg-secondary/5 py-4 pl-6 pr-4 italic text-foreground/80">
                  {children}
                </blockquote>
              ),
              img: ({ src, alt }) => (
                <figure className="my-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt || ""}
                    className="w-full rounded-2xl border border-border"
                  />
                  {alt && (
                    <figcaption className="mt-2 text-center text-sm text-foreground/60">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              ),
              hr: () => (
                <hr className="my-10 border-t border-border" />
              ),
              code: ({ children }) => (
                <code className="rounded bg-secondary/10 px-2 py-1 font-mono text-sm text-secondary">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="my-6 overflow-x-auto rounded-2xl border border-border bg-background/80 p-4">
                  {children}
                </pre>
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Comments */}
        <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">
              {t("heritage.comments.title", "Comments")}
            </p>
            {commentsLoading && (
              <span className="text-xs text-foreground/60">
                {t("heritage.comments.loading", "Loading...")}
              </span>
            )}
          </div>

          {isLoggedIn ? (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commentText.trim() || !post?._id) return;
                try {
                  await createComment({
                    slug,
                    postId: post._id,
                    content: commentText.trim(),
                  }).unwrap();
                  setCommentText("");
                  await refetchComments();
                } catch {
                  // ignore; API errors are surfaced server-side
                }
              }}
            >
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder={t("heritage.comments.placeholder", "Share your thoughts...")}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                >
                  {isSubmitting
                    ? t("heritage.comments.submitting", "Submitting...")
                    : t("heritage.comments.submit", "Post comment")}
                </button>
              </div>
              <p className="text-[11px] text-foreground/60">
                {t("heritage.comments.moderation", "Comments are reviewed before publishing.")}
              </p>
            </form>
          ) : (
            <p className="text-sm text-foreground/70">
              {t("heritage.comments.login", "Log in to join the conversation.")}
            </p>
          )}

          <div className="divide-y divide-border/70">
            {comments.map((c) => {
              const userId = user?._id || user?.id;
              const authorId = typeof c.authorId === 'object' && c.authorId !== null 
                ? (c.authorId as { _id?: string; id?: string })?._id || (c.authorId as { _id?: string; id?: string })?.id 
                : c.authorId;
              const isOwner = isLoggedIn && user && userId && authorId === userId;
              const isEditing = editingCommentId === c._id;
              
              return (
                <div key={c._id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-primary">
                          {c.authorId?.firstName || c.authorId?.email || t("heritage.comments.user", "User")}
                        </p>
                        <span className="text-[10px] text-secondary/50">✝</span>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full rounded-2xl bg-background/80 border border-border px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                            rows={3}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await updateComment({ id: c._id, content: editingText }).unwrap();
                                  setEditingCommentId(null);
                                  setEditingText("");
                                  pushToast({
                                    title: t("heritage.comments.updated", "Comment updated"),
                                    variant: "success",
                                  });
                                } catch {
                                  pushToast({
                                    title: t("heritage.comments.updateError", "Failed to update comment"),
                                    variant: "error",
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
                            >
                              <Check className="h-3 w-3" />
                              {t("button.save", "Save")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingText("");
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background"
                            >
                              <X className="h-3 w-3" />
                              {t("button.cancel", "Cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                            {c.content}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/50 mt-1">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}
                          </p>
                        </>
                      )}
                    </div>
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(c._id);
                            setEditingText(c.content);
                          }}
                          className="rounded-full p-1.5 text-foreground/60 hover:bg-secondary/10 hover:text-secondary transition"
                          aria-label={t("button.edit", "Edit")}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            openDeleteConfirm(c._id);
                          }}
                          className="rounded-full p-1.5 text-foreground/60 hover:bg-red-500/10 hover:text-red-500 transition"
                          aria-label={t("button.delete", "Delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!comments.length && (
              <p className="py-2 text-sm text-foreground/60">
                {t("heritage.comments.empty", "No comments yet. Be the first to comment.")}
              </p>
            )}
          </div>
        </div>

        {/* Back to heritage link */}
        <div className="border-t border-border pt-8">
          <Link
            href="/heritage"
            className="inline-flex items-center gap-2 rounded-full border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("heritage.single.back")}
          </Link>
        </div>

        <ConfirmModal
          open={confirmDeleteOpen}
          title={t("heritage.comments.confirmDeleteTitle", "Delete comment?")}
          description={t("heritage.comments.confirmDelete", "Delete this comment?")}
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
      </motion.div>
    </article>
  );
}