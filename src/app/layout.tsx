import type { Metadata, Viewport } from "next";
import { Baloo_2, Mukta } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Both from Ek Type, a Mumbai foundry; both cover Devanagari. Next serves the
// files from this site, so the Content-Security-Policy stays 'self'.
const display = Baloo_2({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display" });
const body = Mukta({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Urban Air Quality Assistant",
  description:
    "Live air quality for any town in India, a low-exposure, low-emission plan for your household's day, and the direct impact of each choice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dfe9f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1420" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
