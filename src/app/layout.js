import { IBM_Plex_Sans_Thai, Kanit } from "next/font/google"; // นำเข้าฟอนต์ไทย
import "./globals.css";
import { AppProvider } from '@/context/AppContext';
import AppHeader from '@/components/AppHeader';

// ฟอนต์หลักสำหรับเนื้อหา (อ่านง่าย สะอาดตา)
const plexThai = IBM_Plex_Sans_Thai({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  display: 'swap',
});

// ฟอนต์สำหรับหัวข้อหรือตัวเลข (ดูสปอร์ต ทันสมัย)
const kanit = Kanit({
  weight: ['400', '700', '800'],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
  display: 'swap',
});

export const metadata = {
  title: "Badminton Queue | ระบบจัดการคิวก๊วน",
  description: "ระบบบริหารจัดการสนามและคิวนักกีฬาแบดมินตันมืออาชีพ",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${plexThai.variable} ${kanit.variable}`}>
      <body className="antialiased bg-gray-50 text-slate-900 min-h-screen font-sans">
        <AppProvider>
          <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-1 container mx-auto p-4 md:p-6">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}