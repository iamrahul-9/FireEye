import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FireEye",
  description: "Next-Gen Safety Management",
};

import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body
        className="antialiased relative min-h-screen overflow-x-hidden font-sans"
      >
        {/* Global Ambient Background */}
        {/* Global Ambient Background */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none transition-colors duration-500 bg-background">
          {/* Light Mode: Subtle depth without strong tints | Dark Mode: Dramatic glows */}
          <div className="absolute top-[-20%] right-[10%] w-[50vw] h-[50vw] bg-orange-300/20 dark:bg-orange-500/10 rounded-full blur-[120px] animate-float opacity-50 dark:opacity-40 mix-blend-normal dark:mix-blend-screen" />

          <div className="absolute bottom-[-20%] left-[10%] w-[50vw] h-[50vw] bg-blue-200/15 dark:bg-blue-500/5 rounded-full blur-[100px] animate-float-delayed opacity-40 dark:opacity-30 mix-blend-normal dark:mix-blend-screen" />
        </div>

        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
