import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mindcare-ner.astral-crane-2960.chatgpt.site'),
  title: 'MindCare NER — Gentle cognitive engagement & daily support',
  description: 'An elderly-friendly, multilingual companion for cognitive games, daily routines, reminders, family memories, and caregiver support.',
  manifest: '/manifest.webmanifest',
  applicationName: 'MindCare NER',
  appleWebApp: { capable: true, title: 'MindCare NER', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  openGraph: { title: 'MindCare NER', description: 'Gentle cognitive engagement & daily support', type: 'website', images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'MindCare NER' }] },
  twitter: { card: 'summary_large_image', title: 'MindCare NER', description: 'Gentle cognitive engagement & daily support', images: ['/og.png'] },
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
