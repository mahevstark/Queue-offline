import localFont from "next/font/local";
import "../globals.css";
import Providers from '@/components/providers/Providers'
import ClientLayout from './ClientLayout';
import { NextIntlClientProvider } from 'next-intl';
import { initCronJobs } from '@/lib/initCron';
import {getMessages, unstable_setRequestLocale} from 'next-intl/server';

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export async function generateMetadata({ params: { locale } }) {
  const messages = await getMessages(locale);
  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
  };
}
// Only run in production and on the server
if (process.env.NODE_ENV !== 'development' && typeof window === 'undefined') {
  initCronJobs();
}

export default async function RootLayout({ children, params: { locale } }) {
  // Enable static rendering
  unstable_setRequestLocale(locale);
  
  const messages = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Generate static params for locales
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'az' }];
}
