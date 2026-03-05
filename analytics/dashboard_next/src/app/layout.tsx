import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./components/AppShell";

export const metadata: Metadata = {
  title: "Early Store | Analytics Dashboard",
  description: "Real-time analytics dashboard for Early Store AI customer support",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
