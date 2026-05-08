import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'BitePrep — Recipe & Cost Manager',
  description: 'Recipe costing for cafés, with live price-change impact.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app">
            <Sidebar />
            <main className="main">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
