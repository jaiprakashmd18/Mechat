import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'MeCHAT — Private messaging, reimagined',
  description: 'Fast, secure, real-time private messaging with end-to-end style encryption.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#5b73f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
