"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const VirtualBegenaExperience = dynamic(
  () => import("@/features/virtual-begena/components/VirtualBegenaExperience"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center bg-background text-secondary">
        <div className="tonal-lift flex items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the Begena studio...
        </div>
      </div>
    ),
  },
);

export default function VirtualBegenaClient() {
  return <VirtualBegenaExperience />;
}


