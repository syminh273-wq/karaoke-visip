import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: "CÔNG TY TNHH NHÀ HÀNG KARAOKE VSIP",
  description:
    "Nhà hàng món Việt – món Trung – hải sản tươi sống và karaoke phòng LED 3D tại VSIP I, Thuận An. Nhận tiệc sinh nhật, liên hoan công ty, tiếp khách.",
  // Square icons (Google shows a site icon in search results only if it is square, a multiple of 48px).
  icons: {
    icon: [
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Fonts are self-hosted (app/fonts.css → public/fonts). Preload the faces used above the fold.
const PRELOAD_FONTS = [
  "/fonts/be-vietnam-pro-a14cd59a25.woff2", // 400 latin
  "/fonts/be-vietnam-pro-89d2b6c228.woff2", // 400 vietnamese
  "/fonts/be-vietnam-pro-1e4fd26f83.woff2", // 800 latin
  "/fonts/be-vietnam-pro-68f81ce3e8.woff2", // 800 vietnamese
  "/fonts/material-symbols-8d55af7630.woff2", // icons
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {PRELOAD_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
