"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ImageIcon,
  Loader2,
  Megaphone,
  Play,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  X,
} from "lucide-react";
import {
  useGetAllAdsQuery,
  useUploadAdMediaMutation,
  useCreateAdMutation,
  useUpdateAdMutation,
  useDeleteAdMutation,
  type Advertisement,
} from "@/store/api/advertisementApi";
import { useToast } from "@/components/providers/ToastProvider";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Pagination from "@/components/ui/Pagination";

type FormState = {
  title: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const emptyForm: FormState = {
  title: "",
  isActive: true,
  startDate: "",
  endDate: "",
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminAdvertisementsPage() {
  const { data: ads = [], isLoading } = useGetAllAdsQuery();
  const [uploadMedia, { isLoading: isUploading }] = useUploadAdMediaMutation();
  const [createAd, { isLoading: isCreating }] = useCreateAdMutation();
  const [updateAd, { isLoading: isUpdating }] = useUpdateAdMutation();
  const [deleteAd, { isLoading: isDeleting }] = useDeleteAdMutation();
  const { pushToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploadedMedia, setUploadedMedia] = useState<{
    mediaUrl: string;
    mediaType: "video" | "image";
  } | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewAd, setPreviewAd] = useState<Advertisement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = ads.length > 0 ? Math.ceil(ads.length / itemsPerPage) : 1;
  const paginatedAds = ads.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  const reset = () => {
    setForm(emptyForm);
    setUploadedMedia(null);
    setPreviewSrc(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewSrc(URL.createObjectURL(file));

    try {
      const result = await uploadMedia(file).unwrap();
      setUploadedMedia(result);
      pushToast({
        title: "Media uploaded",
        description: "File uploaded successfully. Fill in the details and save.",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Upload failed",
        description: "Could not upload the file. Check the format and size.",
        variant: "error",
      });
      setPreviewSrc(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedMedia) {
      pushToast({
        title: "No media selected",
        description: "Please upload an image or video first.",
        variant: "error",
      });
      return;
    }
    try {
      await createAd({
        mediaUrl: uploadedMedia.mediaUrl,
        mediaType: uploadedMedia.mediaType,
        title: form.title || undefined,
        isActive: form.isActive,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }).unwrap();
      pushToast({
        title: "Advertisement created",
        variant: "success",
      });
      reset();
    } catch {
      pushToast({
        title: "Failed to create advertisement",
        variant: "error",
      });
    }
  };

  const handleToggleActive = async (ad: Advertisement) => {
    try {
      await updateAd({ id: ad._id, data: { isActive: !ad.isActive } }).unwrap();
      pushToast({
        title: ad.isActive ? "Ad deactivated" : "Ad activated",
        variant: "success",
      });
    } catch {
      pushToast({ title: "Failed to update advertisement", variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteAd(confirmDeleteId).unwrap();
      pushToast({ title: "Advertisement deleted", variant: "success" });
    } catch {
      pushToast({ title: "Failed to delete advertisement", variant: "error" });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-secondary" />
          <div>
            <h1 className="text-2xl font-serif text-primary">Advertisements</h1>
            <p className="text-xs text-foreground/60">
              Upload images or videos that appear as pop-ups on the landing and
              student home pages.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90"
          >
            <Plus className="h-4 w-4" />
            New Ad
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--color-divider)] bg-[var(--color-card-bg)] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">
              New Advertisement
            </h2>
            <button
              type="button"
              onClick={reset}
              className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/50 hover:bg-secondary/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* File upload */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/70">
                Media (image or video) *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-divider)] bg-[var(--color-background-soft)] py-8 transition hover:border-secondary/50"
              >
                {previewSrc ? (
                  uploadedMedia?.mediaType === "video" ? (
                    <video
                      src={previewSrc}
                      className="max-h-48 rounded-lg"
                      controls
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewSrc}
                      alt="preview"
                      className="max-h-48 rounded-lg object-contain"
                    />
                  )
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-foreground/30" />
                    <p className="text-sm text-foreground/50">
                      Click to select an image or video
                    </p>
                    <p className="text-xs text-foreground/30">
                      JPG, PNG, WebP up to 5 MB · MP4, WebM, MOV up to 50 MB
                    </p>
                  </>
                )}
                {isUploading && (
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/70">
                Title (optional)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Abel Begena Live Event – July 2026"
                maxLength={120}
                className="w-full rounded-xl border border-[var(--color-divider)] bg-[var(--color-background-soft)] px-3 py-2 text-sm outline-none focus:border-secondary"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground/70">
                  Start date (optional)
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--color-divider)] bg-[var(--color-background-soft)] px-3 py-2 text-sm outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground/70">
                  End date (optional)
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--color-divider)] bg-[var(--color-background-soft)] px-3 py-2 text-sm outline-none focus:border-secondary"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className="text-secondary"
                aria-label="Toggle active"
              >
                {form.isActive ? (
                  <ToggleRight className="h-8 w-8" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-foreground/40" />
                )}
              </button>
              <span className="text-sm text-foreground/70">
                {form.isActive
                  ? "Active — will show immediately"
                  : "Inactive — saved but not shown"}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground/60 hover:bg-secondary/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUploading || !uploadedMedia}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Advertisement
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-foreground/40">
          <Megaphone className="h-10 w-10" />
          <p className="text-sm">No advertisements yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedAds.map((ad) => (
            <motion.div
              key={ad._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 rounded-2xl border border-[var(--color-divider)] bg-[var(--color-card-bg)] p-4"
            >
              {/* Thumbnail */}
              {ad.mediaType === "video" ? (
                <div
                  className="group relative h-16 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-black"
                  onClick={() => setPreviewAd(ad)}
                  title="Click to preview"
                >
                  <video
                    src={ad.mediaUrl}
                    preload="metadata"
                    muted
                    className="h-full w-full object-cover"
                    onLoadedMetadata={(e) => {
                      e.currentTarget.currentTime = 1;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/55">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.mediaUrl}
                    alt={ad.title ?? "Ad"}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {ad.mediaType === "video" ? (
                    <Play className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />
                  )}
                  <p className="truncate text-sm font-semibold text-primary">
                    {ad.title ?? "(no title)"}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-foreground/50">
                  {formatDate(ad.startDate)} – {formatDate(ad.endDate)} ·
                  Created {formatDate(ad.createdAt)}
                </p>
              </div>

              {/* Status badge */}
              <span
                className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  ad.isActive
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-foreground/5 text-foreground/40"
                }`}
              >
                {ad.isActive ? "Active" : "Inactive"}
              </span>

              {/* Actions */}
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleActive(ad)}
                  disabled={isUpdating}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-secondary/10 disabled:opacity-50"
                  aria-label={ad.isActive ? "Deactivate" : "Activate"}
                >
                  {ad.isActive ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-foreground/40" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(ad._id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                  aria-label="Delete advertisement"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {ads.length > 0 && (
            <div className="border-t border-border/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                    Items per page:
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
                  totalItems={ads.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video preview modal */}
      {previewAd && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          onClick={() => setPreviewAd(null)}
        >
          <div
            className="flex w-full max-w-xl flex-col overflow-hidden bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with title + X */}
            <div className="flex shrink-0 items-center justify-between bg-neutral-900 px-4 py-3">
              <p className="truncate text-sm font-medium text-white/80">
                {previewAd.title ?? "Advertisement Preview"}
              </p>
              <button
                type="button"
                onClick={() => setPreviewAd(null)}
                className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/20 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Video constrained to viewport height */}
            <video
              src={previewAd.mediaUrl}
              controls
              autoPlay
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Delete advertisement?"
        description="This will permanently remove the ad. It will stop showing immediately."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
