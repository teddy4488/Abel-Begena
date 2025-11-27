import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Providers } from "@/components/providers/StoreProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AuthHydrator } from "@/components/providers/AuthHydrator";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { NavbarGate } from "@/components/layout/NavbarGate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Abel Begena | Ethiopian Liturgical Instruments",
  description:
    "Learn, shop, and experience the sacred instruments of the Ethiopian Orthodox Tewahedo Church.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${merriweather.variable} bg-background text-foreground antialiased`}
      >
        <Providers>
          <ThemeProvider>
            <ToastProvider>
              <I18nProvider>
              <AuthHydrator />
              <div className="relative flex min-h-screen flex-col bg-background text-foreground transition-colors">
                  <NavbarGate />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              </I18nProvider>
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
