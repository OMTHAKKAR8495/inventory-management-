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
    <html lang="en" className={`${inter.className} overflow-x-hidden max-w-full`}>
      <body className="min-h-screen bg-[#070a12] text-slate-100 antialiased selection:bg-blue-600 selection:text-white relative overflow-x-hidden max-w-full">
        {/* Sticky Fixed Warehouse Background Image */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: "url('/provision-smart-bg.png')",
            backgroundAttachment: "fixed",
          }}
        >
          {/* Clean Ambient Overlay for Crystal Clear Visibility and Glassmorphism Legibility */}
          <div className="absolute inset-0 bg-[#070a12]/45 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-tech-grid opacity-20" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
