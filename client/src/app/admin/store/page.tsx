"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useCreateProductMutation,
  useGetManageProductsQuery,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from "@/store/api/storeApi";
import { useToast } from "@/components/providers/ToastProvider";

const productFormDefaults = {
  name: "",
  instrumentType: "Begena",
  shortDescription: "",
  price: "",
  stock: "",
  images: "",
  isActive: true,
  promoActive: false,
  discountPrice: "",
};

export default function AdminStorePage() {
  const { data: products, isLoading } = useGetManageProductsQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [uploadImage] = useUploadProductImageMutation();
  const [form, setForm] = useState(productFormDefaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingUploads, setPendingUploads] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [promoForms, setPromoForms] = useState<
    Record<string, { discountPrice: string; promoActive: boolean }>
  >({});
  const [promoSavingId, setPromoSavingId] = useState<string | null>(null);
  const { pushToast } = useToast();

  const sortedProducts = useMemo(
    () => [...(products ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

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
      await createProduct({
        name: form.name,
        instrumentType: form.instrumentType as typeof form.instrumentType,
        shortDescription: form.shortDescription,
        price: Number(form.price),
        stock: Number(form.stock),
        images: form.images
          ? form.images.split(",").map((img) => img.trim())
          : [],
        isActive: form.isActive,
        promoActive: form.promoActive,
        discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      }).unwrap();
      pushToast({
        title: "Product created",
        description: "The store inventory has been updated.",
        variant: "success",
      });
      setForm(productFormDefaults);
      setErrors({});
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Unable to create product",
        description: "Please verify the form and try again.",
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

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-3xl border border-border bg-surface p-6 lg:grid-cols-5"
      >
        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
            Add Product
          </p>
          <h2 className="text-xl font-serif text-primary">Store inventory</h2>
        </div>
        <div className="space-y-3 lg:col-span-3">
          <div>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className={`w-full rounded-2xl border px-4 py-2 text-sm ${
                errors.name ? "border-red-400" : "border-border"
              } bg-background/70`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.instrumentType}
              onChange={(e) => setForm((prev) => ({ ...prev, instrumentType: e.target.value }))}
              className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm"
            >
              {["Begena", "Kirar", "Masinko", "Washint", "Kebero", "Other"].map(
                (type) => (
                  <option key={type}>{type}</option>
                ),
              )}
            </select>
            <input
              value={form.images}
              onChange={(e) => setForm((prev) => ({ ...prev, images: e.target.value }))}
              placeholder="Image URLs (comma separated)"
              className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={form.shortDescription}
            onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
            placeholder="Short description"
            rows={2}
            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <input
                required
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="Price"
                className={`w-full rounded-2xl border px-3 py-2 text-sm ${
                  errors.price ? "border-red-400" : "border-border"
                } bg-background/70`}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500">{errors.price}</p>
              )}
            </div>
            <div>
              <input
                required
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                placeholder="Stock"
                className={`w-full rounded-2xl border px-3 py-2 text-sm ${
                  errors.stock ? "border-red-400" : "border-border"
                } bg-background/70`}
              />
              {errors.stock && (
                <p className="mt-1 text-xs text-red-500">{errors.stock}</p>
              )}
            </div>
            <div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.discountPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, discountPrice: e.target.value }))}
                placeholder="Promo price"
                disabled={!form.promoActive}
                className={`w-full rounded-2xl border px-3 py-2 text-sm ${
                  errors.discountPrice ? "border-red-400" : "border-border"
                } bg-background/70 disabled:opacity-60`}
              />
              {errors.discountPrice && (
                <p className="mt-1 text-xs text-red-500">{errors.discountPrice}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Active
            </label>
            <label className="flex items-center gap-2">
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
              />
              Promo active
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Add product
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-xl font-serif text-primary">Inventory</h2>
        {isLoading ? (
          <p className="text-sm text-foreground/60">Loading products...</p>
        ) : sortedProducts.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {sortedProducts.map((product) => (
              <div
                key={product._id}
                className="rounded-2xl border border-border/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-primary">{product.name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                      {product.instrumentType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProduct(product._id, product.isActive)}
                    className={`text-xs uppercase tracking-[0.3em] ${
                      product.isActive ? "text-green-500" : "text-foreground/60"
                    }`}
                  >
                    {product.isActive ? "Active" : "Hidden"}
                  </button>
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
                      className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm"
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
                    className="w-full rounded-full border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide"
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
                          <div className="h-1.5 rounded-full bg-background/80 overflow-hidden">
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
                          className="flex-1 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold hover:bg-background transition disabled:opacity-60 disabled:cursor-not-allowed"
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
                          className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold hover:bg-background transition disabled:opacity-60"
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
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/50 p-3 cursor-pointer hover:bg-background/80 hover:border-border transition">
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
                          <img
                            src={img}
                            alt={`${product.name} ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-border"
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
        ) : (
          <div className="mt-6 rounded-3xl border border-border bg-background/70 p-6 text-center text-sm text-foreground/70">
            No products yet. Add your first instrument above.
          </div>
        )}
      </div>
    </section>
  );
}

