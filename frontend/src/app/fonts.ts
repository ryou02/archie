import {
  DM_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Outfit,
} from "next/font/google";

export const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const accentFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-accent",
});
