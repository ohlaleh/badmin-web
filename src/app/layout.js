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
  title: "Badminton Queue",
  description: "Court Queue Manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProvider>
          <AppHeader />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
