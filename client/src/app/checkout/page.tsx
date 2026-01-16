"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useCheckoutMutation,
  useGetCartQuery,
} from "@/store/api/storeApi";
import { useGetBranchesQuery } from "@/store/api/branchApi";
import { useAppSelector } from "@/store/hooks";
import { motion } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { CreditCard, MapPin, Phone, Building2, ArrowLeft, CheckCircle, ShoppingBag, Package, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const paymentMethods = [
  { id: "CashOnDelivery", labelKey: "checkout.page.cashOnDelivery", icon: "💵" },
  { id: "BankTransfer", labelKey: "checkout.page.bankTransfer", icon: "🏦" },
  { id: "Telebirr", labelKey: "checkout.page.telebirr", icon: "📱" },
  { id: "CBEBirr", labelKey: "checkout.page.cbeBirr", icon: "🏧" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { data, isLoading } = useGetCartQuery(undefined, {
    skip: !isLoggedIn,
  });
  const { data: branches = [] } = useGetBranchesQuery();
  const [checkout, { isLoading: isSubmitting }] = useCheckoutMutation();
  const [form, setForm] = useState({
    deliveryOption: "Delivery" as "Pickup" | "Delivery",
    pickupBranchId: "",
    city: "",
    street: "",
    postalCode: "",
    phone: "",
    paymentMethod: "CashOnDelivery",
    receiptUrl: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { pushToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn) router.replace("/login");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.deliveryOption === "Pickup") {
      if (!form.pickupBranchId) {
        next.pickupBranchId = t("checkout.page.pickupBranchError", "Please select a branch");
      }
    } else {
      if (!form.city.trim()) next.city = t("checkout.page.cityError");
      if (!form.street.trim()) next.street = t("checkout.page.streetError");
      if (!form.postalCode.trim()) next.postalCode = t("checkout.page.postalCodeError");
      if (!/^[+0-9\s-]{6,}$/.test(form.phone)) next.phone = t("checkout.page.phoneError");
    }
    if (form.paymentMethod === "BankTransfer" && !form.receiptUrl.trim()) {
      next.receiptUrl = t("checkout.page.receiptError", "Receipt URL is required for bank transfer");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data || data.items.length === 0) {
      setErrorMessage(t("checkout.page.emptyError"));
      return;
    }
    if (!validate()) {
      setErrorMessage(t("checkout.page.fixFields"));
      return;
    }

    try {
      await checkout({
        deliveryOption: form.deliveryOption,
        pickupBranchId: form.deliveryOption === "Pickup" ? form.pickupBranchId : undefined,
        shippingAddress: form.deliveryOption === "Delivery" ? {
          city: form.city,
          street: form.street,
          postalCode: form.postalCode,
          phone: form.phone,
        } : undefined,
        paymentMethod: form.paymentMethod,
        receiptUrl: form.paymentMethod === "BankTransfer" ? form.receiptUrl : undefined,
      }).unwrap();
      pushToast({
        title: t("checkout.toast.success"),
        description: t("checkout.toast.successDesc"),
        variant: "success",
      });
      router.push("/account/orders");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("checkout.toast.errorDesc"),
      );
      pushToast({
        title: t("checkout.toast.error"),
        description: t("checkout.toast.errorDesc"),
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-5xl">
        {/* Back to cart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 sm:mb-6"
        >
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cart.title")}
          </Link>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Shipping Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:p-6 md:p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <MapPin className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("checkout.page.kicker")}
                </p>
                <h1 className="text-2xl font-serif text-primary">
                  {t("checkout.page.title")}
                </h1>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                >
                  {errorMessage}
                </motion.div>
              )}

              {/* Delivery Option */}
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                  <Package className="h-4 w-4" />
                  {t("checkout.page.deliveryOption", "Delivery Option")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      form.deliveryOption === "Delivery"
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-border bg-background/60 hover:border-secondary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryOption"
                      value="Delivery"
                      checked={form.deliveryOption === "Delivery"}
                      onChange={(e) =>
                        setForm({ ...form, deliveryOption: e.target.value as "Pickup" | "Delivery" })
                      }
                      className="sr-only"
                    />
                    <Truck className="h-5 w-5" />
                    <span>{t("checkout.page.delivery", "Delivery")}</span>
                    {form.deliveryOption === "Delivery" && (
                      <CheckCircle className="ml-auto h-4 w-4" />
                    )}
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      form.deliveryOption === "Pickup"
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-border bg-background/60 hover:border-secondary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryOption"
                      value="Pickup"
                      checked={form.deliveryOption === "Pickup"}
                      onChange={(e) =>
                        setForm({ ...form, deliveryOption: e.target.value as "Pickup" | "Delivery" })
                      }
                      className="sr-only"
                    />
                    <Building2 className="h-5 w-5" />
                    <span>{t("checkout.page.pickup", "Pickup")}</span>
                    {form.deliveryOption === "Pickup" && (
                      <CheckCircle className="ml-auto h-4 w-4" />
                    )}
                  </label>
                </div>
              </div>

              {form.deliveryOption === "Pickup" ? (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                    <Building2 className="h-4 w-4" />
                    {t("checkout.page.pickupBranch", "Pickup Branch")}
                  </label>
                  <select
                    required
                    value={form.pickupBranchId}
                    onChange={(e) => setForm({ ...form, pickupBranchId: e.target.value })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                      fieldErrors.pickupBranchId ? "border-red-400" : "border-border focus:border-secondary"
                    } bg-background/80`}
                  >
                    <option value="">{t("checkout.page.selectBranch", "Select a branch")}</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.pickupBranchId && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.pickupBranchId}</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                      <Building2 className="h-4 w-4" />
                      {t("checkout.page.city")}
                    </label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                    fieldErrors.city ? "border-red-400" : "border-border focus:border-secondary"
                  } bg-background/80`}
                  placeholder="Addis Ababa"
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                  <MapPin className="h-4 w-4" />
                  {t("checkout.page.street")}
                </label>
                <input
                  type="text"
                  required
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                    fieldErrors.street ? "border-red-400" : "border-border focus:border-secondary"
                  } bg-background/80`}
                  placeholder="Bole Sub-City, House 123"
                />
                {fieldErrors.street && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.street}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    {t("checkout.page.postalCode")}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                      fieldErrors.postalCode ? "border-red-400" : "border-border focus:border-secondary"
                    } bg-background/80`}
                    placeholder="1000"
                  />
                  {fieldErrors.postalCode && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.postalCode}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                    <Phone className="h-4 w-4" />
                    {t("checkout.page.phone")}
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                      fieldErrors.phone ? "border-red-400" : "border-border focus:border-secondary"
                    } bg-background/80`}
                    placeholder="+251 911 000 000"
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>
                </>
              )}

              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                  <CreditCard className="h-4 w-4" />
                  {t("checkout.page.paymentMethod")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        form.paymentMethod === method.id
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border bg-background/60 hover:border-secondary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={form.paymentMethod === method.id}
                        onChange={(e) =>
                          setForm({ ...form, paymentMethod: e.target.value })
                        }
                        className="sr-only"
                      />
                      <span className="text-lg">{method.icon}</span>
                      <span>{t(method.labelKey)}</span>
                      {form.paymentMethod === method.id && (
                        <CheckCircle className="ml-auto h-4 w-4" />
                      )}
                    </label>
                  ))}
                </div>
                {form.paymentMethod === "BankTransfer" && (
                  <div className="mt-4">
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                      <CreditCard className="h-4 w-4" />
                      {t("checkout.page.receiptUrl", "Receipt URL")}
                    </label>
                    <input
                      type="url"
                      required={form.paymentMethod === "BankTransfer"}
                      value={form.receiptUrl}
                      onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                      className={`mt-2 w-full rounded-2xl border px-4 py-3 text-foreground outline-none transition focus:ring-2 focus:ring-secondary/40 ${
                        fieldErrors.receiptUrl ? "border-red-400" : "border-border focus:border-secondary"
                      } bg-background/80`}
                      placeholder="https://example.com/receipt.jpg"
                    />
                    {fieldErrors.receiptUrl && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.receiptUrl}</p>
                    )}
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("checkout.page.receiptNote", "Upload your payment receipt and provide the URL. Our team will verify and contact you.")}
                    </p>
                  </div>
                )}
                {form.paymentMethod === "CashOnDelivery" && (
                  <p className="mt-4 text-xs text-foreground/60">
                    {t("checkout.page.codNote", "Our team will contact you to confirm your order and arrange delivery.")}
                  </p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting || isLoading}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-full bg-primary px-6 py-4 text-center text-sm font-semibold text-primary-foreground shadow-[0_20px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t("checkout.page.processing") : t("checkout.page.placeOrder")}
              </motion.button>
            </form>
          </motion.div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-border bg-surface p-8 shadow-[0_25px_60px_var(--color-primary-glow)]"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <ShoppingBag className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("checkout.page.orderSummary")}
              </p>
            </div>

            {isLoading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-background/80 p-4">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
                <div className="border-t border-border pt-4">
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            )}

            {data && data.items.length > 0 ? (
              <div className="space-y-4">
                {data.items.map((item, index) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-primary">
                        {item.product?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-foreground/60">
                        {t("cart.quantity")}: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-secondary">
                      {item.subtotal.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </motion.div>
                ))}
                
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">{t("cart.page.subtotal")}</span>
                    <span>
                      {data.totalAmount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Shipping</span>
                    <span className="text-emerald-500">Free</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-lg font-semibold">{t("checkout.page.total")}</span>
                    <span className="text-2xl font-serif text-primary">
                      {data.totalAmount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              !isLoading && (
                <p className="text-sm text-foreground/70">
                  {t("checkout.page.noItems")}
                </p>
              )
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
