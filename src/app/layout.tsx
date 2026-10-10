import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Калькулятор FEFCO",
  description:
    "Развёртки FEFCO 0201, 0215, 0422, 0427, 0470 и 0471 по внутренним размерам и сборка в масштабе.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
