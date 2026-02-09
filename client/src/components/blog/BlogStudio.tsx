"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useCreatePostMutation,
  useDeletePostMutation,
  useGetManagePostsQuery,
  useUpdatePostMutation,
  useUploadBlogImageMutation,
  useGetManageCommentsQuery,
} from "@/store/api/blogApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { motion } from "framer-motion";
import { Upload, X, Loader2 } from "lucide-react";

type BlogStudioProps = {
  filterByAuthorId?: string;
  title?: string;
};

const emptyForm = {
  title: "",
  slug: "",
  coverImage: "",
  content: "",
  isPublished: false,
  status: "draft" as "draft" | "pending" | "published",
};

export function BlogStudio({
  filterByAuthorId,
  title = "Heritage Editor",
}: BlogStudioProps) {
  const { data: posts = [] } = useGetManagePostsQuery();
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadBlogImageMutation();
  const { pushToast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";
  const { data: allComments = [] } = useGetManageCommentsQuery(undefined, {
    skip: !isAdmin,
  });
  const [search, setSearch] = useState("");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [form, setForm] = useState({
    ...emptyForm,
  });

  const filteredPosts = useMemo(() => {
    const normalized = search.toLowerCase();
    return posts.filter((post) => {
      const matchesAuthor =
        !filterByAuthorId || post.author?._id === filterByAuthorId;
      const matchesSearch =
        !normalized ||
        post.title.toLowerCase().includes(normalized) ||
        post.slug.toLowerCase().includes(normalized);
      return matchesAuthor && matchesSearch;
    });
  }, [filterByAuthorId, posts, search]);

  const commentCounts = useMemo(() => {
    const map = new Map<string, number>();
    allComments.forEach((c) => {
      const pid =
        typeof c.postId === "object" && c.postId != null && "_id" in c.postId
          ? String((c.postId as { _id: unknown })._id)
          : (c.postId as unknown as string);
      if (pid) {
        map.set(pid, (map.get(pid) ?? 0) + 1);
      }
    });
    return map;
  }, [allComments]);

  useEffect(() => {
    if (!activePostId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ ...emptyForm });
      setCoverImageFile(null);
      setCoverImagePreview("");
      return;
    }
    const post = posts.find((p) => p._id === activePostId);
    if (post) {
      setForm({
        title: post.title,
        slug: post.slug,
        coverImage: post.coverImage,
        content: post.content,
        isPublished: post.isPublished,
        status: post.status ?? (post.isPublished ? "published" : "draft"),
      });
      setCoverImagePreview(post.coverImage || "");
      setCoverImageFile(null);
    }
  }, [activePostId, posts]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      pushToast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "error",
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      pushToast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "error",
      });
      return;
    }

    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));

    // Upload image
    try {
      const result = await uploadImage(file).unwrap();
      setForm((prev) => ({ ...prev, coverImage: result.imageUrl }));
      pushToast({
        title: "Image uploaded",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "error",
      });
      setCoverImageFile(null);
      setCoverImagePreview("");
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = isAdmin
        ? form
        : { ...form, isPublished: false, status: "pending" as const };

      if (activePostId) {
        await updatePost({
          id: activePostId,
          data: payload,
        }).unwrap();
        pushToast({ title: "Post updated", variant: "success" });
      } else {
        await createPost(payload).unwrap();
        pushToast({
          title: isAdmin ? "Post published" : "Post submitted",
          description: isAdmin
            ? undefined
            : "An admin will review and publish this post.",
          variant: "success",
        });
      }
      setForm({ ...emptyForm });
      setActivePostId(null);
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Editor error",
        description: "Unable to save post.",
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!activePostId) return;
    try {
      await deletePost(activePostId).unwrap();
      pushToast({ title: "Post deleted", variant: "success" });
      setActivePostId(null);
      setForm({ ...emptyForm });
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Unable to delete",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6 rounded-[32px]  surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {title}
          </p>
          <h3 className="text-2xl font-serif text-primary">Compose a story</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {isAdmin ? (
            <label className="flex items-center gap-2 font-semibold text-foreground/70">
              <input
                type="checkbox"
                checked={form.isPublished || form.status === "published"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublished: e.target.checked,
                    status: e.target.checked ? "published" : "draft",
                  }))
                }
              />
              Publish immediately
            </label>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
              Status: Pending approval
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setActivePostId(null);
              setForm({ ...emptyForm });
            }}
            className="rounded-full  px-3 py-1 text-xs uppercase tracking-widest text-foreground/70"
          >
            New Post
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drafts"
            className="w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          <div className="space-y-2">
            {filteredPosts.map((post) => (
              <button
                key={post._id}
                type="button"
                onClick={() => setActivePostId(post._id)}
                className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                  post._id === activePostId
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-border text-foreground/70 hover:border-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {post.title}
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
                      {commentCounts.get(post._id) ?? 0}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      post.status === "published"
                        ? "bg-green-500/10 text-green-600"
                        : post.status === "pending"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-slate-500/10 text-slate-600"
                    }`}
                  >
                    {post.status ?? (post.isPublished ? "published" : "draft")}
                  </span>
                </div>
              </button>
            ))}
            {!filteredPosts.length && (
              <p className="text-xs text-foreground/50">
                No posts match your filters.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Slug (optional)"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
            <div className="space-y-2">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isUploadingImage}
                />
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-1 rounded-2xl card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 cursor-pointer hover:card-elevated90 ${
                      isUploadingImage ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUploadingImage ? (
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : coverImagePreview ? (
                      <div className="flex items-center justify-between">
                        <span className="text-foreground/70 truncate">Image selected</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverImageFile(null);
                            setCoverImagePreview("");
                            setForm((prev) => ({ ...prev, coverImage: "" }));
                          }}
                          className="ml-2 text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Upload className="h-4 w-4" />
                        <span>Upload cover image</span>
                      </div>
                    )}
                  </div>
                </div>
              </label>
              {coverImagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <Image
                    src={coverImagePreview}
                    alt="Cover preview"
                    width={800}
                    height={200}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary mb-1 block">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as "draft" | "pending" | "published",
                      isPublished: e.target.value === "published",
                    }))
                  }
                  className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="flex items-end text-xs text-foreground/70">
                <p>Admins can publish; teachers submit for approval.</p>
              </div>
            </div>
          )}
          <textarea
            rows={8}
            placeholder="Write in Markdown..."
            value={form.content}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, content: e.target.value }))
            }
            className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={isCreating || isUpdating}
              onClick={handleSubmit}
              className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
            >
              {activePostId ? "Update Post" : isAdmin ? "Publish Entry" : "Save for Review"}
            </motion.button>
            {activePostId && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-full  px-4 py-3 text-sm font-semibold text-red-500 disabled:opacity-60"
              >
                Delete Post
              </motion.button>
            )}
          </div>

          <div className="space-y-2 rounded-2xl  card-elevated60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              Live preview
            </p>
            <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-primary prose-p:text-foreground">
              {form.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {form.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm text-foreground/60">
                  Start writing to see a preview.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

