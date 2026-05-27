import type { Metadata, Viewport } from "next";
import { Baloo_2, Bungee } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
});

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bungee",
});

export const metadata: Metadata = {
  title: {
    default: "DigiLibrary — Offline-Capable Educational Platform",
    template: "%s | DigiLibrary",
  },
  description: "DigiLibrary is an offline-capable educational platform providing digital books, quizzes, and high-quality learning resources to students in rural schools, powered by ThinkSharp Foundation.",
  keywords: [
    "DigiLibrary",
    "Digital Library",
    "ThinkSharp Foundation",
    "Offline Educational Platform",
    "Rural Schools Library",
    "PWA School Library",
    "Educational Books and Quizzes",
  ],
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://digilibrary.org"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DigiLibrary",
  },
  openGraph: {
    title: "DigiLibrary — Offline-Capable Educational Platform",
    description: "Providing high-quality books, quizzes, and learning materials to students in rural areas with full offline functionality.",
    url: "https://digilibrary.org",
    siteName: "DigiLibrary",
    images: [
      {
        url: "/digi-library-logo.png",
        width: 1200,
        height: 630,
        alt: "DigiLibrary ThinkSharp Foundation Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiLibrary — Offline-Capable Educational Platform",
    description: "Providing high-quality books, quizzes, and learning materials to students in rural areas with full offline functionality.",
    images: ["/digi-library-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DigiLibrary",
    "url": "https://digilibrary.org",
    "description": "Offline-capable educational platform providing digital books, quizzes, and learning resources to students in rural schools.",
    "publisher": {
      "@type": "Organization",
      "name": "ThinkSharp Foundation",
      "url": "https://www.thinksharpfoundation.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://digilibrary.org/digi-library-logo.png"
      }
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${baloo.variable} ${bungee.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}

