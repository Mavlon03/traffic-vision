import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traffic Vision Frontend",
  description: "Traffic Vision uchun real-time detection dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
