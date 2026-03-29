import type { Metadata } from "next";
import "./globals.css";
import {
  accentFont,
  bodyFont,
  displayFont,
  monoFont,
} from "@/app/fonts";

export const metadata: Metadata = {
  title: "Archie — AI Game Builder",
  description: "Build Roblox games by talking to Archie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} ${accentFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
