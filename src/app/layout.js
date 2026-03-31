export const metadata = {
  title: "POS Bakmi Youtje",
  description: "POS System for Bakmi Youtje",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS Bakmi Youtje',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import "../styles/globals.css";
import { ToastProvider } from "../components/ui/use-toast";
import { PrinterProvider } from "../lib/printer-context";
import { LanguageProvider } from "../lib/language-context";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html lang="en" translate="no" className="notranslate">
      <body className="notranslate" suppressHydrationWarning>
        <LanguageProvider>
          <ToastProvider>
            <PrinterProvider>
              {children}
            </PrinterProvider>
          </ToastProvider>
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
