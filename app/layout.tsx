import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});export const metadata: Metadata = {
  title: "Piyush — AI Developer Portfolio",
  description:
    "Piyush's interactive AI-powered portfolio. Experience a cinematic 3D workspace with an intelligent AI assistant.",
  keywords: [
    "AI Developer",
    "Portfolio",
    "Machine Learning",
    "Full-Stack Developer",
    "Piyush",
  ],
  openGraph: {
    title: "Piyush — AI Developer Portfolio",
    description: "Interactive AI-powered portfolio experience. Enter Piyush's digital workspace.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050508] text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
