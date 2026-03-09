export const metadata = {
  title: "Bakmie You-Tje POS",
  description: "Powered by Bakung Studio",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bakmie You-Tje POS',
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <PrinterProvider>
            {children}
          </PrinterProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
