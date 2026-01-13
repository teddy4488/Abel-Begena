"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAdminDeleteUserMutation,
  useAdminUpdateUserMutation,
  useGetAllUsersQuery,
} from "@/store/api/userApi";
import type { AuthUser } from "@/store/slices/authSlice";
import Image from "next/image";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Search, UserCheck, UserX, Shield, User, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useGetAllUsersQuery();
  const [updateUser] = useAdminUpdateUserMutation();
  const [deleteUser] = useAdminDeleteUserMutation();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { pushToast } = useToast();
  const { t } = useI18n();

  const filtered = useMemo(() => {
    return (
      users?.filter((user) => {
        const matchesSearch =
          !search ||
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesRole = filterRole === "all" || user.role === filterRole;
        const isActive = (user as { isActive?: boolean }).isActive ?? true;
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" && isActive) ||
          (filterStatus === "inactive" && !isActive);
        return matchesSearch && matchesRole && matchesStatus;
      }) ?? []
    );
  }, [users, search, filterRole, filterStatus]);

  const stats = useMemo(() => {
    const total = users?.length ?? 0;
    const active = users?.filter((u) => (u as { isActive?: boolean }).isActive ?? true).length ?? 0;
    const teachers = users?.filter((u) => u.role === "Teacher").length ?? 0;
    const admins = users?.filter((u) => u.role === "Admin").length ?? 0;
    return { total, active, teachers, admins };
  }, [users]);

  const handleRoleChange = async (user: AuthUser, nextRole: string) => {
    try {
      await updateUser({
        id: user._id ?? user.id ?? "",
        data: { role: nextRole as AuthUser["role"] },
      }).unwrap();
      pushToast({
        title: t("admin.users.roleUpdated", "Role updated"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.users.roleUpdateError", "Unable to update role"),
        variant: "error",
      });
    }
  };

  const handleActiveToggle = async (user: AuthUser) => {
    try {
      await updateUser({
        id: user._id ?? user.id ?? "",
        data: { isActive: !(user as { isActive?: boolean }).isActive },
      }).unwrap();
      pushToast({
        title: t("admin.users.statusUpdated", "Status updated"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.users.statusUpdateError", "Unable to update status"),
        variant: "error",
      });
    }
  };

  const handleTeacherStatus = async (user: AuthUser, status: string) => {
    try {
      await updateUser({
        id: user._id ?? user.id ?? "",
        data: { teacherStatus: status as AuthUser["teacherStatus"] },
      }).unwrap();
      pushToast({
        title: t("admin.users.teacherStatusUpdated", "Teacher status updated"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.users.teacherStatusUpdateError", "Unable to update teacher status"),
        variant: "error",
      });
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (
      !confirm(
        t(
          "admin.users.confirmDelete",
          `Are you sure you want to delete ${email}? This action cannot be undone.`,
        ),
      )
    ) {
      return;
    }
    try {
      setDeletingId(id);
      await deleteUser(id).unwrap();
      pushToast({
        title: t("admin.users.userRemoved", "User removed"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.users.deleteError", "Unable to delete user"),
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] rounded-3xl  surface-elevated p-6">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin text-secondary mb-4" />
          <p className="text-sm text-foreground/70">
            {t("admin.users.loading", "Loading users...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.users.kicker", "User Management")}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-primary">
          {t("admin.users.title", "Manage Every Account")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "admin.users.subtitle",
            "View, edit, and manage user accounts, roles, and permissions.",
          )}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl  surface-elevated p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.users.stats.total", "Total Users")}
              </p>
              <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
            </div>
            <User className="w-8 h-8 text-secondary/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl  surface-elevated p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.users.stats.active", "Active")}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl  surface-elevated p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.users.stats.teachers", "Teachers")}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.teachers}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-600/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl  surface-elevated p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.users.stats.admins", "Admins")}
              </p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.admins}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600/40" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 rounded-2xl  surface-elevated p-4 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.users.searchPlaceholder", "Search email or name...")}
              className="w-full rounded-xl  card-elevated70 pl-10 pr-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </div>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="w-full rounded-xl  card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
        >
          <option value="all">{t("admin.users.filter.allRoles", "All Roles")}</option>
          <option value="User">{t("admin.users.filter.user", "User")}</option>
          <option value="Teacher">{t("admin.users.filter.teacher", "Teacher")}</option>
          <option value="Admin">{t("admin.users.filter.admin", "Admin")}</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full rounded-xl  card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
        >
          <option value="all">{t("admin.users.filter.allStatus", "All Status")}</option>
          <option value="active">{t("admin.users.filter.active", "Active")}</option>
          <option value="inactive">{t("admin.users.filter.inactive", "Inactive")}</option>
        </select>
      </motion.div>

      {/* Users Table - Desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="hidden lg:block overflow-x-auto rounded-3xl  surface-elevated shadow-lg"
      >
        <table className="w-full text-left text-sm">
          <thead className="card-elevated50">
            <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              <th className="px-6 py-4">{t("admin.users.table.user", "User")}</th>
              <th className="px-6 py-4">{t("admin.users.table.role", "Role")}</th>
              <th className="px-6 py-4">{t("admin.users.table.teacherStatus", "Teacher Status")}</th>
              <th className="px-6 py-4">{t("admin.users.table.activity", "Activity")}</th>
              <th className="px-6 py-4 text-right">{t("admin.users.table.actions", "Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            <AnimatePresence>
              {filtered.map((user, index) => {
                const isActive = (user as { isActive?: boolean }).isActive ?? true;
                return (
                  <motion.tr
                    key={user._id ?? user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:card-elevated30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={user.email}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary border-2 border-border">
                            {(user.firstName?.[0] ?? user.email[0] ?? "").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-primary">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-foreground/60">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role ?? "User"}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="rounded-xl  card-elevated60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer"
                      >
                        {["User", "Teacher", "Admin"].map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === "Teacher" ? (
                        <select
                          value={user.teacherStatus ?? "pending"}
                          onChange={(e) => handleTeacherStatus(user, e.target.value)}
                          className="rounded-xl  card-elevated60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer"
                        >
                          {["pending", "approved", "suspended"].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleActiveToggle(user)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            {t("admin.users.active", "Active")}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            {t("admin.users.suspended", "Suspended")}
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(user._id ?? user.id ?? "", user.email)}
                        disabled={deletingId === (user._id ?? user.id ?? "")}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === (user._id ?? user.id ?? "") ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t("admin.users.deleting", "Deleting...")}
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" />
                            {t("admin.users.delete", "Delete")}
                          </>
                        )}
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!filtered.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <UserX className="w-12 h-12 text-foreground/30" />
                    <p className="text-sm text-foreground/60">
                      {t("admin.users.noUsers", "No users found matching your filters.")}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Users Cards - Mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="lg:hidden space-y-4"
      >
        <AnimatePresence>
          {filtered.map((user, index) => {
            const isActive = (user as { isActive?: boolean }).isActive ?? true;
            return (
              <motion.div
                key={user._id ?? user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl  surface-elevated p-4 shadow-lg"
              >
                <div className="flex items-start gap-3 mb-4">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.email}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary border-2 border-border">
                      {(user.firstName?.[0] ?? user.email[0] ?? "").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-foreground/60 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                      {t("admin.users.table.role", "Role")}
                    </p>
                    <select
                      value={user.role ?? "User"}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="w-full rounded-xl  card-elevated60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer"
                    >
                      {["User", "Teacher", "Admin"].map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  {user.role === "Teacher" && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                        {t("admin.users.table.teacherStatus", "Teacher Status")}
                      </p>
                      <select
                        value={(user as { teacherStatus?: string }).teacherStatus ?? "pending"}
                        onChange={(e) => handleTeacherStatus(user, e.target.value)}
                        className="w-full rounded-xl  card-elevated60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer"
                      >
                        <option value="pending">{t("admin.users.pending", "Pending")}</option>
                        <option value="approved">{t("admin.users.approved", "Approved")}</option>
                        <option value="rejected">{t("admin.users.rejected", "Rejected")}</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                      {t("admin.users.table.activity", "Activity")}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleActiveToggle(user)}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-green-500/10 text-green-600"
                          : "bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          {t("admin.users.active", "Active")}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          {t("admin.users.suspended", "Suspended")}
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(user._id ?? user.id ?? "", user.email)}
                    disabled={deletingId === (user._id ?? user.id ?? "")}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === (user._id ?? user.id ?? "") ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t("admin.users.deleting", "Deleting...")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        {t("admin.users.delete", "Delete")}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!filtered.length && (
          <div className="rounded-2xl  surface-elevated p-12 text-center">
            <UserX className="w-12 h-12 text-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-foreground/60">
              {t("admin.users.noUsers", "No users found matching your filters.")}
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
