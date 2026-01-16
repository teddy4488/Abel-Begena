"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from "@/store/api/userApi";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { User, Mail, Phone, FileText, Globe, Upload, Loader2, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetProfileQuery(undefined, {
    skip: !isLoggedIn,
  });
  const [updateProfile, { isLoading: isUpdating, isSuccess }] =
    useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] =
    useUploadAvatarMutation();
  const { t } = useI18n();
  const { pushToast } = useToast();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    languagePreference: user?.languagePreference ?? "en",
    bio: user?.bio ?? "",
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (!data) {
      return;
    }
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setForm({
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
        languagePreference: data.languagePreference ?? "en",
        bio: data.bio ?? "",
      });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [data]);

  useEffect(() => {
    if (isSuccess) {
      pushToast({
        title: t("profile.toast.success", "Profile updated"),
        description: t("profile.toast.successDesc", "Your profile has been updated successfully."),
        variant: "success",
      });
    }
  }, [isSuccess, pushToast, t]);

  if (!isLoggedIn) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateProfile(form).unwrap();
    } catch {
      pushToast({
        title: t("profile.toast.error", "Update failed"),
        description: t("profile.toast.errorDesc", "Failed to update profile. Please try again."),
        variant: "error",
      });
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      pushToast({
        title: t("profile.toast.error", "Upload failed"),
        description: t("profile.toast.fileTooLarge", "File size must be less than 5MB."),
        variant: "error",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      pushToast({
        title: t("profile.toast.error", "Upload failed"),
        description: t("profile.toast.invalidFile", "Please upload an image file."),
        variant: "error",
      });
      return;
    }

    try {
      await uploadAvatar(file).unwrap();
      pushToast({
        title: t("profile.toast.avatarSuccess", "Avatar updated"),
        description: t("profile.toast.avatarSuccessDesc", "Your avatar has been updated."),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("profile.toast.error", "Upload failed"),
        description: t("profile.toast.uploadError", "Failed to upload avatar. Please try again."),
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground transition-colors md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-[32px] bg-surface-elevated p-8 shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative">
              {user?.avatarUrl ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-secondary/30 shadow-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatarUrl}
                    alt={user.email}
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 text-3xl font-bold text-secondary shadow-lg">
                  {(user?.firstName?.[0] ?? user?.email?.[0] ?? "").toUpperCase()}
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-secondary p-2 shadow-lg transition hover:scale-110">
                {isUploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
                ) : (
                  <Upload className="h-5 w-5 text-primary-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                {t("profile.kicker", "Account")}
              </p>
              <h1 className="text-3xl font-serif text-primary md:text-4xl">
                {t("profile.title", "Profile Settings")}
              </h1>
              <p className="mt-2 text-sm text-foreground/70">
                {t(
                  "profile.subtitle",
                  "Update your personal information so teachers and administrators can reach you.",
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-foreground/60">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 rounded-3xl bg-surface-elevated/90 p-8 shadow-lg backdrop-blur"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <motion.label
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="block"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                <User className="h-4 w-4" />
                {t("profile.firstName", "First Name")}
              </div>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40 shadow-sm"
                placeholder="Abel"
              />
            </motion.label>
            <motion.label
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="block"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                <User className="h-4 w-4" />
                {t("profile.lastName", "Last Name")}
              </div>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40 shadow-sm"
                placeholder="Begena"
              />
            </motion.label>
          </div>

          <motion.label
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="block"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <Phone className="h-4 w-4" />
              {t("profile.phone", "Phone Number")}
            </div>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="+251 911 000 000"
            />
          </motion.label>

          <motion.label
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="block"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <FileText className="h-4 w-4" />
              {t("profile.bio", "Short Bio")}
            </div>
            <textarea
              value={form.bio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bio: e.target.value }))
              }
              rows={4}
              className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder={t("profile.bioPlaceholder", "Tell us about yourself...")}
            />
          </motion.label>

          <motion.label
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="block"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
              <Globe className="h-4 w-4" />
              {t("profile.language", "Preferred Language")}
            </div>
            <select
              value={form.languagePreference}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, languagePreference: e.target.value as "en" | "am" }))
              }
              className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
            >
              <option value="en">English</option>
              <option value="am">አማርኛ (Amharic)</option>
            </select>
          </motion.label>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 pt-4"
          >
            <motion.button
              type="submit"
              disabled={isLoading || isUpdating}
              whileTap={{ scale: 0.97 }}
              className="flex-1 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("profile.saving", "Saving...")}
                </span>
              ) : (
                t("profile.save", "Save changes")
              )}
            </motion.button>
            {isSuccess && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 text-sm text-green-600"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{t("profile.saved", "Saved!")}</span>
              </motion.div>
            )}
          </motion.div>
        </motion.form>
      </div>
    </section>
  );
}
