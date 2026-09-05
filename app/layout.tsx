import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mindcare-ner.usmankur611.chatgpt.site'),
  title: 'MindMitra — Gentle cognitive engagement & daily support',
  description: 'An elderly-friendly, multilingual companion for cognitive games, daily routines, reminders, family memories, and caregiver support.',
  manifest: '/manifest.webmanifest',
  applicationName: 'MindMitra',
  appleWebApp: { capable: true, title: 'MindMitra', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  openGraph: { title: 'MindMitra', description: 'Gentle cognitive engagement & daily support', type: 'website' },
  twitter: { card: 'summary', title: 'MindMitra', description: 'Gentle cognitive engagement & daily support' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
