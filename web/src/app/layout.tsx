import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ThemeProvider, noFlashThemeScript } from "@/design-system/hooks/use-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display/celebratory register only — see
// docs/design-system/01-Architecture-Design.md §2.1 and
// docs/design-system/02-Technical-Design-Foundations.md §4.1. Weights
// limited to 400/500, the only two the type scale actually uses.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MentorOS",
  description: "MentorOS — an AI learning companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      // The no-flash script below sets data-theme synchronously before
      // React hydrates, which will always differ from the server-rendered
      // markup's lack of the attribute — expected and safe to suppress
      // here specifically, not a general escape hatch.
      suppressHydrationWarning
    >
      <head>
        {/* Must run synchronously, before first paint, to avoid a flash
            of the wrong theme; see use-theme.tsx's own doc comment. */}
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
