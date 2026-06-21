"use client";

import FadeIn from "@/components/animations/FadeIn";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { useGetProductsQuery } from "@/store/api/storeApi";
import { useGetPublicClassesQuery } from "@/store/api/classApi";
import { useGetBranchesQuery } from "@/store/api/branchApi";
import { useGetFaqQuery } from "@/store/api/faqApi";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { extractErrorMessage } from "@/lib/errors";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import {
  LalibelaCross,
  BegenaIcon,
  EOTCOrnament,
  HabeshaThread,
  HabeshaWideStrip,
  OfferingsBand,
  VerticalTextileColumn,
} from "@/components/icons/ethiopian";
import VirtualBegenaPreview from "@/components/home/VirtualBegenaPreview";
// import { BranchesMapModal } from "@/components/branches/BranchesMapModal";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getUserLandingRoute } from "@/lib/utils";


const BranchesMapModal = dynamic(
  () => import("@/components/branches/BranchesMapModal").then((mod) => mod.BranchesMapModal),
  { ssr: false }
);

const heroImage = "/assets/abel.jpg";

const galleryImages = [
  { src: "/assets/abel.jpg", caption: "Handcrafted Begena" },
  { src: "/assets/abel2.jpg", caption: "Luthiers in Prayer" },
  { src: "/assets/able3.jpg", caption: "Sacred Practice" },
  { src: "/assets/begena25.jpg", caption: "Strings of Devotion" },
];

// Sacred media carousel - Ethiopian Orthodox begena / mezmur / hymn only.
// IMPORTANT: Replace the `url` values with your own approved recordings
// (no secular music). Each entry should be a YouTube embed URL such as:
// https://www.youtube.com/embed/VIDEO_ID
const sacredVideos = [
  {
    id: 1,
    url: "https://www.youtube.com/embed/0UZyHXWIOr8",
    title: "Abel Begena – Meditative Mezmur I",
    titleAm: "አቤል በገና – ማሰላሰል መዝሙር 1",
    description: "Original sacred begena hymn performed by Abel.",
    descriptionAm: "በአቤል የተጫወተ የቅዱስ የበገና መዝሙር።",
  },
  {
    id: 2,
    url: "https://www.youtube.com/embed/PKaseOBi6q0",
    title: "Abel Begena – Meditative Mezmur II",
    titleAm: "አቤል በገና – ማሰላሰል መዝሙር 2",
    description: "Continuation of Abel’s contemplative begena series.",
    descriptionAm: "የአቤል የማሰላሰል መዝሙሮች ቀጥሎ።",
  },
  {
    id: 3,
    url: "https://www.youtube.com/embed/qeLMIzrbZf0",
    title: "Abel Begena – Liturgical Hymn",
    titleAm: "አቤል በገና – የሥርዓት መዝሙር",
    description: "Traditional Ethiopian Orthodox Tewahedo chant on begena.",
    descriptionAm: "በበገና የተቀነበረ የኢትዮጵያ ኦርቶዶክስ መዝሙር።",
  },
  {
    id: 4,
    url: "https://www.youtube.com/embed/e1hB7Jp2P7o",
    title: "Abel Begena – Devotional Mezmur",
    titleAm: "አቤል በገና – የመንፈሳዊ መዝሙር",
    description: "Slow, prayerful begena performance for reflection.",
    descriptionAm: "ለማሰላሰል ተስማሚ ዝግጅት ያለው የበገና ንባብ።",
  },
  {
    id: 5,
    url: "https://www.youtube.com/embed/Y0biCmIBu4E",
    title: "Abel Begena – Concert Mezmur",
    titleAm: "አቤል በገና – የኮንሰርት መዝሙር",
    description: "Live-style begena performance showcasing Abel’s craft.",
    descriptionAm: "የአቤል የበገና ችሎታን የሚያሳይ ህያው አፈፃፀም።",
  },
];

export default function Home() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const role = user?.role;

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (isLoggedIn && user) {
      const destination = getUserLandingRoute(user?.userType, user?.role);
      router.replace(destination);
    }
  }, [isLoggedIn, user, router]);
  const { data: products, isLoading: isLoadingProducts } =
    useGetProductsQuery();
  const { data: classHighlights, isLoading: isLoadingClasses } =
    useGetPublicClassesQuery();
  const { data: branches } = useGetBranchesQuery();
  const { data: faqItems } = useGetFaqQuery();
  const featuredProducts = (products?.items ?? []).slice(0, 3);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Contact form — submits to POST /contact which emails the school inbox.
  const { pushToast } = useToast();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingContact) return;
    const name = contactName.trim();
    const email = contactEmail.trim();
    const message = contactMessage.trim();
    if (name.length < 2 || !email || message.length < 10) {
      pushToast({
        title: t("contact.form.invalid", "Please fill in all fields"),
        description: t(
          "contact.form.invalidDesc",
          "Name, valid email, and a message of at least 10 characters are required.",
        ),
        variant: "error",
      });
      return;
    }
    setIsSendingContact(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
      const res = await fetch(`${apiBase}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw errBody ?? new Error(`HTTP ${res.status}`);
      }
      pushToast({
        title: t("contact.form.success", "Message sent"),
        description: t(
          "contact.form.successDesc",
          "We'll get back to you as soon as we can. Thank you for reaching out.",
        ),
        variant: "success",
      });
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (err) {
      pushToast({
        title: t("contact.form.error", "Could not send message"),
        description: extractErrorMessage(
          err,
          t(
            "contact.form.errorDesc",
            "Please try again in a moment, or email us directly.",
          ),
        ),
        variant: "error",
      });
    } finally {
      setIsSendingContact(false);
    }
  };

  const nextVideo = useCallback(() => {
    setCurrentVideoIndex((prev) => (prev + 1) % sacredVideos.length);
  }, []);

  const prevVideo = useCallback(() => {
    setCurrentVideoIndex((prev) => (prev - 1 + sacredVideos.length) % sacredVideos.length);
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 15 });
  const springY = useSpring(y, { stiffness: 80, damping: 15 });
  const rotateX = useTransform(springY, [-120, 120], [10, -10]);
  const rotateY = useTransform(springX, [-120, 120], [-10, 10]);
  const translateX = useTransform(springX, [-150, 150], [-14, 14]);
  const translateY = useTransform(springY, [-150, 150], [-14, 14]);

  const handleMouseMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    x.set(offsetX);
    y.set(offsetY);
  };

  const resetTilt = () => {
    x.set(0);
    y.set(0);
  };

  // Safe date formatter for classes
  const formatClassDate = (createdAt: string | undefined) => {
    if (!createdAt) return t("classHighlights.comingSoon");
    return new Date(createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const serviceCards = useMemo(
    () => [
      {
        id: "online-learning",
        title: t("services.online"),
        copy: t("services.online.copy"),
        image: "/assets/abel.jpg",
        ctaHref: isLoggedIn ? "/dashboard" : "/register",
        ctaLabel: isLoggedIn
          ? t("services.online.cta.auth")
          : t("services.online.cta"),
      },
      {
        id: "physical-learning",
        title: t("services.physical"),
        copy: t("services.physical.copy"),
        image: "/assets/abel2.jpg",
        ctaHref: "#contact",
        ctaLabel: t("services.physical.cta"),
      },
      {
        id: "sacred-market",
        title: t("services.atelier"),
        copy: t("services.atelier.copy"),
        image: "/assets/stock%20begena.jpg",
        ctaHref: "/store",
        ctaLabel: t("services.atelier.cta"),
      },
    ],
    [isLoggedIn, t],
  );

  const primaryCta =
    !isLoggedIn || role === undefined
      ? { href: "#classes", label: t("hero.cta.default") }
      : role === "Teacher"
        ? { href: "/teacher", label: t("hero.cta.teacher") }
        : role === "Admin"
          ? { href: "/admin/console", label: t("hero.cta.admin") }
          : { href: "/dashboard", label: t("hero.cta.student") };

  const secondaryCta =
    role === "Admin"
      ? { href: "/admin/store", label: t("hero.secondary.admin") }
      : role === "Teacher"
        ? { href: "/teacher", label: t("hero.secondary.teacher") }
        : { href: "/store", label: t("hero.secondary.default") };

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors">
      {/* ── Page-spanning vertical textile pillars ── */}
      <VerticalTextileColumn
        width={32}
        opacity={0.45}
        className="pointer-events-none absolute inset-y-0 left-0 z-0 hidden xl:block"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 80' fill='none'><polygon points='20,8 30,24 20,40 10,24' stroke='%23eab308' stroke-width='1.5'/><polygon points='20,40 30,56 20,72 10,56' stroke='%23eab308' stroke-width='1.5'/><circle cx='20' cy='24' r='2' fill='%23eab308'/><circle cx='20' cy='56' r='2' fill='%23eab308'/></svg>")`,
        }}
      />
      <VerticalTextileColumn
        width={32}
        opacity={0.45}
        className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden xl:block"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 80' fill='none'><polygon points='20,8 30,24 20,40 10,24' stroke='%23eab308' stroke-width='1.5'/><polygon points='20,40 30,56 20,72 10,56' stroke='%23eab308' stroke-width='1.5'/><circle cx='20' cy='24' r='2' fill='%23eab308'/><circle cx='20' cy='56' r='2' fill='%23eab308'/></svg>")`,
        }}
      />
      <main className="awdema-bg mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 sm:gap-16 md:px-10 md:py-12 md:gap-20 lg:px-16 lg:py-16">
        {/* ═══════════════════════════════════════════════════════════
            MANUSCRIPT FRAME HERO
            Ge'ez band top → awdema wash content → habesha wide bottom.
            Vertical textile columns on outer edges. Lalibela watermark
            behind text.
            ═══════════════════════════════════════════════════════════ */}
        <section className="ornate-frame overflow-hidden">
          {/* Top edge: Offerings band — dark gilded header with Lalibela cross */}
          <OfferingsBand style={{ borderRadius: 0 }} />

          {/* Main hero content area — awdema-bg adds the subtle pattern wash */}
          <div className="awdema-bg relative px-4 py-10 sm:px-6 sm:py-12 md:px-12 md:py-14 lg:px-16">
            {/* Vertical textile columns on outer edges (decorative side rules) */}
            <VerticalTextileColumn
              width={36}
              opacity={0.35}
              className="pointer-events-none absolute left-2 top-10 bottom-10 hidden md:block"
              style={{ height: "auto" }}
            />
            <VerticalTextileColumn
              width={36}
              opacity={0.35}
              className="pointer-events-none absolute right-2 top-10 bottom-10 hidden md:block"
              style={{ height: "auto" }}
            />

            {/* Begena icon corner accent (top-left) */}
            <div
              className="pointer-events-none absolute left-4 top-4 z-0 hidden opacity-30 lg:block dark:opacity-40"
              aria-hidden="true"
            >
              <BegenaIcon size={48} color="var(--color-secondary)" />
            </div>

            <div className="relative z-10 grid gap-12 lg:grid-cols-2">
            <FadeIn className="space-y-8">
              <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                {t("hero.kicker")}
              </p>
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="text-4xl font-serif text-primary sm:text-5xl lg:text-6xl"
                >
                  {t("hero.title")}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className="text-lg text-foreground opacity-80"
                >
                  {t("hero.subtitle")}
                </motion.p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href={primaryCta.href}
                  className="btn-primary-strong inline-flex items-center justify-center rounded-full px-8 py-3 text-center"
                >
                  {primaryCta.label}
                </Link>
                <Link
                  href={secondaryCta.href}
                  className="btn-ghost-strong inline-flex items-center justify-center rounded-full px-8 py-3 text-center"
                >
                  {secondaryCta.label}
                </Link>
              </div>
            </FadeIn>

            <div
              className="relative flex items-center justify-center"
              onMouseMove={handleMouseMove}
              onMouseLeave={resetTilt}
            >
              <motion.div
                className="absolute inset-12 -z-10 rounded-[28px] bg-(--color-secondary-glow) blur-3xl"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              />
              <motion.div
                className="relative overflow-hidden rounded-[28px] bg-[var(--color-surface-elevated)] p-4 shadow-[0_25px_60px_var(--color-primary-glow)] transition-colors dark:bg-[var(--color-surface-elevated)]"
                style={{ rotateX, rotateY, x: translateX, y: translateY }}
                animate={{ y: ["-4%", "4%", "-4%"] }}
                transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
              >
                <Image
                  src={heroImage}
                  alt={t("hero.imageCaption", "Liqe-mezemran Deacon Abel Tesfaye")}
                  width={540}
                  height={720}
                  className="rounded-[22px] object-cover"
                  priority
                />
                {/* Caption — name of the person in the hero photograph */}
                <p className="mt-3 text-center text-sm font-serif tracking-wide text-primary">
                  {t("hero.imageCaption", "Liqe-mezemran Deacon Abel Tesfaye")}
                </p>
              </motion.div>
            </div>
            </div>
          </div>

          {/* Bottom edge: vivid Habesha strip — visual punctuation for the hero */}
          <HabeshaWideStrip style={{ borderRadius: 0 }} />
        </section>

        {/* Sacred Videos Carousel Section */}
        <section className="relative overflow-hidden rounded-[32px] bg-[var(--color-surface-elevated)] shadow-[0_60px_120px_var(--color-primary-glow)] dark:bg-[var(--color-surface-elevated)]">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-secondary-soft)] opacity-70 dark:opacity-50" />
          
          {/* Animated background particles */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, var(--color-secondary-glow) 0%, transparent 50%), radial-gradient(circle at 80% 50%, var(--color-primary-glow) 0%, transparent 50%)",
              backgroundSize: "200% 200%",
            }}
          />

          <div className="relative px-6 py-14 md:px-12 lg:px-16">
            <FadeIn className="mb-8 text-center">
              <div className="flex justify-center mb-3" aria-hidden="true">
                <EOTCOrnament size={80} color="var(--color-secondary)" />
              </div>
              <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                {t("video.section.kicker")}
              </p>
              <h2 className="mt-2 text-3xl font-serif text-primary sm:text-4xl lg:text-5xl">
                {t("video.section.title")}
              </h2>
            </FadeIn>

            <div className="relative">
              {/* Video Container */}
              <div className="relative mx-auto max-w-4xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentVideoIndex}
                    initial={{ opacity: 0, scale: 0.95, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -50 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="relative overflow-hidden rounded-[24px] bg-[var(--color-card-bg)] shadow-[0_25px_60px_var(--color-primary-glow)] dark:bg-[var(--color-card-bg)]"
                  >
                    {/* Video iframe with aspect ratio */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-[24px] bg-[var(--color-background-subtle)] dark:bg-[var(--color-background-subtle)]">
                      <iframe
                        src={sacredVideos[currentVideoIndex].url}
                        title={locale === "am" ? sacredVideos[currentVideoIndex].titleAm : sacredVideos[currentVideoIndex].title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>

                    {/* Video info overlay */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/50 to-transparent p-6"
                    >
                      <h3 className="text-xl font-serif text-white md:text-2xl">
                        {locale === "am" ? sacredVideos[currentVideoIndex].titleAm : sacredVideos[currentVideoIndex].title}
                      </h3>
                      <p className="mt-1 text-sm text-white/80">
                        {locale === "am" ? sacredVideos[currentVideoIndex].descriptionAm : sacredVideos[currentVideoIndex].description}
                      </p>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                <button
                  onClick={prevVideo}
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-secondary shadow-[0_8px_30px_var(--color-primary-glow)] backdrop-blur-md transition-all hover:-translate-x-1/2 hover:-translate-y-1/2 hover:scale-110 hover:bg-secondary hover:text-primary-foreground md:-translate-x-6 md:hover:-translate-x-6 dark:bg-[var(--color-surface-elevated)]"
                  aria-label={t("video.section.prev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextVideo}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-secondary shadow-[0_8px_30px_var(--color-primary-glow)] backdrop-blur-md transition-all hover:-translate-y-1/2 hover:translate-x-1/2 hover:scale-110 hover:bg-secondary hover:text-primary-foreground md:translate-x-6 md:hover:translate-x-6 dark:bg-[var(--color-surface-elevated)]"
                  aria-label={t("video.section.next")}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Video indicators */}
              <div className="mt-6 flex items-center justify-center gap-2">
                {sacredVideos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVideoIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentVideoIndex
                        ? "w-8 bg-secondary shadow-[0_0_12px_var(--color-secondary-glow)]"
                        : "w-2 bg-secondary/30 hover:bg-secondary/50"
                    }`}
                    aria-label={`Go to video ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <VirtualBegenaPreview />

        <HabeshaThread opacity={0.55} />

        {/* ═══════════════════════════════════════════════════════════
            TRINITY CARDS · services
            Centered gilded Lalibela cross + Habesha-flanked kicker.
            ═══════════════════════════════════════════════════════════ */}
        <section id="services" className="space-y-6">
          <FadeIn>
            {/* Gilded Lalibela centerpiece */}
            <div className="flex justify-center">
              <LalibelaCross
                size={36}
                strokeWidth={6}
                color="var(--color-gilt)"
                style={{ filter: "drop-shadow(0 2px 8px rgba(212,164,55,0.5))" }}
              />
            </div>

            {/* Tri-band header: thread / kicker / thread */}
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <HabeshaThread my={0} />
              <p className="whitespace-nowrap text-xs uppercase tracking-[0.35em] text-secondary">
                {t("services.kicker")}
              </p>
              <HabeshaThread my={0} />
            </div>

            <h2 className="mt-3 text-center text-3xl font-serif text-primary">
              {t("services.title")}
            </h2>
            <div className="flex justify-center mt-2" aria-hidden="true">
              <EOTCOrnament size={64} color="var(--color-secondary)" />
            </div>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {serviceCards.map((card, index) => (
              <FadeIn
                key={card.id}
                delay={0.1 * index}
                className="selectable tonal-lift group flex flex-col overflow-hidden"
              >
                <div id={card.id} className="relative h-52 w-full overflow-hidden bg-[var(--color-background-subtle)]">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/90">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-2xl font-serif text-primary">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground/80">{card.copy}</p>
                  <Link
                    href={card.ctaHref}
                    className="btn-primary-strong mt-auto inline-flex items-center justify-center rounded-full px-5 py-2 text-sm"
                  >
                    {card.ctaLabel}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section
          id="classes"
          className="space-y-6 rounded-[32px] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-[0_40px_80px_var(--color-primary-glow)] dark:bg-[var(--color-surface-elevated)]"
        >
          <FadeIn className="flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-1" aria-hidden="true">
              <EOTCOrnament size={60} color="var(--color-secondary)" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("classHighlights.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("classHighlights.title")}
            </h2>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("classHighlights.description")}
            </p>
          </FadeIn>
          {isLoadingClasses ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("classHighlights.loading")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(classHighlights ?? []).map((klass) => (
                <FadeIn
                  key={klass._id}
                  className="rounded-3xl bg-[var(--color-card-bg)] p-5 transition-all hover:bg-[var(--color-card-hover)] dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                    {formatClassDate(klass.createdAt)}
                  </p>
                  <h3 className="mt-2 text-2xl font-serif text-primary">
                    {klass.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-secondary">
                    {klass.isLive
                      ? t("classHighlights.liveNow")
                      : t("classHighlights.enrollmentOpen")}
                  </p>
                  <Link
                    href={isLoggedIn ? "/dashboard" : "/register"}
                    className="mt-4 inline-flex text-sm font-semibold text-secondary underline-offset-4 hover:underline"
                  >
                    {isLoggedIn
                      ? t("classHighlights.viewDashboard")
                      : t("classHighlights.register")}
                  </Link>
                </FadeIn>
              ))}
              {!classHighlights?.length && !isLoadingClasses && (
                <p className="text-sm text-foreground/70">
                  {t("classHighlights.empty")}
                </p>
              )}
            </div>
          )}
        </section>

        <section
          id="featured-store"
          className="space-y-6 rounded-[32px] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-[0_40px_80px_var(--color-primary-glow)] dark:bg-[var(--color-surface-elevated)]"
        >
          <FadeIn className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                {t("store.kicker")}
              </p>
              <h2 className="text-3xl font-serif text-primary">
                {t("store.title")}
              </h2>
            </div>
            <Link
              href="/store"
              className="rounded-full bg-[var(--color-secondary-soft)] px-6 py-2 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:opacity-80 dark:bg-[var(--color-secondary-soft)] dark:hover:opacity-80"
            >
              {t("store.viewAll")}
            </Link>
          </FadeIn>
          {isLoadingProducts ? (
            <p className="text-sm text-foreground/70">
              {t("store.loading")}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {featuredProducts.map((product) => (
                <FadeIn
                  key={product._id}
                  className="flex flex-col rounded-3xl bg-[var(--color-card-bg)] p-5 transition-all hover:bg-[var(--color-card-hover)] dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]"
                >
                  <div className="relative mb-4 h-48 overflow-hidden rounded-2xl bg-[var(--color-background-subtle)] dark:bg-[var(--color-background-subtle)]">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-foreground/50">
                        {t("store.imagePlaceholder")}
                      </div>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-secondary/80">
                    {product.instrumentType}
                  </p>
                  <h3 className="text-xl font-serif text-primary">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">
                    {product.shortDescription}
                  </p>
                  <p className="mt-4 text-lg font-semibold text-primary">
                    {product.price.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                  <Link
                    href={`/store/${product._id}`}
                    className="mt-4 inline-flex items-center text-sm font-semibold text-secondary"
                  >
                    {t("store.viewDetails")}
                  </Link>
                </FadeIn>
              ))}
              {!featuredProducts.length && !isLoadingProducts && (
                <p className="text-sm text-foreground/70">
                  {t("store.empty")}
                </p>
              )}
            </div>
          )}
        </section>

        <section
          id="sacred-market"
          className="grid gap-10 rounded-[32px] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-[0_60px_120px_var(--color-primary-glow)] lg:grid-cols-2 dark:bg-[var(--color-surface-elevated)]"
        >
          <FadeIn className="space-y-5">
            <div className="flex items-center gap-3" aria-hidden="true">
              <EOTCOrnament size={60} color="var(--color-secondary)" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("sacred.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("sacred.title")}
            </h2>
            <p className="text-sm text-foreground/80">{t("sacred.copy")}</p>
            <ul className="space-y-3 text-sm text-foreground/80">
              <li>• {t("sacred.bullet.one")}</li>
              <li>• {t("sacred.bullet.two")}</li>
              <li>• {t("sacred.bullet.three")}</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/store"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
              >
                {t("sacred.cta.store")}
              </Link>
              <Link
                href="#contact"
                className="rounded-full bg-[var(--color-secondary-soft)] px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:opacity-80 dark:bg-[var(--color-secondary-soft)] dark:hover:opacity-80"
              >
                {t("sacred.cta.quote")}
              </Link>
            </div>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2">
            {galleryImages.slice(0, 4).map((image) => (
              <FadeIn
                key={image.src}
                className="relative h-48 overflow-hidden rounded-2xl bg-[var(--color-background-subtle)] dark:bg-[var(--color-background-subtle)]"
              >
                <Image
                  src={image.src}
                  alt={image.caption}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-4 py-3 text-sm text-white">
                  {image.caption}
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <HabeshaThread opacity={0.55} />

        <section
          id="about"
          className="grid gap-10 rounded-[32px] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-[0_40px_80px_var(--color-primary-glow)] lg:grid-cols-2 dark:bg-[var(--color-surface-elevated)]"
        >
          <FadeIn className="space-y-5">
            <div className="flex items-center gap-3" aria-hidden="true">
              <EOTCOrnament size={60} color="var(--color-secondary)" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("about.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("about.title")}
            </h2>
            <p className="text-sm text-foreground/80">{t("about.copy")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--color-card-bg)] p-4 text-sm transition-all hover:bg-[var(--color-card-hover)] dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]">
                <p className="text-2xl font-semibold text-primary">
                  {t("about.statOne.value")}
                </p>
                <p className="text-[var(--color-foreground-muted)]">
                  {t("about.statOne.label")}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-card-bg)] p-4 text-sm transition-all hover:bg-[var(--color-card-hover)] dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]">
                <p className="text-2xl font-semibold text-primary">
                  {t("about.statTwo.value")}
                </p>
                <p className="text-[var(--color-foreground-muted)]">
                  {t("about.statTwo.label")}
                </p>
              </div>
            </div>
          </FadeIn>
          <FadeIn className="relative h-80 overflow-hidden rounded-3xl bg-[var(--color-background-subtle)] dark:bg-[var(--color-background-subtle)]">
            <Image
              src="/assets/begena25.jpg"
              alt="About Abel Begena"
              fill
              className="object-cover"
            />
          </FadeIn>
        </section>

        <HabeshaThread opacity={0.55} />

        {/* FAQ Section */}
        <section
          id="faq"
          className="space-y-6 rounded-[32px] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-[0_40px_80px_var(--color-primary-glow)] dark:bg-[var(--color-surface-elevated)]"
        >
          <FadeIn className="text-center">
            <div className="flex justify-center mb-3" aria-hidden="true">
              <EOTCOrnament size={80} color="var(--color-secondary)" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("faq.kicker")}
            </p>
            <h2 className="mt-2 text-3xl font-serif text-primary">
              {t("faq.title")}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">
              {t("faq.subtitle")}
            </p>
          </FadeIn>
          <div className="mx-auto max-w-3xl space-y-4">
            {(faqItems && faqItems.length > 0
              ? faqItems
              : [1, 2, 3, 4, 5].map((num) => ({
                  _id: `local-${num}`,
                  question: t(`faq.q${num}`),
                  answer: t(`faq.a${num}`),
                }))
            ).map((faq, idx) => (
              <FadeIn key={faq._id ?? idx} delay={0.05 * (idx + 1)}>
                <details className="group rounded-2xl bg-[var(--color-card-bg)] transition-all hover:bg-[var(--color-card-hover)] dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-primary">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 text-secondary transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-4 text-sm text-[var(--color-foreground-muted)]">
                    {faq.answer}
                  </div>
                </details>
              </FadeIn>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="grid gap-10 rounded-[32px] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-[0_40px_80px_var(--color-primary-glow)] lg:grid-cols-2 dark:bg-[var(--color-surface-elevated)]"
        >
          <FadeIn className="space-y-4">
            <div className="flex items-center gap-3" aria-hidden="true">
              <EOTCOrnament size={60} color="var(--color-secondary)" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("contact.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("contact.title")}
            </h2>
            <div className="space-y-3 text-sm text-foreground/80">
              <p>
                {t("contact.emailLabel")}{" "}
                <a
                  href="mailto:hello@abelbegena.com"
                  className="font-semibold text-secondary"
                >
                  hello@abelbegena.com
                </a>
              </p>
              <p>
                {t("contact.phoneLabel")}{" "}
                <a
                  href="tel:+251911000000"
                  className="font-semibold text-secondary"
                >
                  +251 911 000 000
                </a>
              </p>
              <p>{t("contact.location")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-secondary-soft)] px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:opacity-80 dark:bg-[var(--color-secondary-soft)] dark:hover:opacity-80"
            >
              {t("contact.viewMap")}
            </button>
          </FadeIn>
          <FadeIn className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("contact.form.kicker")}
            </p>
            <form onSubmit={handleContactSubmit} className="space-y-3">
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("contact.form.name")}
                disabled={isSendingContact}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:bg-[var(--color-card-hover)] focus:ring-2 focus:ring-secondary/30 disabled:opacity-60 dark:bg-[var(--color-card-bg)] dark:focus:bg-[var(--color-card-hover)]"
              />
              <input
                type="email"
                required
                maxLength={160}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t("contact.form.email")}
                disabled={isSendingContact}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:bg-[var(--color-card-hover)] focus:ring-2 focus:ring-secondary/30 disabled:opacity-60 dark:bg-[var(--color-card-bg)] dark:focus:bg-[var(--color-card-hover)]"
              />
              <textarea
                required
                minLength={10}
                maxLength={4000}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder={t("contact.form.message")}
                disabled={isSendingContact}
                rows={5}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:bg-[var(--color-card-hover)] focus:ring-2 focus:ring-secondary/30 disabled:opacity-60 dark:bg-[var(--color-card-bg)] dark:focus:bg-[var(--color-card-hover)]"
              />
              <button
                type="submit"
                disabled={isSendingContact}
                className="btn-primary-strong inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm shadow-[0_20px_30px_var(--color-primary-glow)]"
              >
                {isSendingContact ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("contact.form.submitting", "Sending…")}
                  </>
                ) : (
                  t("contact.form.submit")
                )}
              </button>
            </form>
          </FadeIn>
        </section>
      </main>
      <BranchesMapModal
        open={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        branches={branches}
      />
    </div>
  );
}