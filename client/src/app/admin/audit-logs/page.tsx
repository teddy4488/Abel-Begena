"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAuditLogsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/console");
  }, [router]);
  return null;
}
