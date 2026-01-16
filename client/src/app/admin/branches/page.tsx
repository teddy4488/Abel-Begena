"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  useGetBranchesAdminQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  type Branch,
} from "@/store/api/branchApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { extractErrorMessage } from "@/lib/errors";
import { motion } from "framer-motion";
import { Loader2, MapPin, Plus, Trash2, Save, Globe2, X } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

const BranchMap = dynamic(
  () => import("@/components/branches/BranchAdminMap"),
  { ssr: false },
);

type BranchFormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  isActive: boolean;
};

const emptyForm: BranchFormState = {
  name: "",
  slug: "",
  description: "",
  address: "",
  city: "",
  region: "",
  latitude: null,
  longitude: null,
  radiusMeters: 600,
  isActive: true,
};

export default function AdminBranchesPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { data: branches, isLoading, isError, refetch } =
    useGetBranchesAdminQuery();
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  const [form, setForm] = useState<BranchFormState>(emptyForm);
  const [showModal, setShowModal] = useState(false);

  const isEditing = Boolean(form.id);

  const handleEdit = (branch: Branch) => {
    setForm({
      id: branch._id,
      name: branch.name,
      slug: branch.slug,
      description: branch.description ?? "",
      address: branch.address ?? "",
      city: branch.city ?? "",
      region: branch.region ?? "",
      latitude: branch.location.coordinates[1],
      longitude: branch.location.coordinates[0],
      radiusMeters: branch.radiusMeters ?? 600,
      isActive: branch.isActive,
    });
    setShowModal(true);
  };

  const handleReset = () => {
    setForm(emptyForm);
    setShowModal(false);
  };

  const handleNewBranch = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  // deletion handled via confirm modal (requestDelete / confirmDelete)

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setConfirmLoading(true);
    try {
      await deleteBranch(pendingDeleteId).unwrap();
      pushToast({
        title: t("branches.admin.deletedTitle", "Branch deleted"),
        description: t(
          "branches.admin.deletedDesc",
          "The branch has been removed from the map.",
        ),
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: t("branches.admin.errorTitle", "Unable to delete branch"),
        description: extractErrorMessage(
          error,
          t("branches.admin.genericError", "An unexpected error occurred")
        ),
        variant: "error",
      });
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.latitude == null || form.longitude == null) {
      pushToast({
        title: t("branches.admin.locationRequired", "Location required"),
        description: t(
          "branches.admin.locationRequiredDesc",
          "Please pick a location on the map for this branch.",
        ),
        variant: "error",
      });
      return;
    }

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      region: form.region || undefined,
      latitude: form.latitude,
      longitude: form.longitude,
      radiusMeters: form.radiusMeters,
      isActive: form.isActive,
    };

    try {
      if (form.id) {
        await updateBranch({ id: form.id, data: payload }).unwrap();
      } else {
        await createBranch(payload).unwrap();
      }
      handleReset();
      pushToast({
        title: t(
          "branches.admin.savedTitle",
          form.id ? "Branch updated" : "Branch created",
        ),
        description: t(
          "branches.admin.savedDesc",
          "Branch details have been saved.",
        ),
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: t("branches.admin.errorTitle", "Unable to save branch"),
        description: extractErrorMessage(
          error,
          t("branches.admin.saveError", "Failed to save branch details")
        ),
        variant: "error",
      });
    }
  };

  const isSubmitting = isCreating || isUpdating;

  const mapBranches = useMemo(
    () => branches ?? [],
    [branches],
  );

  const stats = useMemo(() => {
    const total = mapBranches.length;
    const active = mapBranches.filter((b) => b.isActive).length;
    const avgRadius =
      total > 0
        ? Math.round(
            mapBranches.reduce((sum, branch) => sum + (branch.radiusMeters ?? 0), 0) /
              total,
          )
        : 0;
    const coverageKm = mapBranches.reduce(
      (sum, branch) => sum + ((branch.radiusMeters ?? 0) / 1000) * 2,
      0,
    );
    return { total, active, avgRadius, coverageKm };
  }, [mapBranches]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full  px-4 py-2 text-sm text-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("branches.admin.loading", "Loading branches...")}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 rounded-3xl border border-red-500/30 bg-red-500/5 p-6">
        <p className="text-sm font-semibold text-red-500">
          {t("branches.admin.errorTitle", "Unable to load branches")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10"
        >
          <Loader2 className="h-3 w-3" />
          {t("button.retry", "Retry")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            {t("branches.admin.kicker", "Locations")}
          </p>
          <h1 className="mt-1 text-2xl font-serif text-primary md:text-3xl">
            {t("branches.admin.title", "Branches & Studios")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground/70">
            {t(
              "branches.admin.subtitle",
              "Manage Addis Ababa branches, update their map coordinates, and keep visitors oriented to your physical conservatories.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewBranch}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg transition hover:brightness-95"
        >
          <Plus className="h-4 w-4" />
          {t("branches.admin.newBranch", "New branch")}
        </button>
      </header>

      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl  card-elevated70 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
              {t("branches.admin.stats.total", "Total branches")}
            </p>
            <p className="mt-1 text-2xl font-serif text-primary">{stats.total}</p>
          </div>
          <div className="rounded-2xl  card-elevated70 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
              {t("branches.admin.stats.active", "Active")}
            </p>
            <p className="mt-1 text-2xl font-serif text-primary">{stats.active}</p>
          </div>
          <div className="rounded-2xl  card-elevated70 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
              {t("branches.admin.stats.coverage", "Coverage perimeters")}
            </p>
            <p className="mt-1 text-2xl font-serif text-primary">
              {stats.coverageKm.toFixed(1)} km
            </p>
          </div>
          <div className="rounded-2xl  card-elevated70 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
              {t("branches.admin.stats.radius", "Avg radius")}
            </p>
            <p className="mt-1 text-2xl font-serif text-primary">
              {stats.avgRadius} m
            </p>
          </div>
        </div>
      </div>

      {/* Map Section - Full Width */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl surface-elevated p-5 shadow-[0_20px_50px_var(--color-primary-glow)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-secondary" />
            <p className="text-sm font-semibold text-primary">
              {t("branches.admin.mapTitle", "Map overview")}
            </p>
          </div>
          <p className="text-xs text-foreground/60">
            {t(
              "branches.admin.mapHint",
              "Click on the map to set coordinates and radius for each branch.",
            )}
          </p>
        </div>

        <div className="relative h-[500px] overflow-hidden rounded-2xl card-elevated80">
          <BranchMap
            branches={mapBranches}
            selectedBranchId={form.id ?? null}
            radiusMeters={form.radiusMeters}
            onPositionChange={(lat, lng) =>
              setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
            }
          />
        </div>
      </motion.section>

      {/* Branch List */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-3xl surface-elevated p-5 shadow-[0_20px_50px_var(--color-primary-glow)]"
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            {t("branches.admin.listTitle", "Existing branches")}
          </p>
        </div>
        {mapBranches.length === 0 ? (
          <p className="text-xs text-foreground/60">
            {t(
              "branches.admin.listEmpty",
              "No branches yet. Create your first location above.",
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {mapBranches.map((branch) => (
              <div
                key={branch._id}
                className="flex items-center justify-between gap-3 rounded-2xl card-elevated80 px-3 py-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() => handleEdit(branch)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <MapPin className="h-3 w-3" />
                  </span>
                  <span>
                    <span className="block font-semibold text-primary">
                      {branch.name}
                    </span>
                    <span className="text-foreground/60">
                      {branch.address || branch.city || branch.slug}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(branch._id)}
                  disabled={isDeleting}
                  aria-label={t("branches.admin.delete", "Delete branch")}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Branch Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8" onClick={handleReset}>
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            className="relative z-[10000] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-elevated p-6 shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("branches.admin.kicker", "Locations")}
                </p>
                <h2 className="text-xl font-serif text-primary">
                  {isEditing
                    ? t("branches.admin.form.editTitle", "Edit branch")
                    : t("branches.admin.form.createTitle", "Create new branch")}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Map for selecting coordinates - Required for new branches */}
              {!isEditing && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("branches.admin.form.selectLocation", "Select Location on Map")} *
                  </label>
                  <div className="relative h-[300px] overflow-hidden rounded-2xl border-2 border-dashed border-secondary/30 bg-secondary/5">
                    <BranchMap
                      branches={[]}
                      selectedBranchId={null}
                      radiusMeters={form.radiusMeters}
                      onPositionChange={(lat, lng) =>
                        setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                      }
                    />
                    {form.latitude == null || form.longitude == null ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                        <p className="text-sm font-semibold text-secondary">
                          {t("branches.admin.form.clickMap", "Click on the map to select location")}
                        </p>
                      </div>
                    ) : (
                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-secondary/90 p-3 text-xs text-white shadow-lg">
                        <p className="font-semibold mb-1">
                          {t("branches.admin.form.selectedLocation", "Selected Location")}
                        </p>
                        <p className="font-mono">
                          {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.radius", "Radius (m)")}
                </label>
                <input
                  type="range"
                  min={100}
                  max={3000}
                  value={form.radiusMeters}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      radiusMeters: Number(e.target.value) || 0,
                    }))
                  }
                  className="flex-1"
                />
                <span className="text-xs text-foreground/60 font-semibold">
                  {form.radiusMeters} m
                </span>
              </div>
              {form.latitude != null && form.longitude != null && (
                <div className="rounded-2xl bg-secondary/5 p-3 text-xs">
                  <p className="text-secondary/70 mb-1">
                    {t("branches.admin.form.coordsLabel", "Coordinates")}
                  </p>
                  <p className="font-mono text-primary">
                    {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                  </p>
                </div>
              )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.name", "Name")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.slug", "Slug")}
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm lowercase outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("branches.admin.form.description", "Description")}
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.address", "Address")}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.city", "City")}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.region", "Region")}
                </label>
                <input
                  type="text"
                  value={form.region}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, region: e.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("branches.admin.form.radius", "Radius (m)")}
                </label>
                <input
                  type="number"
                  min={100}
                  max={3000}
                  value={form.radiusMeters}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      radiusMeters: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-1 w-full rounded-2xl  card-elevated80 px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="branch-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border accent-secondary"
                />
                <label
                  htmlFor="branch-active"
                  className="text-xs font-medium text-foreground/80"
                >
                  {t("branches.admin.form.isActive", "Active")}
                </label>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-foreground/60 hover:text-secondary"
              >
                {t("button.cancel", "Cancel")}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("branches.admin.form.saving", "Saving...")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditing
                    ? t("button.save", "Save")
                    : t("branches.admin.form.createCta", "Create branch")}
                </>
              )}
            </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
      <ConfirmModal
        open={confirmOpen}
        title={t("branches.admin.confirmDelete", "Delete this branch?")}
        description={t(
          "branches.admin.confirmDeleteDesc",
          "This action cannot be undone. Are you sure you want to delete this branch?",
        )}
        confirmLabel={t("button.delete", "Delete")}
        cancelLabel={t("button.cancel", "Cancel")}
        isLoading={confirmLoading}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}