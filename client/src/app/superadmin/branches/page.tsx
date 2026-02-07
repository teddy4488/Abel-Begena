"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminBranchesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/branches");
  }, [router]);

  return (
    <div className="flex h-40 items-center justify-center text-foreground/70">
      Redirecting to Branches…
    </div>
  );
}
