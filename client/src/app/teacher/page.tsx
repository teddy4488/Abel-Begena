"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { useGetClassesQuery } from "@/store/api/classApi";
import { useGetManagePostsQuery } from "@/store/api/blogApi";

export default function TeacherDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Active Classes
          </p>
          <p className="mt-2 text-3xl font-serif text-primary">
            {classesLoading ? "..." : teacherClasses.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Published Posts
          </p>
          <p className="mt-2 text-3xl font-serif text-primary">
            {postsLoading ? "..." : myPosts.filter((p) => p.isPublished).length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Drafts
          </p>
          <p className="mt-2 text-3xl font-serif text-primary">
            {postsLoading ? "..." : myPosts.filter((p) => !p.isPublished).length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              Quick Actions
            </p>
            <h2 className="text-2xl font-serif text-primary">Get Started</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/teacher/posts"
            className="rounded-xl border border-border bg-background/50 p-4 transition hover:bg-secondary/5"
          >
            <p className="text-sm font-semibold text-primary">Create Post</p>
            <p className="mt-1 text-xs text-foreground/70">
              Write a new blog post or lesson
            </p>
          </Link>
          <Link
            href="/teacher/materials"
            className="rounded-xl border border-border bg-background/50 p-4 transition hover:bg-secondary/5"
          >
            <p className="text-sm font-semibold text-primary">Upload Materials</p>
            <p className="mt-1 text-xs text-foreground/70">
              Add PDFs, slides, or videos
            </p>
          </Link>
          <Link
            href="/teacher/live"
            className="rounded-xl border border-border bg-background/50 p-4 transition hover:bg-secondary/5"
          >
            <p className="text-sm font-semibold text-primary">Manage Live Classes</p>
            <p className="mt-1 text-xs text-foreground/70">
              Start or stop live sessions
            </p>
          </Link>
          <Link
            href="/teacher/students"
            className="rounded-xl border border-border bg-background/50 p-4 transition hover:bg-secondary/5"
          >
            <p className="text-sm font-semibold text-primary">View Students</p>
            <p className="mt-1 text-xs text-foreground/70">
              See enrolled students
            </p>
          </Link>
          <Link
            href="/teacher/schedule"
            className="rounded-xl border border-border bg-background/50 p-4 transition hover:bg-secondary/5"
          >
            <p className="text-sm font-semibold text-primary">Schedule Classes</p>
            <p className="mt-1 text-xs text-foreground/70">
              Plan class times
            </p>
          </Link>
        </div>
      </div>

      {teacherClasses.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              My Classes
            </p>
            <h2 className="text-2xl font-serif text-primary">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {teacherClasses.slice(0, 5).map((klass) => (
              <Link
                key={klass._id}
                href="/teacher/live"
                className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4 transition hover:bg-secondary/5"
              >
                <div>
                  <p className="font-semibold text-primary">{klass.title}</p>
                  <p className="text-xs text-foreground/70">
                    {klass.isLive ? "Live now" : "Offline"}
                  </p>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    klass.isLive ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


