"use client";

import FadeIn from "@/components/animations/FadeIn";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";

const heroImage =
  "https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=900&q=90";

const galleryImages = [
  { src: "/assets/abel.jpg", caption: "Handcrafted Begena" },
  { src: "/assets/abel2.jpg", caption: "Luthiers in Prayer" },
  { src: "/assets/able3.jpg", caption: "Sacred Practice" },
  { src: "/assets/begena25.jpg", caption: "Strings of Devotion" },
];

export default function Home() {
  const { isLoggedIn } = useAppSelector((state) => state.auth);
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

  const serviceCards = [
    {
      id: "online-learning",
      title: "Online Teaching",
      copy:
        "Attend live Begena, Masinko, and Washint lessons with clergy-approved instructors, streamed from Addis Ababa.",
      image: "/assets/abel.jpg",
      ctaHref: isLoggedIn ? "/dashboard" : "/register",
      ctaLabel: isLoggedIn ? "Go to Dashboard" : "Join Online Class",
    },
    {
      id: "physical-learning",
      title: "Physical Conservatory",
      copy:
        "Visit our studio for private tutelage, choir rehearsals, and heritage labs preserving Saint Yared’s repertoire.",
      image: "/assets/abel2.jpg",
      ctaHref: "#contact",
      ctaLabel: "Book a Visit",
    },
    {
      id: "sacred-market",
      title: "Instrument Atelier",
      copy:
        "Commission handcrafted Begena, Kirar, drums, and manuscripts produced by artisans devoted to the Orthodox liturgy.",
      image: "/assets/stock%20begena.jpg",
      ctaHref: "/store",
      ctaLabel: "Browse Store",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16 md:px-10 lg:px-16">
        <section className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-14 shadow-[0_60px_120px_var(--color-primary-glow)] transition-colors md:px-12 lg:px-16">
          <div className="absolute inset-0 bg-gradient-to-tr from-background via-surface to-[color:var(--color-secondary-soft)] opacity-80" />
          <div className="relative grid gap-12 lg:grid-cols-2">
            <FadeIn className="space-y-8">
              <p className="text-xs uppercase tracking-[0.35em] text-secondary">
                Ethiopian Orthodox Tewahedo
              </p>
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="text-4xl font-serif text-primary sm:text-5xl lg:text-6xl"
                >
                  The Harp of David
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className="text-lg text-foreground opacity-80"
                >
                  Restoring the ancient sound of praise through immersive study,
                  artisanship, and community worship rooted in Saint Yared’s
                  inheritance.
                </motion.p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="#services"
                  className="rounded-full bg-primary px-8 py-3 text-center text-primary-foreground shadow-[0_25px_40px_var(--color-primary-glow)] transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  Start Learning
                </Link>
                <Link
                  href="/store"
                  className="rounded-full border border-secondary px-8 py-3 text-center text-secondary transition hover:-translate-y-0.5 hover:bg-[color:var(--color-secondary-soft)]"
                >
                  Visit Shop
                </Link>
              </div>
            </FadeIn>

            <div
              className="relative flex items-center justify-center"
              onMouseMove={handleMouseMove}
              onMouseLeave={resetTilt}
            >
              <motion.div
                className="absolute inset-12 -z-10 rounded-[28px] bg-[color:var(--color-secondary-glow)] blur-3xl"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              />
              <motion.div
                className="relative overflow-hidden rounded-[28px] border border-border bg-[color:var(--color-background-soft)] p-4 shadow-[0_25px_60px_var(--color-primary-glow)] transition-colors dark:bg-surface"
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
              Offerings
            </p>
            <h2 className="text-3xl font-serif text-primary">
              Serve the Church through practice, formation, and craft.
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
                    className="mt-auto inline-flex items-center justify-center rounded-full border border-secondary px-5 py-2 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-[color:var(--color-secondary-soft)]"
                  >
                    {card.ctaLabel}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section
          id="sacred-market"
          className="grid gap-10 rounded-[32px] border border-border bg-surface p-8 shadow-[0_60px_120px_var(--color-primary-glow)] lg:grid-cols-2"
        >
          <FadeIn className="space-y-5">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              Sacred Atelier
            </p>
            <h2 className="text-3xl font-serif text-primary">
              Every instrument is blessed, tuned, and delivered with reverence.
            </h2>
            <p className="text-sm text-foreground/80">
              Work with our craftsmen to source sustainably harvested wood,
              engrave Ge’ez prayers, and ship worldwide through ethical partners.
            </p>
            <ul className="space-y-3 text-sm text-foreground/80">
              <li>• Custom Begena & Kirar sizing consultations</li>
              <li>• Live video approvals before shipping</li>
              <li>• Cloudinary media archive for each build</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/store"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
              >
                Browse Shop
              </Link>
              <Link
                href="#contact"
                className="rounded-full border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-[color:var(--color-secondary-soft)]"
              >
                Request a Quote
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-sm text-white">
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
              About Us
            </p>
            <h2 className="text-3xl font-serif text-primary">
              Guided by the liturgy, accountable to the faithful.
            </h2>
            <p className="text-sm text-foreground/80">
              Abel Begena is a collective of deacons, artisans, and cultural
              historians preserving Ethiopian Orthodox musical heritage. From
              Addis Ababa to diaspora communities, we steward instruments,
              lessons, archives, and e-commerce in one prayerful ecosystem.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
                <p className="text-2xl font-semibold text-primary">30+</p>
                <p className="text-foreground/70">Years combined teaching</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
                <p className="text-2xl font-semibold text-primary">150+</p>
                <p className="text-foreground/70">Instruments delivered</p>
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
              Contact
            </p>
            <h2 className="text-3xl font-serif text-primary">
              Reach out for lessons, commissions, or collaborations.
            </h2>
            <div className="space-y-3 text-sm text-foreground/80">
              <p>
                Email:{" "}
                <a
                  href="mailto:hello@abelbegena.com"
                  className="font-semibold text-secondary"
                >
                  hello@abelbegena.com
                </a>
              </p>
              <p>
                Phone / Telegram:{" "}
                <a
                  href="tel:+251911000000"
                  className="font-semibold text-secondary"
                >
                  +251 911 000 000
                </a>
              </p>
              <p>Studio: Bole Sub-City, Addis Ababa, Ethiopia</p>
            </div>
            <Link
              href="https://maps.app.goo.gl/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition hover:-translate-y-0.5 hover:bg-[color:var(--color-secondary-soft)]"
            >
              View Map
            </Link>
          </FadeIn>
          <FadeIn className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              Quick message
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
              <textarea
                placeholder="How can we serve you?"
                rows={5}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <Link
              href="mailto:hello@abelbegena.com"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_30px_var(--color-primary-glow)] transition hover:-translate-y-0.5"
            >
              Send Message
            </Link>
          </FadeIn>
        </section>
      </main>
    </div>
  );
}
