"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useGetClassesQuery } from "@/store/api/classApi";
import { useGetManagePostsQuery } from "@/store/api/blogApi";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  BookOpen,
  FileText,
  Video,
  Users,
  Calendar,
  Edit,
  Radio,
  Loader2,
} from "lucide-react";

export default function TeacherDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { data: posts = [], isLoading: postsLoading } = useGetManagePostsQuery();

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  const myPosts = useMemo(
    () =>
      posts.filter(
        (post) => post.author?._id === user?._id || post.author?._id === user?.id,
      ),
    [posts, user?._id, user?.id],
  );

  const publishedPosts = myPosts.filter((p) => p.isPublished).length;
  const draftPosts = myPosts.filter((p) => !p.isPublished).length;
  const liveClasses = teacherClasses.filter((c) => c.isLive).length;

  const quickActions = [
    {
      href: "/teacher/posts",
      icon: Edit,
      title: t("teacher.dashboard.createPost", "Create Post"),
      description: t("teacher.dashboard.createPostDesc", "Write a new blog post or lesson"),
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      href: "/teacher/materials",
      icon: FileText,
      title: t("teacher.dashboard.uploadMaterials", "Upload Materials"),
      description: t("teacher.dashboard.uploadMaterialsDesc", "Add PDFs, slides, or videos"),
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      href: "/teacher/live",
      icon: Video,
      title: t("teacher.dashboard.manageLive", "Manage Live Classes"),
      description: t("teacher.dashboard.manageLiveDesc", "Start or stop live sessions"),
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      href: "/teacher/students",
      icon: Users,
      title: t("teacher.dashboard.viewStudents", "View Students"),
      description: t("teacher.dashboard.viewStudentsDesc", "See enrolled students"),
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
    },
    {
      href: "/teacher/schedule",
      icon: Calendar,
      title: t("teacher.dashboard.scheduleClasses", "Schedule Classes"),
      description: t("teacher.dashboard.scheduleClassesDesc", "Plan class times"),
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("teacher.dashboard.kicker", "Teacher Studio")}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-primary">
          {t("teacher.dashboard.title", "Welcome back")}, {user?.firstName || "Teacher"}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "teacher.dashboard.subtitle",
            "Manage your classes, materials, and engage with your students.",
          )}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              {t("teacher.dashboard.activeClasses", "Active Classes")}
            </p>
            <BookOpen className="w-5 h-5 text-secondary/40" />
          </div>
          <p className="text-3xl font-bold text-primary">
            {classesLoading ? (
              <Loader2 className="inline-block h-6 w-6 animate-spin" />
            ) : (
              teacherClasses.length
            )}
          </p>
          {liveClasses > 0 && (
            <p className="mt-2 text-xs text-green-600 font-semibold">
              {liveClasses} {t("teacher.dashboard.liveNow", "live now")}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              {t("teacher.dashboard.publishedPosts", "Published Posts")}
            </p>
            <FileText className="w-5 h-5 text-secondary/40" />
          </div>
          <p className="text-3xl font-bold text-primary">
            {postsLoading ? (
              <Loader2 className="inline-block h-6 w-6 animate-spin" />
            ) : (
              publishedPosts
            )}
          </p>
          {draftPosts > 0 && (
            <p className="mt-2 text-xs text-foreground/60">
              {draftPosts} {t("teacher.dashboard.drafts", "drafts")}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
              {t("teacher.dashboard.drafts", "Drafts")}
            </p>
            <Edit className="w-5 h-5 text-secondary/40" />
          </div>
          <p className="text-3xl font-bold text-primary">
            {postsLoading ? (
              <Loader2 className="inline-block h-6 w-6 animate-spin" />
            ) : (
              draftPosts
            )}
          </p>
          {publishedPosts > 0 && (
            <p className="mt-2 text-xs text-foreground/60">
              {publishedPosts} {t("teacher.dashboard.published", "published")}
            </p>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-surface p-6 shadow-lg"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("teacher.dashboard.quickActions", "Quick Actions")}
            </p>
            <h2 className="text-2xl font-serif text-primary">
              {t("teacher.dashboard.getStarted", "Get Started")}
            </h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Link
                  href={action.href}
                  className="group flex flex-col rounded-xl border border-border bg-background/50 p-5 transition-all hover:border-secondary/50 hover:bg-background/80 hover:shadow-md"
                >
                  <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${action.bgColor} ${action.color} transition-transform group-hover:scale-110`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs text-foreground/70">
                    {action.description}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* My Classes */}
      {teacherClasses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-surface p-6 shadow-lg"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("teacher.dashboard.myClasses", "My Classes")}
              </p>
              <h2 className="text-2xl font-serif text-primary">
                {t("teacher.dashboard.recentActivity", "Recent Activity")}
              </h2>
            </div>
            <Link
              href="/teacher/live"
              className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary transition hover:bg-secondary/10"
            >
              {t("teacher.dashboard.manageAll", "Manage All")}
            </Link>
          </div>
          <div className="space-y-3">
            {teacherClasses.slice(0, 5).map((klass, index) => (
              <motion.div
                key={klass._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Link
                  href="/teacher/live"
                  className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-secondary/50 hover:bg-background/80 hover:shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      klass.isLive ? "bg-green-500/10" : "bg-background"
                    }`}>
                      {klass.isLive ? (
                        <Radio className="h-5 w-5 text-green-600 animate-pulse" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-foreground/40" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-primary group-hover:text-secondary transition-colors">
                        {klass.title}
                      </p>
                      <p className="text-xs text-foreground/70">
                        {klass.isLive
                          ? t("teacher.dashboard.liveNow", "Live now")
                          : t("teacher.dashboard.offline", "Offline")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {klass.isLive && (
                      <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-600">
                        {t("teacher.dashboard.live", "LIVE")}
                      </span>
                    )}
                    <div
                      className={`h-3 w-3 rounded-full ${
                        klass.isLive
                          ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {teacherClasses.length === 0 && !classesLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-border bg-background/50 p-12 text-center"
        >
          <BookOpen className="mx-auto h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-sm font-semibold text-primary mb-2">
            {t("teacher.dashboard.noClasses", "No classes assigned yet")}
          </p>
          <p className="text-xs text-foreground/70">
            {t(
              "teacher.dashboard.noClassesDesc",
              "Contact the admin team to get assigned to classes.",
            )}
          </p>
        </motion.div>
      )}
    </div>
  );
}
