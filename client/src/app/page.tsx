"use client";

import FadeIn from "@/components/animations/FadeIn";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { useGetProductsQuery } from "@/store/api/storeApi";
import { useGetPublicClassesQuery } from "@/store/api/classApi";
import { useI18n } from "@/components/providers/I18nProvider";

const heroImage =
  "https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=900&q=90";

const galleryImages = [
  { src: "/assets/abel.jpg", caption: "Handcrafted Begena" },
  { src: "/assets/abel2.jpg", caption: "Luthiers in Prayer" },
  { src: "/assets/able3.jpg", caption: "Sacred Practice" },
  { src: "/assets/begena25.jpg", caption: "Strings of Devotion" },
];

export default function Home() {
  const { t } = useI18n();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const role = user?.role;
  const { data: products, isLoading: isLoadingProducts } =
    useGetProductsQuery();
  const { data: classHighlights, isLoading: isLoadingClasses } =
    useGetPublicClassesQuery();
  const featuredProducts = (products ?? []).slice(0, 3);

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
      ? { href: "/classes", label: t("hero.cta.default") }
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
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16 md:px-10 lg:px-16">
        <section className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-14 shadow-[0_60px_120px_var(--color-primary-glow)] transition-colors md:px-12 lg:px-16">
          <div className="absolute inset-0 bg-linear-to-tr from-background via-surface to-(--color-secondary-soft) opacity-80" />
          <div className="relative grid gap-12 lg:grid-cols-2">
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
                  className="rounded-full bg-primary px-8 py-3 text-center text-primary-foreground shadow-[0_25px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  {primaryCta.label}
                </Link>
                <Link
                  href={secondaryCta.href}
                  className="rounded-full border border-secondary px-8 py-3 text-center text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
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
                className="relative overflow-hidden rounded-[28px] border border-border bg-(--color-background-soft) p-4 shadow-[0_25px_60px_var(--color-primary-glow)] transition-colors dark:bg-surface"
                style={{ rotateX, rotateY, x: translateX, y: translateY }}
                animate={{ y: ["-4%", "4%", "-4%"] }}
                transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
              >
                <Image
                  src={heroImage}
                  alt="Begena artisan instrument"
                  width={540}
                  height={720}
                  className="rounded-[22px] object-cover"
                  priority
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section id="services" className="space-y-6">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("services.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("services.title")}
            </h2>
          </FadeIn>
          <div className="grid gap-6 md:grid-cols-3">
            {serviceCards.map((card, index) => (
              <FadeIn
                key={card.id}
                delay={0.1 * index}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_25px_60px_var(--color-primary-glow)]"
              >
                <div id={card.id} className="relative h-52 w-full overflow-hidden">
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
                    className="mt-auto inline-flex items-center justify-center rounded-full border border-secondary px-5 py-2 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
                  >
                    {card.ctaLabel}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="space-y-6 rounded-[32px] border border-border bg-surface p-8 shadow-[0_40px_80px_var(--color-primary-glow)]">
          <FadeIn className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("classHighlights.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("classHighlights.title")}
            </h2>
            <p className="text-sm text-foreground/70">
              {t("classHighlights.description")}
            </p>
          </FadeIn>
          {isLoadingClasses ? (
            <p className="text-sm text-foreground/70">
              {t("classHighlights.loading")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(classHighlights ?? []).map((klass) => (
                <FadeIn
                  key={klass._id}
                  className="rounded-3xl border border-border bg-background/70 p-5"
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
          className="space-y-6 rounded-[32px] border border-border bg-surface p-8 shadow-[0_40px_80px_var(--color-primary-glow)]"
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
              className="rounded-full border border-secondary px-6 py-2 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
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
                  className="flex flex-col rounded-3xl border border-border bg-background/70 p-5"
                >
                  <div className="relative mb-4 h-48 overflow-hidden rounded-2xl border border-border">
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
                  <p className="mt-2 text-sm text-foreground/70">
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
          className="grid gap-10 rounded-[32px] border border-border bg-surface p-8 shadow-[0_60px_120px_var(--color-primary-glow)] lg:grid-cols-2"
        >
          <FadeIn className="space-y-5">
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
                className="rounded-full border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
              >
                {t("sacred.cta.quote")}
              </Link>
            </div>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2">
            {galleryImages.slice(0, 4).map((image) => (
              <FadeIn
                key={image.src}
                className="relative h-48 overflow-hidden rounded-2xl border border-border"
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

        <section
          id="about"
          className="grid gap-10 rounded-[32px] border border-border bg-surface p-8 shadow-[0_40px_80px_var(--color-primary-glow)] lg:grid-cols-2"
        >
          <FadeIn className="space-y-5">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("about.kicker")}
            </p>
            <h2 className="text-3xl font-serif text-primary">
              {t("about.title")}
            </h2>
            <p className="text-sm text-foreground/80">{t("about.copy")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
                <p className="text-2xl font-semibold text-primary">
                  {t("about.statOne.value")}
                </p>
                <p className="text-foreground/70">
                  {t("about.statOne.label")}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
                <p className="text-2xl font-semibold text-primary">
                  {t("about.statTwo.value")}
                </p>
                <p className="text-foreground/70">
                  {t("about.statTwo.label")}
                </p>
              </div>
            </div>
          </FadeIn>
          <FadeIn className="relative h-80 overflow-hidden rounded-3xl border border-border">
            <Image
              src="/assets/begena25.jpg"
              alt="About Abel Begena"
              fill
              className="object-cover"
            />
          </FadeIn>
        </section>

        <section
          id="contact"
          className="grid gap-10 rounded-[32px] border border-border bg-surface p-8 shadow-[0_40px_80px_var(--color-primary-glow)] lg:grid-cols-2"
        >
          <FadeIn className="space-y-4">
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
            <Link
              href="https://maps.app.goo.gl/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-(--color-secondary-soft)"
            >
              {t("contact.viewMap")}
            </Link>
          </FadeIn>
          <FadeIn className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("contact.form.kicker")}
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t("contact.form.name")}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
              <input
                type="email"
                placeholder={t("contact.form.email")}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
              <textarea
                placeholder={t("contact.form.message")}
                rows={5}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <Link
              href="mailto:hello@abelbegena.com"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
            >
              {t("contact.form.submit")}
            </Link>
          </FadeIn>
        </section>
      </main>
    </div>
  );
}