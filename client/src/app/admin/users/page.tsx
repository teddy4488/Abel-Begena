"use client";

import { useState } from "react";
import {
  useAdminDeleteUserMutation,
  useAdminUpdateUserMutation,
  useGetAllUsersQuery,
} from "@/store/api/userApi";
import type { AuthUser } from "@/store/slices/authSlice";
import Image from "next/image";
import { useToast } from "@/components/providers/ToastProvider";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useGetAllUsersQuery();
  const [updateUser] = useAdminUpdateUserMutation();
  const [deleteUser] = useAdminDeleteUserMutation();
  const [search, setSearch] = useState("");
  const { pushToast } = useToast();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-foreground/70">
        Loading users...
      </div>
    );
  }

  const filtered =
    users?.filter(
      (user) =>
        !search ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        `${user.firstName ?? ""} ${user.lastName ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];

  const handleRoleChange = async (user: AuthUser, nextRole: string) => {
    try {
      await updateUser({ id: user._id ?? user.id ?? "", data: { role: nextRole as AuthUser["role"] } }).unwrap();
      pushToast({ title: "Role updated", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({ title: "Unable to update role", variant: "error" });
    }
  };

  const handleActiveToggle = async (user: AuthUser) => {
    try {
      await updateUser({
        id: user._id ?? user.id ?? "",
        data: { isActive: !(user as { isActive?: boolean }).isActive },
      }).unwrap();
      pushToast({ title: "Status updated", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({ title: "Unable to update status", variant: "error" });
    }
  };

  const handleTeacherStatus = async (user: AuthUser, status: string) => {
    try {
      await updateUser({
        id: user._id ?? user.id ?? "",
        data: { teacherStatus: status as AuthUser["teacherStatus"] },
      }).unwrap();
      pushToast({ title: "Teacher status updated", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({ title: "Unable to update teacher status", variant: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id).unwrap();
      pushToast({ title: "User removed", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({ title: "Unable to delete user", variant: "error" });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
            Users
          </p>
          <h1 className="text-2xl font-serif text-primary">
            Manage every account
          </h1>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or name"
          className="w-full max-w-sm rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
        />
      </div>
      <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Teacher Status</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filtered.map((user) => (
              <tr key={user._id ?? user.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.email}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                        {(user.firstName?.[0] ?? user.email[0] ?? "").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-primary">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-foreground/70">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role ?? "User"}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    className="rounded-xl border border-border bg-background/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                  >
                    {["User", "Teacher", "Admin"].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.teacherStatus ?? "pending"}
                    onChange={(e) => handleTeacherStatus(user, e.target.value)}
                    className="rounded-xl border border-border bg-background/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                  >
                    {["pending", "approved", "suspended"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleActiveToggle(user)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      (user as { isActive?: boolean }).isActive ?? true
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {(user as { isActive?: boolean }).isActive ?? true
                      ? "Active"
                      : "Suspended"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(user._id ?? user.id ?? "")}
                      className="text-xs uppercase tracking-[0.3em] text-red-500 transition hover:text-red-400"
                    >
                      Remove
                    </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-foreground/60"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

