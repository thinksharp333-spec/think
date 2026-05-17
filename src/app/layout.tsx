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
  title: "DigiLibrary",
  description: "Offline-capable educational platform for rural areas",
  manifest: "/manifest.json",
  icons: {
    icon: "/thinksharp-t.png",
    shortcut: "/thinksharp-t.png",
    apple: "/thinksharp-t.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DigiLibrary",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${baloo.variable} ${bungee.variable}`}>
        {children}
      </body>
    </html>
  );
}
