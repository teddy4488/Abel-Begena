 "use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useGetClassesQuery } from "@/store/api/classApi";
import { useGetMaterialsQuery } from "@/store/api/materialsApi";
import { useGetInstrumentLessonsQuery, useGetLessonProgressQuery } from "@/store/api/attendanceApi";
import { BookOpen, CheckCircle2, FileText, Loader2, ChevronDown, ChevronRight } from "lucide-react";

export default function StudentLessonsPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { pushToast } = useToast();

  const { data: classes = [], isLoading } = useGetClassesQuery();
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.userType !== "student") {
      router.replace("/student");
    }
  }, [isLoggedIn, router, user?.userType]);

  const enrolledClasses = useMemo(
    () =>
      classes.filter(
        (klass) => klass.myEnrollment && klass.myEnrollment.status === "active",
      ),
    [classes],
  );

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3 rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("student.lessons.kicker", "Lessons & materials")}
          </p>
          <h1 className="text-2xl font-serif text-primary sm:text-3xl md:text-4xl">
            {t("student.lessons.title", "Your lessons by class")}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {t(
              "student.lessons.subtitle",
              "Open a class to see its lessons and materials your teachers have uploaded.",
            )}
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : !enrolledClasses.length ? (
          <div className="rounded-3xl surface-elevated p-8 text-center shadow-lg">
            <p className="text-base font-semibold text-primary">
              {t(
                "student.lessons.emptyTitle",
                "You are not enrolled in any classes yet.",
              )}
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "student.lessons.emptyDesc",
                "Browse classes to enroll and unlock structured lessons and materials.",
              )}
            </p>
            <Link
              href="/classes"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-95"
            >
              {t("student.lessons.emptyCta", "Browse classes")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrolledClasses.map((klass) => (
              <ClassLessonsCard
                key={klass._id}
                classId={klass._id}
                title={klass.title}
                expanded={expandedClassId === klass._id}
                onToggle={() =>
                  setExpandedClassId((prev) => (prev === klass._id ? null : klass._id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ClassLessonsCard({
  classId,
  title,
  expanded,
  onToggle,
}: {
  classId: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const { data: lessons = [], isLoading } = useGetInstrumentLessonsQuery(
    { classId },
    { skip: !expanded },
  );
  const { data: materials = [], isLoading: materialsLoading } = useGetMaterialsQuery(
    expanded ? { classId } : undefined,
    { skip: !expanded },
  );
  const { data: progress } = useGetLessonProgressQuery(
    { classId },
    { skip: !expanded },
  );

  const nextLessonId =
    progress?.lessons.find((l) => !l.isCompleted)?._id ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl surface-elevated p-4 shadow-lg sm:p-6"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-secondary" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-secondary/70">
              {t("student.lessons.classLabel", "Class")}
            </p>
            <p className="text-lg font-serif text-primary">{title}</p>
          </div>
        </div>
        <div className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground/70">
          <span className="inline-flex items-center gap-1">
            {expanded ? (
              <>
                <ChevronDown className="h-3 w-3" />
                {t("student.lessons.hide", "Hide")}
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                {t("student.lessons.show", "Show lessons")}
              </>
            )}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 border-t border-border/60 pt-4 space-y-5"
          >
            {progress && progress.totalLessons > 0 && (
              <div className="flex flex-col gap-1 rounded-2xl bg-background/60 p-3 text-xs text-foreground/80 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-primary">
                  {t(
                    "student.lessons.progressSummary",
                    "Completed {{completed}} of {{total}} lessons ({{percent}}%)",
                  )
                    .replace("{{completed}}", String(progress.completedLessons))
                    .replace("{{total}}", String(progress.totalLessons))
                    .replace("{{percent}}", String(progress.percentage))}
                </p>
                {nextLessonId && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-secondary/80">
                    {t(
                      "student.lessons.nextLessonLabel",
                      "Next recommended lesson highlighted below",
                    )}
                  </p>
                )}
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                {t("student.lessons.loading", "Loading lessons...")}
              </div>
            ) : !lessons.length ? (
              <p className="text-sm text-foreground/70">
                {t(
                  "student.lessons.noLessons",
                  "Lessons have not been added to this class yet.",
                )}
              </p>
            ) : (
              <ul className="space-y-3">
                {lessons
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((lesson) => {
                    const lessonMaterials = materials.filter(
                      (m) => m.lessonId === lesson._id,
                    );
                    const lessonProgress = progress?.lessons.find(
                      (lp) => lp._id === lesson._id,
                    );
                    const isCompleted = lessonProgress?.isCompleted ?? false;
                    const isNext = !isCompleted && nextLessonId === lesson._id;
                    return (
                      <li
                        key={lesson._id}
                        className={`rounded-2xl surface-elevated px-4 py-3 text-sm space-y-2 border ${
                          isNext
                            ? "border-secondary/70 shadow-[0_0_0_1px_rgba(180,134,75,0.35)]"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-primary">
                              {lesson.title}
                              {lesson.code ? ` (${lesson.code})` : ""}
                            </p>
                            <p className="text-xs text-foreground/60">
                              {lesson.level === "advanced"
                                ? t("student.lessons.levelAdvanced", "Advanced lesson")
                                : t(
                                    "student.lessons.levelBeginner",
                                    "Beginner lesson",
                                  )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-secondary/80">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5" />
                              <span>
                                {lessonMaterials.length
                                  ? t(
                                      "student.lessons.materialsCount",
                                      "{{count}} material(s)",
                                    ).replace(
                                      "{{count}}",
                                      String(lessonMaterials.length),
                                    )
                                  : t(
                                      "student.lessons.noMaterialsForLesson",
                                      "No materials yet",
                                    )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-foreground/70">
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>
                                    {t(
                                      "student.lessons.lessonCompleted",
                                      "Completed",
                                    )}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="h-2 w-2 rounded-full bg-secondary/40" />
                                  <span>
                                    {t(
                                      "student.lessons.lessonNotCompleted",
                                      "Not completed yet",
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {lessonMaterials.length > 0 && (
                          <div className="space-y-1">
                            {lessonMaterials.map((material) => (
                              <a
                                key={material._id}
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between rounded-xl surface-elevated px-3 py-2 text-xs hover:shadow-md transition"
                              >
                                <span className="truncate">{material.title}</span>
                                <span className="ml-3 text-secondary text-[10px] uppercase tracking-[0.2em]">
                                  {material.fileType ?? "file"}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}

            {/* Class-wide materials (not tied to a specific lesson) */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                {t("student.lessons.classMaterials", "Class materials")}
              </p>
              {materialsLoading ? (
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                  {t("student.lessons.loadingMaterials", "Loading materials...")}
                </div>
              ) : (
                <div className="space-y-2">
                  {materials.filter((m) => !m.lessonId).length === 0 ? (
                    <p className="text-sm text-foreground/70">
                      {t(
                        "student.lessons.noClassMaterials",
                        "No class-wide materials uploaded yet.",
                      )}
                    </p>
                  ) : (
                    materials
                      .filter((m) => !m.lessonId)
                      .map((material) => (
                        <a
                          key={material._id}
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-xl surface-elevated px-3 py-2 text-xs hover:shadow-md transition"
                        >
                          <span className="truncate">{material.title}</span>
                          <span className="ml-3 text-secondary text-[10px] uppercase tracking-[0.2em]">
                            {material.fileType ?? "file"}
                          </span>
                        </a>
                      ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

