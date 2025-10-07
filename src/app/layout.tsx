import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { TRPCReactProvider } from "@/trpc/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToasterProvider } from "@/components/ui/toaster";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Nocage Hub",
  description: "Nocage Social Hub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCReactProvider cookies={cookies().toString()}>
          <AuthProvider>
            <ToasterProvider>
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </ToasterProvider>
          </AuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
