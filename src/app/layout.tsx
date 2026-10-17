import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KTCNMT • 20/10 Interactive Event & Live Mini-Game",
  description:
    "Sự kiện kỷ niệm Ngày Phụ nữ Việt Nam (19/10 – 20/10/2026) – Phòng Kỹ thuật Công nghệ Môi trường (KTCNMT) – ACV",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950/90 to-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
