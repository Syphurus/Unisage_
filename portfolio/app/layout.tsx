import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const siteUrl = "https://sharavtalmale.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Sharav Talmale — Software Engineer",
  description:
    "Software engineer focused on systems, clarity, and long-term thinking. Open to technical leadership roles and complex systems work.",
  keywords: ["software engineer", "systems design", "technical leadership"],
  authors: [{ name: "Sharav Talmale" }],
  creator: "Sharav Talmale",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Sharav Talmale — Software Engineer",
    description:
      "Software engineer focused on systems, clarity, and long-term thinking.",
    siteName: "Sharav Talmale",
  },
  twitter: {
    card: "summary",
    title: "Sharav Talmale — Software Engineer",
    description:
      "Software engineer focused on systems, clarity, and long-term thinking.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Sharav Talmale",
        description:
          "Software engineer focused on systems, clarity, and long-term thinking.",
        inLanguage: "en-US",
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#person`,
        name: "Sharav Talmale",
        url: siteUrl,
        jobTitle: "Software Engineer",
        sameAs: [
          "https://github.com/sharavtalmale",
          "https://linkedin.com/in/sharavtalmale",
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg text-fg`}
      >
        {children}
      </body>
    </html>
  );
}
