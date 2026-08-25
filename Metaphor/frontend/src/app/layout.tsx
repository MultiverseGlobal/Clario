import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metaphor — The Context Operating System",
  description: "Metaphor is the Context Operating System for intelligent applications — transforming fragmented events into a living structured knowledge graph.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('metaphor_theme');
                const effective = stored || 'dark';
                if (!stored) localStorage.setItem('metaphor_theme', 'dark');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const resolved = effective === 'system' ? (prefersDark ? 'dark' : 'light') : effective;
                document.documentElement.setAttribute('data-theme', resolved);
                if (resolved === 'dark') document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
