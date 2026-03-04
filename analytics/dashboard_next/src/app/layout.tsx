import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Analytics Dashboard | WhatsApp AI Support",
  description: "Real-time analytics for your WhatsApp AI support agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{
            flex: 1,
            marginLeft: 'var(--sidebar-width)',
            padding: '32px',
            minHeight: '100vh',
            overflow: 'auto',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
