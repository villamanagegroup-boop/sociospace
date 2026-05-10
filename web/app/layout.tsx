import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Socio Space Studios',
  description:
    'The two-sided creator marketplace. UGC creators and brands meet, book, and pay — all in one place.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sociospacestudios.com'
  )
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
