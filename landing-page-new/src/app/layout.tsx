import type { Metadata } from "next";
import { Open_Sans, Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Motionify.Studio — Human‑Centered Video Agency",
  description: "Cinematic storytelling + data-driven strategy. We craft videos that connect & convert.",
};

import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import WebVitals from "@/components/WebVitals";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${openSans.variable} ${fraunces.variable} ${ibmPlexSans.variable} antialiased`}>
        <WebVitals />
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
