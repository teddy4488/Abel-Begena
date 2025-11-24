import { GraduationCap, Music3, ShoppingBag } from "lucide-react";
import Link from "next/link";

const quickLinks = [
  {
    href: "#learn",
    title: "Online & Studio Lessons",
    icon: GraduationCap,
    copy:
      "Structured paths for Begena, Masinko, Washint, Kirar, and Kebero.",
  },
  {
    href: "#shop",
    title: "Instrument Marketplace",
    icon: ShoppingBag,
    copy:
      "Hand-crafted instruments, accessories, and maintenance kits.",
  },
  {
    href: "#heritage",
    title: "Liturgical Heritage",
    icon: Music3,
    copy:
      "Stories, devotionals, and teacher insights rooted in EOTC tradition.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 md:px-10 lg:px-16">
        <section className="rounded-3xl bg-primary/95 p-10 text-background shadow-2xl shadow-primary/30 md:p-16">
          <p className="uppercase tracking-[0.3em] text-secondary">
            Ethiopian Orthodox Tewahedo
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Abel Begena
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-background/90">
            A sacred home for learning, crafting, and preserving the voices of
            Ethiopia’s liturgical instruments. Explore immersive lessons,
            artisan-made instruments, and a spiritual community guided by
            tradition.
          </p>
          <div className="mt-10 flex flex-col gap-4 text-base font-semibold sm:flex-row">
            <Link
              href="#learn"
              className="rounded-full bg-secondary px-8 py-3 text-primary transition hover:bg-secondary/90"
            >
              Begin Learning
            </Link>
            <Link
              href="#shop"
              className="rounded-full border border-background/40 px-8 py-3 text-background transition hover:bg-background/10"
            >
              Browse Instruments
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {quickLinks.map(({ href, title, copy, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl border border-primary/10 bg-white/80 p-6 shadow-lg ring-1 ring-primary/5 transition hover:-translate-y-1 hover:bg-white"
            >
              <Icon className="mb-4 h-10 w-10 text-primary" />
              <h2 className="text-2xl font-semibold text-primary">{title}</h2>
              <p className="mt-3 text-base text-foreground/80">{copy}</p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-secondary">
                Discover more →
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
