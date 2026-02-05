import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Providers } from "@/components/providers/StoreProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AuthHydrator } from "@/components/providers/AuthHydrator";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { NavbarGate } from "@/components/layout/NavbarGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abel Begena | Ethiopian Liturgical Instruments",
  description:
    "Learn, shop, and experience the sacred instruments of the Ethiopian Orthodox Tewahedo Church.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-background text-foreground antialiased font-sans"
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
