"use client";

import Link from "next/link";
import { MapPin, Users, BarChart3, Package2, Receipt } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";

const cards = [
  { href: "/superadmin/branches", labelKey: "nav.branches", icon: MapPin, descKey: "superadmin.branchesDesc" },
  { href: "/superadmin/admins", labelKey: "nav.admins", icon: Users, descKey: "superadmin.adminsDesc" },
  { href: "/admin/analytics", labelKey: "nav.analytics", icon: BarChart3, descKey: "superadmin.analyticsDesc" },
  { href: "/admin/store", labelKey: "nav.store", icon: Package2, descKey: "superadmin.storeDesc" },
  { href: "/admin/orders", labelKey: "nav.orders", icon: Receipt, descKey: "superadmin.ordersDesc" },
];

export default function SuperAdminConsolePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          {t("nav.superAdminConsole", "Super Admin")}
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          {t("superadmin.welcome", "Manage branches, admins, and platform settings.")}
        </p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, labelKey, icon: Icon, descKey }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={href}
              className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-5 text-card-foreground shadow-sm transition hover:border-secondary/30 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary/15 p-2">
                  <Icon className="h-5 w-5 text-secondary" />
                </div>
                <span className="font-semibold">{t(labelKey)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(descKey, labelKey)}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
