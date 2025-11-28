import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Virtual Begena Experience",
  description:
    "Play, record, and tune the sacred Begena lyre directly from your browser.",
};

const VirtualBegenaExperience = dynamic(
  () =>
    import(
      "@/features/virtual-begena/components/VirtualBegenaExperience"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center bg-background text-secondary">
        <div className="flex items-center gap-3 rounded-full border border-border/50 px-6 py-3 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the Begena studio...
        </div>
      </div>
    ),
  },
);

export default function VirtualBegenaPage() {
  return <VirtualBegenaExperience />;
}


