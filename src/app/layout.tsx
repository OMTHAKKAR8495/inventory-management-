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
      <body className="min-h-screen bg-[#070a12] text-slate-100 antialiased selection:bg-blue-600 selection:text-white relative">
        {/* Sticky Fixed Warehouse Background Image */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: "url('/provision-smart-bg.png')",
            backgroundAttachment: "fixed",
          }}
        >
          {/* Subtle Dark Ambient Overlay for Perfect Glassmorphism Legibility */}
          <div className="absolute inset-0 bg-[#070a12]/80 backdrop-blur-[2px]" />
          
          {/* Glowing Ambient Blooms */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/3 w-[600px] h-[400px] bg-sky-600/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-tech-grid opacity-30" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
