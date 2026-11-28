import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../../app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Courier Portal",
  description: "Delivery App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`flex h-dvh bg-slate-50 overflow-hidden ${inter.className}`}>
      
      {/* Main Content Area */}
      <main className="flex-1 p-8 h-dvh overscroll-contain overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}