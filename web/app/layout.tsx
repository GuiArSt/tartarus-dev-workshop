import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Crimson_Pro,
  Cormorant_Garamond,
  Cinzel,
  IBM_Plex_Sans,
  Source_Serif_4,
  Playfair_Display,
  Spectral,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Kronus chat fonts - lazy loaded (only downloaded when chat font selector activates them)
const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Tartarus",
  description: "Tartarus — AI-powered journal and knowledge base with Kronus",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${crimsonPro.variable} ${cormorantGaramond.variable} ${cinzel.variable} ${ibmPlexSans.variable} ${sourceSerif4.variable} ${playfairDisplay.variable} ${spectral.variable} bg-[var(--tartarus-void)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
