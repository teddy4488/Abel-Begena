"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useUploadMaterialMutation } from "@/store/api/classApi";
import { Upload, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const [uploadMaterial, { isLoading, isSuccess, isError }] =
    useUploadMaterialMutation();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (user?.role !== "Teacher" && user?.role !== "Admin") {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, user, router]);

  if (!isLoggedIn || (user?.role !== "Teacher" && user?.role !== "Admin")) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file");
      return;
    }

    try {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await uploadMaterial({
        classId,
        file,
        title: title || file.name,
      }).unwrap();

      setUploadProgress(100);
      clearInterval(interval);

      setTimeout(() => {
        setTitle("");
        setFile(null);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadProgress(0);
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Teacher Panel
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Upload Class Material
          </h1>
          <p className="text-foreground/70">
            Share PDFs, videos, and other resources with your students.
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-surface p-8 shadow-[0_25px_60px_rgba(45,10,18,0.08)]"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-secondary">
                Material Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Week 1: Introduction to Begena"
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/40"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-secondary">
                File
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                  accept=".pdf,.doc,.docx,.mp4,.mov,.avi,.ppt,.pptx"
                  required
                />
                <label
                  htmlFor="file-input"
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background/50 px-6 py-8 text-center transition hover:border-secondary hover:bg-secondary/5"
                >
                  <Upload className="h-6 w-6 text-secondary" />
                  <div className="flex-1 text-left">
                    {file ? (
                      <div>
                        <p className="font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-foreground/70">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-foreground">
                          Click to select a file
                        </p>
                        <p className="text-xs text-foreground/70">
                          PDF, Video, PowerPoint, or Document
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/70">Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background/80">
                  <motion.div
                    className="h-full bg-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span>Material uploaded successfully!</span>
              </div>
            )}

            {isError && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <X className="h-5 w-5" />
                <span>Upload failed. Please try again.</span>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading || !file || uploadProgress > 0}
                className="flex-1 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Uploading..." : "Upload Material"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-full border border-border px-6 py-3 font-medium transition hover:bg-secondary/10"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

