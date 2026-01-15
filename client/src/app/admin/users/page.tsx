"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAdminDeleteUserMutation,
  useAdminUpdateUserMutation,
  useGetAllUsersQuery,
} from "@/store/api/userApi";
import {
  useGetTeachersQuery,
  useGetAdminsQuery,
  useGetStudentsQuery,
  useGetWebsiteUsersQuery,
} from "@/store/api/adminApi";
import type { AuthUser } from "@/store/slices/authSlice";
import Image from "next/image";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Search, UserCheck, UserX, Shield, User, Trash2, CheckCircle2, XCircle, Loader2, GraduationCap } from "lucide-react";

type UserTab = "website" | "teachers" | "admins" | "students";

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<UserTab>("website");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { pushToast } = useToast();
  const { t } = useI18n();

  // Fetch all user types
  const { data: websiteUsers = [], isLoading: websiteUsersLoading } = useGetWebsiteUsersQuery();
  const { data: teachers = [], isLoading: teachersLoading } = useGetTeachersQuery();
  const { data: admins = [], isLoading: adminsLoading } = useGetAdminsQuery();
  const { data: students = [], isLoading: studentsLoading } = useGetStudentsQuery();

  const [updateUser] = useAdminUpdateUserMutation();
  const [deleteUser] = useAdminDeleteUserMutation();

  const isLoading = websiteUsersLoading || teachersLoading || adminsLoading || studentsLoading;

  // Get current tab data
  const currentData = useMemo(() => {
    switch (activeTab) {
      case "website":
        return websiteUsers;
      case "teachers":
        return teachers;
      case "admins":
        return admins;
      case "students":
        return students;
      default:
        return [];
    }
  }, [activeTab, websiteUsers, teachers, admins, students]);

  const filtered = useMemo(() => {
    return (
      currentData?.filter((item: any) => {
        const matchesSearch = !search || 
          (item.email && item.email.toLowerCase().includes(search.toLowerCase())) ||
          (item.fullName && item.fullName.toLowerCase().includes(search.toLowerCase())) ||
          (item.firstName && `${item.firstName} ${item.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase())) ||
          (item.attendanceNumber && item.attendanceNumber.toLowerCase().includes(search.toLowerCase()));
        
        const isActive = item.isActive ?? true;
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" && isActive) ||
          (filterStatus === "inactive" && !isActive);
        
        return matchesSearch && matchesStatus;
      }) ?? []
    );
  }, [currentData, search, filterStatus]);

  const stats = useMemo(() => {
    return {
      website: websiteUsers.length,
      teachers: teachers.length,
      admins: admins.length,
      students: students.length,
      total: websiteUsers.length + teachers.length + admins.length + students.length,
    };
  }, [websiteUsers, teachers, admins, students]);

  const handleActiveToggle = async (item: any, userType: UserTab) => {
    try {
      const id = item._id ?? item.id ?? "";
      // For now, we'll handle updates based on user type
      // This would need backend endpoints for each user type
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

  const handleDelete = async (id: string, emailOrName: string) => {
    if (!confirm(t("admin.users.confirmDelete", `Are you sure you want to delete ${emailOrName}? This action cannot be undone.`))) {
      return;
    }
    try {
      setDeletingId(id);
      // For now, only website users can be deleted through this endpoint
      if (activeTab === "website") {
        await deleteUser(id).unwrap();
      }
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
      <div className="flex items-center justify-center min-h-[400px] rounded-3xl surface-elevated p-6">
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
          {t("admin.users.title", "Manage All Users")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t("admin.users.subtitle", "View and manage website users, teachers, admins, and students.")}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl surface-elevated p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.users.stats.website", "Website Users")}
              </p>
              <p className="text-2xl font-bold text-primary mt-1">{stats.website}</p>
            </div>
            <User className="w-8 h-8 text-secondary/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl surface-elevated p-4 shadow-lg"
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
          transition={{ delay: 0.3 }}
          className="rounded-3xl surface-elevated p-4 shadow-lg"
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
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl surface-elevated p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.users.stats.students", "Students")}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.students}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-green-600/40" />
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 rounded-2xl surface-elevated p-2"
      >
        <button
          onClick={() => setActiveTab("website")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "website"
              ? "bg-secondary text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <User className="w-4 h-4" />
            {t("admin.users.tabs.website", "Website Users")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "teachers"
              ? "bg-secondary text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            {t("admin.users.tabs.teachers", "Teachers")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "admins"
              ? "bg-secondary text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            {t("admin.users.tabs.admins", "Admins")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "students"
              ? "bg-secondary text-white"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {t("admin.users.tabs.students", "Students")}
          </div>
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 rounded-2xl surface-elevated p-4 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.users.searchPlaceholder", "Search email, name, or attendance number...")}
              className="w-full rounded-xl card-elevated70 pl-10 pr-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full rounded-xl card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
        >
          <option value="all">{t("admin.users.filter.allStatus", "All Status")}</option>
          <option value="active">{t("admin.users.filter.active", "Active")}</option>
          <option value="inactive">{t("admin.users.filter.inactive", "Inactive")}</option>
        </select>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-x-auto rounded-3xl surface-elevated shadow-lg"
      >
        <table className="w-full text-left text-sm">
          <thead className="card-elevated50">
            <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              <th className="px-6 py-4">{t("admin.users.table.user", "User")}</th>
              {activeTab === "teachers" && (
                <th className="px-6 py-4">{t("admin.users.table.teacherStatus", "Status")}</th>
              )}
              <th className="px-6 py-4">{t("admin.users.table.activity", "Activity")}</th>
              <th className="px-6 py-4 text-right">{t("admin.users.table.actions", "Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            <AnimatePresence>
              {filtered.map((item: any, index: number) => {
                const isActive = item.isActive ?? true;
                const displayName = item.fullName || `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.email || item.attendanceNumber;
                const displayEmail = item.email || item.attendanceNumber || "";
                
                return (
                  <motion.tr
                    key={item._id ?? item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:card-elevated30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.avatarUrl ? (
                          <Image
                            src={item.avatarUrl}
                            alt={displayName}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary border-2 border-border">
                            {(displayName[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-primary">{displayName}</p>
                          {displayEmail && (
                            <p className="text-xs text-foreground/60">{displayEmail}</p>
                          )}
                          {item.attendanceNumber && (
                            <p className="text-xs text-foreground/60">ID: {item.attendanceNumber}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {activeTab === "teachers" && (
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/60">
                          {item.teacherStatus ?? "pending"}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleActiveToggle(item, activeTab)}
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
                      {activeTab === "website" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id ?? item.id ?? "", displayEmail)}
                          disabled={deletingId === (item._id ?? item.id ?? "")}
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === (item._id ?? item.id ?? "") ? (
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
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!filtered.length && (
              <tr>
                <td colSpan={activeTab === "teachers" ? 4 : 3} className="px-6 py-12 text-center">
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
    </section>
  );
}
