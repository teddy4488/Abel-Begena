"use client";

import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { useGetPostBySlugQuery } from "@/store/api/blogApi";

export default function HeritageArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const {
    data: post,
    isLoading,
    error,
  } = useGetPostBySlugQuery(slug, { skip: !slug });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p>Loading heritage entry...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <p className="text-lg font-semibold text-primary">
          This article could not be found.
        </p>
        <button
          type="button"
          onClick={() => router.push("/heritage")}
          className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
        >
          Return to heritage
        </button>
      </div>
    );
  }

  // Simple solution - just use new Date() without Date.now()
  // This is pure because it creates a consistent date object for this render
  const displayDate = new Date(
    post.publishedAt ?? post.createdAt ?? new Date()
  ).toLocaleDateString();

  return (
    <article className="min-h-screen bg-background text-foreground">
      <div className="relative h-[420px] w-full overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${post.coverImage})` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 py-8 md:px-12">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Heritage Journal
          </p>
          <h1 className="text-4xl font-serif text-white md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-gray-200">
            {post.author?.firstName || post.author?.email || "Editorial Team"} •{" "}
            {displayDate}
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-3xl space-y-6 px-6 py-12 md:px-0"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Apply Tailwind classes to markdown elements
            h1: ({ children }) => (
              <h1 className="font-serif text-3xl text-primary md:text-4xl">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="font-serif text-2xl text-primary md:text-3xl">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-serif text-xl text-primary md:text-2xl">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-foreground text-lg leading-relaxed">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-primary">
                {children}
              </strong>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                className="text-secondary underline hover:text-secondary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 text-foreground">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 text-foreground">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="mb-2 text-foreground">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-secondary pl-4 italic text-foreground/80">
                {children}
              </blockquote>
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </motion.div>
    </article>
  );
}