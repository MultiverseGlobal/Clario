import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started — Metaphor",
  description: "Build your connected workspace. Name your project, connect your tools, and let Metaphor handle the context.",
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {children}
    </div>
  );
}
