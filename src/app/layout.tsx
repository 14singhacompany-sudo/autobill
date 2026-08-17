import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { MetaPixelWithConsent } from "@/components/analytics/MetaPixel";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://autobill24.com"),
  title: "AutoBill24 - ระบบออกใบเสนอราคาและใบกำกับภาษี",
  description: "ระบบออกใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษีสำหรับช่าง ผู้รับเหมา ธุรกิจติดตั้ง และธุรกิจบริการไทย",
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "https://autobill24.com",
    siteName: "AutoBill24",
    title: "AutoBill24 - ระบบออกใบเสนอราคาและใบกำกับภาษี",
    description: "ระบบออกใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษีสำหรับช่าง ผู้รับเหมา ธุรกิจติดตั้ง และธุรกิจบริการไทย",
    images: [{ url: "/autobill24-social-v2.png", width: 1254, height: 1254, alt: "โลโก้ AutoBill24" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoBill24 - ระบบออกใบเสนอราคาและใบกำกับภาษี",
    description: "ระบบออกใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษีสำหรับธุรกิจบริการไทย",
    images: ["/autobill24-social-v2.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        {children}
        <MetaPixelWithConsent />
      </body>
    </html>
  );
}
