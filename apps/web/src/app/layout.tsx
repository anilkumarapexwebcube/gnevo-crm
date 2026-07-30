import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Gnevo CRM',
  description: 'Enterprise CRM for digital marketing & SEO agencies',
  applicationName: 'Gnevo CRM',
  appleWebApp: { capable: true, title: 'Gnevo CRM', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions (Grammarly, Bitdefender, etc.)
    // inject attributes into <html>/<body> before React hydrates.
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
