import VirtualBegenaClient from "./VirtualBegenaClient";

export const metadata = {
  title: "Virtual Begena Experience",
  description:
    "Play, record, and tune the sacred Begena lyre directly from your browser.",
};

export default function VirtualBegenaPage() {
  return <VirtualBegenaClient />;
}
