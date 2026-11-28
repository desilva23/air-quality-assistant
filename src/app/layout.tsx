import type { Metadata, Viewport } from "next";
import { Baloo_2, Baloo_Thambi_2, Mukta, Mukta_Malar } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Both from Ek Type, a Mumbai foundry; both cover Devanagari. Next serves the
// files from this site, so the Content-Security-Policy stays 'self'.
// Two weights in all: Baloo 2 for big type only, Mukta for everything else.
const display = Baloo_2({ subsets: ["latin"], weight: ["800"], variable: "--font-display" });
const body = Mukta({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });
// Their Tamil siblings. Split by script and not preloaded, so English readers never download them.
const displayTamil = Baloo_Thambi_2({
  subsets: ["tamil"],
  weight: ["800"],
  variable: "--font-display-ta",
  preload: false,
});
const bodyTamil = Mukta_Malar({
  subsets: ["tamil"],
  weight: ["400", "700"],
  variable: "--font-body-ta",
  preload: false,
});

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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en-IN"
      className={[display, body, displayTamil, bodyTamil].map((font) => font.variable).join(" ")}
    >
      <body>{children}</body>
    </html>
  );
}
