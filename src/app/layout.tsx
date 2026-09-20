import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/layout/Shell';
import { LanguageProvider } from '@/i18n';

export const metadata: Metadata = {
  title: 'WHALE OCEAN — Real-Time Hyperliquid Whale Intelligence',
  description: "Don't watch the price. Watch the ocean. Real-time Hyperliquid market intelligence platform observing large trader behavior, exposure shifts, and ocean conditions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="antialiased selection:bg-ocean-cyan/20 selection:text-ocean-cyan">
        <LanguageProvider>
          <Shell>{children}</Shell>
        </LanguageProvider>
      </body>
    </html>
  );
}
