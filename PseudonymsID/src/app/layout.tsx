import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Pseudonyms ID",
  description: "Sovereign identity layer across the ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main style={{ flex: 1, width: "100%" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
