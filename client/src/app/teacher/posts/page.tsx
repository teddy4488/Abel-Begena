"use client";

import { useAppSelector } from "@/store/hooks";
import { BlogStudio } from "@/components/blog/BlogStudio";

export default function TeacherPostsPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          Content Creation
        </p>
        <h1 className="text-3xl font-serif text-primary">Create & Manage Posts</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Write blog posts, lessons, and educational content. Use Markdown for rich formatting.
        </p>
      </div>
      <BlogStudio
        filterByAuthorId={user?._id ?? user?.id}
        title="My Posts & Lessons"
      />
    </div>
  );
}

