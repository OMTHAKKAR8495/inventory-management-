import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProvisionSmart | Smart Inventory Management System",
  description: "High-performance smart inventory management system for wholesale provision and grocery stores with dual-role authentication, real-time analytics, bulk Excel/CSV ingestion, multi-filtering, and PDF reports.",
  keywords: ["wholesale inventory", "provision store", "stock management", "bulk upload", "inventory audit", "stock level tracking"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
