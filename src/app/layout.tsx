import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoCage - Unified Platform",
  description: "Social networking, capsule marketplace, and business management in one platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}