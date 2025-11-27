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
    const frame =
      typeof window !== "undefined"
        ? window.requestAnimationFrame(() => {
            setForm({
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              phone: data.phone ?? "",
              languagePreference: data.languagePreference ?? "en",
              bio: data.bio ?? "",
            });
          })
        : null;
    return () => {
      if (frame !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [data]);

  if (!isLoggedIn) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await updateProfile(form);
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4 rounded-[32px] border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center gap-4">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.email}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10 text-2xl text-secondary">
                {(user?.firstName?.[0] ?? user?.email?.[0] ?? "").toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                {t("profile.kicker", "Account")}
              </p>
              <h1 className="text-3xl font-serif text-primary md:text-4xl">
                {t("profile.title", "Profile Settings")}
              </h1>
              <p className="mt-1 text-sm text-foreground/70">
                {t(
                  "profile.subtitle",
                  "Update your personal information so teachers and administrators can reach you.",
                )}
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.3em]">
                {isUploadingAvatar
                  ? t("profile.avatarUploading", "Uploading...")
                  : t("profile.avatarUpload", "Update avatar")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
          </div>
        </header>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-3xl border border-border bg-surface/90 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.08)] backdrop-blur"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("profile.firstName", "First Name")}
              <input
                type="text"
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
                placeholder="Abel"
              />
            </label>
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("profile.lastName", "Last Name")}
              <input
                type="text"
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
                placeholder="Begena"
              />
            </label>
          </div>

          <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
            {t("profile.phone", "Phone Number")}
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
              placeholder="+251 911 000 000"
            />
          </label>

          <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
            {t("profile.bio", "Short Bio")}
            <textarea
              value={form.bio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bio: e.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
            />
          </label>

  <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
            {t("profile.language", "Preferred Language")}
            <select
              value={form.languagePreference}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, languagePreference: e.target.value as "en" | "am" }))
              }
              className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
            >
              <option value="en">English</option>
              <option value="am">Amharic</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isLoading || isUpdating}
            className="w-full rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? t("profile.saving", "Saving...") : t("profile.save", "Save changes")}
          </button>

          {isSuccess && (
            <p className="text-center text-sm text-secondary">
              Profile updated successfully.
            </p>
          )}
        </motion.form>
      </div>
    </section>
  );
}

