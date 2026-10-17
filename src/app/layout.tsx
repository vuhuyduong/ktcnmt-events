import type { Metadata, Viewport } from "next";
import { EVENT_INFO } from "@/data/roster";
import "./globals.css";

const description = `Lời mời và đăng ký sự kiện 20/10 của KTCNMT: tiệc ${EVENT_INFO.dinner.time} ngày ${EVENT_INFO.dinner.date} tại ${EVENT_INFO.dinner.venue}; đăng ký đồ uống sáng ${EVENT_INFO.drinks.date}.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://ltia-ktcnmt.up.railway.app"),
  title: EVENT_INFO.title,
  description,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    title: EVENT_INFO.title,
    description,
    siteName: "KTCNMT",
    images: [
      {
        url: "/acv-logo.png",
        alt: "Tổng công ty Cảng hàng không Việt Nam (ACV)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#111827] text-[#f8fafc]">
        {children}
      </body>
    </html>
  );
}
