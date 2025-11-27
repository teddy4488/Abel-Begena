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
    try {
      await uploadImage({ id: productId, file }).unwrap();
      pushToast({
        title: "Image uploaded",
        description: "The product gallery has been updated.",
        variant: "success",
      });
      setPendingUploads((prev) => ({ ...prev, [productId]: null }));
    } catch (error) {
      console.error(error);
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
                <div className="mt-3 rounded-2xl.border border-dashed border-border/70 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                    Upload image
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setPendingUploads((prev) => ({
                          ...prev,
                          [product._id]: e.target.files?.[0] ?? null,
                        }))
                      }
                      className="text-xs text-foreground/70 file:mr-3 file:rounded-full file:border-0 file:bg-secondary/20 file:px-3 file:py-1 file:text-secondary"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpload(product._id)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                    >
                      Upload
                    </button>
                  </div>
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

