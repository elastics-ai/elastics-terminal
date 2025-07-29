import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/bloomberg/providers/providers";
import { SessionProvider } from "next-auth/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Elastics - Portfolio Overview",
  description: "Professional portfolio monitoring and analytics platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <Providers>{children}</Providers>
        </SessionProvider>
      </body>
    </html>
  );
}