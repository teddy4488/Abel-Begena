"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  useCreateProductMutation,
  useGetManageProductsQuery,
  useUpdateProductMutation,
  useUploadProductImageMutation,
  useDeleteProductMutation,
  type InstrumentType,
  type Product,
} from "@/store/api/storeApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Plus, Upload, X, Package, TrendingDown, AlertTriangle, Loader2 } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ConfirmModal from "@/components/ui/ConfirmModal";

const productFormDefaults = {
  name: "",
  instrumentType: "Begena" as InstrumentType,
  shortDescription: "",
  price: "",
  stock: "",
  images: [] as File[],
  isActive: true,
  promoActive: false,
  discountPrice: "",
};

export default function AdminStorePage() {
  const { data: products, isLoading } = useGetManageProductsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [uploadImage] = useUploadProductImageMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [form, setForm] = useState(productFormDefaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingUploads, setPendingUploads] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [promoForms, setPromoForms] = useState<
    Record<string, { discountPrice: string; promoActive: boolean }>
  >({});
  const [promoSavingId, setPromoSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const sortedProducts = useMemo(
    () => [...(products ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedProducts.length]);

  // Stock overview statistics
  const stockStats = useMemo(() => {
    const totalProducts = products?.length ?? 0;
    const totalStock = products?.reduce((sum, p) => sum + (p.stock ?? 0), 0) ?? 0;
    const lowStock = products?.filter((p) => (p.stock ?? 0) < 10 && (p.stock ?? 0) > 0).length ?? 0;
    const outOfStock = products?.filter((p) => (p.stock ?? 0) === 0).length ?? 0;
    const activeProducts = products?.filter((p) => p.isActive).length ?? 0;
    return { totalProducts, totalStock, lowStock, outOfStock, activeProducts };
  }, [products]);

  useEffect(() => {
    setPromoForms((prev) => {
      const next = { ...prev };
      sortedProducts.forEach((product) => {
        if (!next[product._id]) {
          next[product._id] = {
            discountPrice: product.discountPrice?.toString() ?? "",
            promoActive: Boolean(product.promoActive),
          };
        }
      });
      return next;
    });
  }, [sortedProducts]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) {
      next.name = "Name is required";
    }
    if (!form.price || Number(form.price) <= 0) {
      next.price = "Price must be greater than zero";
    }
    if (!form.stock || Number(form.stock) < 0) {
      next.stock = "Stock must be zero or higher";
    }
    if (form.promoActive) {
      const discount = Number(form.discountPrice);
      if (!form.discountPrice) {
        next.discountPrice = "Discount price is required when promo is active";
      } else if (Number.isNaN(discount) || discount <= 0) {
        next.discountPrice = "Enter a valid discount price";
      } else if (discount >= Number(form.price)) {
        next.discountPrice = "Discount must be lower than the base price";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      if (editingId) {
        await updateProduct({
          id: editingId,
          data: {
            name: form.name,
            instrumentType: form.instrumentType,
            shortDescription: form.shortDescription,
            price: Number(form.price),
            stock: Number(form.stock),
            isActive: form.isActive,
            promoActive: form.promoActive,
            discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
          },
        }).unwrap();
      } else {
        // Create product first without images
        const newProduct = await createProduct({
          name: form.name,
          instrumentType: form.instrumentType,
          shortDescription: form.shortDescription,
          price: Number(form.price),
          stock: Number(form.stock),
          images: [],
          isActive: form.isActive,
          promoActive: form.promoActive,
          discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
        }).unwrap();

        // Upload images if any
        if (form.images.length > 0) {
          for (const imageFile of form.images) {
            try {
              await uploadImage({ id: newProduct._id, file: imageFile }).unwrap();
            } catch (err) {
              console.error("Failed to upload image:", err);
            }
          }
        }
      }

      pushToast({
        title: editingId
          ? t("admin.store.productUpdated", "Product updated")
          : t("admin.store.productCreated", "Product created"),
        description: t("admin.store.productCreatedDesc", "The store inventory has been updated."),
        variant: "success",
      });
      setForm(productFormDefaults);
      setErrors({});
      setShowAddForm(false);
      setEditingId(null);
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.store.createError", "Unable to create product"),
        description: t("admin.store.createErrorDesc", "Please verify the form and try again."),
        variant: "error",
      });
    }
  };

  const toggleProduct = async (id: string, isActive?: boolean) => {
    try {
      await updateProduct({ id, data: { isActive: !isActive } }).unwrap();
      pushToast({
        title: "Product updated",
        description: `Product is now ${!isActive ? "visible" : "hidden"}.`,
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Unable to update product",
        variant: "error",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product._id);
    setShowAddForm(true);
    setForm({
      name: product.name ?? "",
      instrumentType: product.instrumentType ?? "Begena",
      shortDescription: product.shortDescription ?? "",
      price: (product.price ?? "").toString(),
      stock: (product.stock ?? "").toString(),
      images: [],
      isActive: product.isActive ?? true,
      promoActive: product.promoActive ?? false,
      discountPrice: product.discountPrice?.toString() ?? "",
    });
    setErrors({});
  };

  const openDeleteProduct = (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteProduct(pendingDeleteId).unwrap();
      pushToast({ title: "Product deleted", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({ title: "Unable to delete product", variant: "error" });
    } finally {
      setConfirmDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleUpload = async (productId: string) => {
    const file = pendingUploads[productId];
    if (!file) {
      pushToast({
        title: "Choose a file first",
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      pushToast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "error",
      });
      return;
    }

    try {
      setUploadingId(productId);
      setUploadProgress((prev) => ({ ...prev, [productId]: 0 }));
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const current = prev[productId] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [productId]: current + 10 };
        });
      }, 200);

      await uploadImage({ id: productId, file }).unwrap();
      
      clearInterval(progressInterval);
      setUploadProgress((prev) => ({ ...prev, [productId]: 100 }));
      
      setTimeout(() => {
        pushToast({
          title: "Image uploaded",
          description: "The product gallery has been updated.",
          variant: "success",
        });
        setPendingUploads((prev) => ({ ...prev, [productId]: null }));
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        setUploadingId(null);
      }, 500);
    } catch (error) {
      console.error(error);
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setUploadingId(null);
      pushToast({
        title: "Upload failed",
        description: "Please try again with a different file.",
        variant: "error",
      });
    }
  };

  const handlePromoInputChange = (
    productId: string,
    field: "discountPrice" | "promoActive",
    value: string | boolean,
  ) => {
    setPromoForms((prev) => ({
      ...prev,
      [productId]: {
        discountPrice:
          field === "discountPrice"
            ? (value as string)
            : prev[productId]?.discountPrice ?? "",
        promoActive:
          field === "promoActive"
            ? (value as boolean)
            : prev[productId]?.promoActive ?? false,
      },
    }));
  };

  const handleSavePromo = async (productId: string, basePrice: number) => {
    const draft = promoForms[productId];
    if (!draft) return;
    const discountValue = draft.discountPrice ? Number(draft.discountPrice) : undefined;

    if (draft.promoActive) {
      if (!draft.discountPrice) {
        pushToast({
          title: "Discount required",
          description: "Enter a discount price before enabling the promo.",
          variant: "error",
        });
        return;
      }
      if (Number.isNaN(discountValue) || discountValue === undefined) {
        pushToast({
          title: "Invalid discount",
          description: "Discount price must be a valid number.",
          variant: "error",
        });
        return;
      }
      if (discountValue >= basePrice) {
        pushToast({
          title: "Discount too high",
          description: "Discount must be lower than the base price.",
          variant: "error",
        });
        return;
      }
    }

    try {
      setPromoSavingId(productId);
      await updateProduct({
        id: productId,
        data: {
          promoActive: draft.promoActive,
          discountPrice: discountValue,
        },
      }).unwrap();
      pushToast({ title: "Promotion updated", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Unable to update promotion",
        variant: "error",
      });
    } finally {
      setPromoSavingId(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        pushToast({
          title: t("admin.store.invalidFile", "Invalid file type"),
          description: t("admin.store.imageOnly", "Please select image files only."),
          variant: "error",
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        pushToast({
          title: t("admin.store.fileTooLarge", "File too large"),
          description: t("admin.store.maxSize", "Maximum file size is 10MB"),
          variant: "error",
        });
        return false;
      }
      return true;
    });
    setForm((prev) => ({ ...prev, images: [...prev.images, ...validFiles] }));
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.store.kicker", "Inventory Management")}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-primary">
          {t("admin.store.title", "Store Products")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t("admin.store.subtitle", "Manage your instrument inventory and stock levels.")}
        </p>
      </motion.div>

      {/* Stock Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="rounded-3xl surface-elevated p-5 card-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {t("admin.store.stats.totalProducts", "Total Products")}
              </p>
              <p className="text-2xl font-bold text-primary">{stockStats.totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl surface-elevated p-5 card-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {t("admin.store.stats.totalStock", "Total Stock")}
              </p>
              <p className="text-2xl font-bold text-primary">{stockStats.totalStock}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl surface-elevated p-5 card-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {t("admin.store.stats.active", "Active")}
              </p>
              <p className="text-2xl font-bold text-primary">{stockStats.activeProducts}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl surface-elevated p-5 card-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {t("admin.store.stats.lowStock", "Low Stock")}
              </p>
              <p className="text-2xl font-bold text-primary">{stockStats.lowStock}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl surface-elevated p-5 card-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {t("admin.store.stats.outOfStock", "Out of Stock")}
              </p>
              <p className="text-2xl font-bold text-primary">{stockStats.outOfStock}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Add Product Button */}
      {!showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            {t("admin.store.addProduct", "Add Product")}
          </button>
        </motion.div>
      )}

      {/* Add Product Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!isCreating) {
                setShowAddForm(false);
                setEditingId(null);
                setForm(productFormDefaults);
                setErrors({});
              }
            }}
          />
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="relative z-10 flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl surface-elevated card-elevated shadow-2xl overflow-hidden"
        >
          <div className="flex-none flex items-center justify-between p-6 pb-0">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {editingId
                  ? t("admin.store.editProduct", "Edit Product")
                  : t("admin.store.newProduct", "New Product")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {editingId
                  ? t("admin.store.editProductTitle", "Update product details")
                  : t("admin.store.addProductTitle", "Add Product to Store")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setForm(productFormDefaults);
                setErrors({});
              }}
              className="rounded-full p-2 text-foreground/70 hover:bg-background transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.store.name", "Product Name")} *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("admin.store.namePlaceholder", "Enter product name")}
                className={`w-full rounded-2xl border px-4 py-2 text-sm ${
                  errors.name ? "border-red-400" : "border-border"
                } card-elevated70 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.store.instrumentType", "Instrument Type")} *
              </label>
              <select
                value={form.instrumentType}
                onChange={(e) => setForm((prev) => ({ ...prev, instrumentType: e.target.value as InstrumentType }))}
                className="w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              >
                {["Begena", "Kirar", "Masinko", "Washint", "Kebero", "Other"].map(
                  (type) => (
                    <option key={type} value={type}>{type}</option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
              {t("admin.store.description", "Description")}
            </label>
            <textarea
              value={form.shortDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
              placeholder={t("admin.store.descriptionPlaceholder", "Enter product description")}
              rows={3}
              className="w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
              {t("admin.store.images", "Product Images")}
            </label>
            <div className="space-y-3">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 card-elevated50 p-6 cursor-pointer hover:border-secondary hover:card-elevated80 transition">
                  <Upload className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium text-foreground/70">
                    {t("admin.store.uploadImages", "Click to upload images (Max 10MB each)")}
                  </span>
                </div>
              </label>
              {form.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {form.images.map((file, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.store.price", "Price")} *
              </label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder={t("admin.store.pricePlaceholder", "0.00")}
                className={`w-full rounded-2xl border px-4 py-2 text-sm ${
                  errors.price ? "border-red-400" : "border-border"
                } card-elevated70 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30`}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500">{errors.price}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.store.stock", "Stock Quantity")} *
              </label>
              <input
                required
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                placeholder={t("admin.store.stockPlaceholder", "0")}
                className={`w-full rounded-2xl border px-4 py-2 text-sm ${
                  errors.stock ? "border-red-400" : "border-border"
                } card-elevated70 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30`}
              />
              {errors.stock && (
                <p className="mt-1 text-xs text-red-500">{errors.stock}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
                {t("admin.store.discountPrice", "Discount Price")}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.discountPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, discountPrice: e.target.value }))}
                placeholder={t("admin.store.discountPlaceholder", "0.00")}
                disabled={!form.promoActive}
                className={`w-full rounded-2xl border px-4 py-2 text-sm ${
                  errors.discountPrice ? "border-red-400" : "border-border"
                } card-elevated70 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60`}
              />
              {errors.discountPrice && (
                <p className="mt-1 text-xs text-red-500">{errors.discountPrice}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-secondary"
              />
              <span className="text-foreground/80">{t("admin.store.active", "Active")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.promoActive}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promoActive: e.target.checked,
                    discountPrice: e.target.checked ? prev.discountPrice : "",
                  }))
                }
                className="h-4 w-4 rounded border-border accent-secondary"
              />
              <span className="text-foreground/80">{t("admin.store.promoActive", "Promo Active")}</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setForm(productFormDefaults);
                setErrors({});
              }}
              className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition hover:border-secondary hover:text-secondary"
            >
              {t("button.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />
                  {t("admin.store.creating", "Creating...")}
                </>
              ) : (
                <>
                  <Plus className="inline-block h-4 w-4 mr-2" />
                  {t("admin.store.createProduct", "Create Product")}
                </>
              )}
            </button>
          </div>
          </div>
        </motion.form>
        </div>
      )}

      <div className="rounded-3xl  surface-elevated p-6">
        <h2 className="text-xl font-serif text-primary">Inventory</h2>
        {isLoading ? (
          <p className="text-sm text-foreground/60">Loading products...</p>
        ) : sortedProducts.length ? (
          <>
            <div className="mt-4 mb-4 flex items-center justify-end gap-2">
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
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
                <option value={64}>64</option>
              </select>
            </div>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              {sortedProducts
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  (currentPage - 1) * itemsPerPage + itemsPerPage,
                )
                .map((product) => (
              <div
                key={product._id}
                className="rounded-2xl /70 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-primary">{product.name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                      {product.instrumentType}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <button
                      type="button"
                      onClick={() => toggleProduct(product._id, product.isActive)}
                      className={`text-xs uppercase tracking-[0.3em] ${
                        product.isActive ? "text-green-500" : "text-foreground/60"
                      }`}
                    >
                      {product.isActive ? "Active" : "Hidden"}
                    </button>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(product)}
                        className="rounded-full border border-border px-3 py-1 font-semibold transition hover:border-secondary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => openDeleteProduct(product._id)}
                        className="rounded-full border border-red-500/50 px-3 py-1 font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground/70">
                  {product.shortDescription || "No description"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-foreground/60">
                  <span>
                    {product.price.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                  <span>
                    {product.promoActive && product.discountPrice
                      ? `Promo: ${product.discountPrice.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}`
                      : "Promo disabled"}
                  </span>
                  <span>Stock: {product.stock}</span>
                </div>
                <div className="mt-3 space-y-2 rounded-2xl border border-dashed border-border/70 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                    Promotion
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={promoForms[product._id]?.discountPrice ?? ""}
                      onChange={(e) =>
                        handlePromoInputChange(product._id, "discountPrice", e.target.value)
                      }
                      placeholder="Discount price"
                      className="rounded-2xl  card-elevated70 px-3 py-2 text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                      <input
                        type="checkbox"
                        checked={promoForms[product._id]?.promoActive ?? false}
                        onChange={(e) =>
                          handlePromoInputChange(product._id, "promoActive", e.target.checked)
                        }
                      />
                      Promo active
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSavePromo(product._id, product.price)}
                    className="w-full rounded-full  px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                    disabled={promoSavingId === product._id}
                  >
                    {promoSavingId === product._id ? "Saving..." : "Save promotion"}
                  </button>
                </div>
                <div className="mt-3 rounded-2xl border border-dashed border-border/70 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mb-2">
                    Upload image
                  </p>
                  {pendingUploads[product._id] ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground/70 truncate flex-1 mr-2">
                          {pendingUploads[product._id]?.name}
                        </span>
                        <span className="text-foreground/50">
                          {((pendingUploads[product._id]?.size || 0) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      {uploadProgress[product._id] !== undefined && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground/60">Uploading...</span>
                            <span className="font-semibold text-secondary">
                              {uploadProgress[product._id]}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full card-elevated80 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-secondary to-secondary/70 transition-all duration-300"
                              style={{ width: `${uploadProgress[product._id]}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpload(product._id)}
                          disabled={uploadingId === product._id}
                          className="flex-1 rounded-full  card-elevated80 px-3 py-1.5 text-xs font-semibold hover:bg-background transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {uploadingId === product._id ? "Uploading..." : "Upload"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingUploads((prev) => ({ ...prev, [product._id]: null }));
                            setUploadProgress((prev) => {
                              const next = { ...prev };
                              delete next[product._id];
                              return next;
                            });
                          }}
                          disabled={uploadingId === product._id}
                          className="rounded-full  card-elevated80 px-3 py-1.5 text-xs font-semibold hover:bg-background transition disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setPendingUploads((prev) => ({
                            ...prev,
                            [product._id]: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 card-elevated50 p-3 cursor-pointer hover:card-elevated80 hover:border-border transition">
                        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-foreground/70">
                          Choose image (Max 10MB)
                        </span>
                      </div>
                    </label>
                  )}
                  {product.images && product.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`${product.name} ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg "
                          />
                          <a
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              ))}
            </div>
            {sortedProducts.length > 0 && Math.ceil(sortedProducts.length / itemsPerPage) > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(sortedProducts.length / itemsPerPage)}
                  totalItems={sortedProducts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-3xl  card-elevated70 p-6 text-center text-sm text-foreground/70">
            No products yet. Add your first instrument above.
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title={t("admin.store.confirmDeleteTitle", "Delete product?")}
        description={t(
          "admin.store.confirmDelete",
          "Delete this product? This cannot be undone.",
        )}
        confirmLabel={t("button.delete", "Delete")}
        cancelLabel={t("button.cancel", "Cancel")}
        isLoading={isDeleting}
        onConfirm={confirmDeleteProduct}
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

