import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from '@/context/AppContext'
import AppHeader from '@/components/AppHeader'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Badminton Queue | ระบบจัดการคิวก๊วน",
  description: "ระบบบริหารจัดการสนามและคิวนักกีฬาแบดมินตันมืออาชีพ",
};

// Viewport should be exported via `viewport` for Next.js app metadata support
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  // ใช้ `lang="th"` เพื่อช่วยการตัดคำภาษาไทยที่ถูกต้อง
  return (
    <html lang="th">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-slate-900 min-h-screen`}>
        <AppProvider>
          {/* จัดโครงสร้างให้ Header อยู่ด้านบน และ content อยู่ใน container */}
          <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-1 container mx-auto p-4 md:p-6">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}