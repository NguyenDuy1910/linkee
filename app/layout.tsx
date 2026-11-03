import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Linkee — your link in bio, AI replies, and post to all", template: "%s · Linkee" },
  description:
    "Create a beautiful link-in-bio page in minutes, answer Instagram comments with on-brand AI replies, and publish once to Instagram and Facebook.",
  openGraph: { siteName: "Linkee", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#f7f7f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
