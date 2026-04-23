import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";

import { AppFooter } from "@/components/AppFooter";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Examinationsdesigner",
  description: "Designstöd för examinationer enligt produkt-process-agens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${atkinson.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
