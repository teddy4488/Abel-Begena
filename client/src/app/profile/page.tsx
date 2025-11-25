"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/store/api/userApi";
import { useAppSelector } from "@/store/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetProfileQuery(undefined, {
    skip: !isLoggedIn,
  });
  const [updateProfile, { isLoading: isUpdating, isSuccess }] =
    useUpdateProfileMutation();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (data) {
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
      });
    }
  }, [data]);

  if (!isLoggedIn) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await updateProfile(form);
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            Account
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Profile Settings
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            Update your personal information so teachers and administrators can
            reach you.
          </p>
        </header>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-3xl border border-border bg-surface/90 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.08)] backdrop-blur"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="text-sm font-semibold uppercase tracking-wide text-secondary">
              First Name
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
              Last Name
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
            Phone Number
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

          <button
            type="submit"
            disabled={isLoading || isUpdating}
            className="w-full rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "Saving..." : "Save changes"}
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

