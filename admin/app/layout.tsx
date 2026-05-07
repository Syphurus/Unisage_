import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeInitializer } from "@/components/shared/ThemeInitializer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UniSage Admin",
  description: "Admin dashboard for UniSage – UPES CSE educational platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <ThemeInitializer />
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: "text-sm",
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
