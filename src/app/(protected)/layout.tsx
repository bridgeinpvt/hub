"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FloatingThemeToggle } from "@/components/ui/floating-theme-toggle";
import { api } from "@/trpc/react";
import { logger } from "@/lib/logger";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Middleware already handles authentication, just get user data
  const { data: currentUser, isLoading: userLoading, error: userError } = api.user.getCurrentUser.useQuery(
    undefined,
    {
      retry: false,
    }
  );

  // Check onboarding status
  useEffect(() => {
    // Don't redirect if we're already on the onboarding page
    if (pathname?.startsWith("/onboarding")) {
      return;
    }

    // If we have user data, check onboarding
    if (currentUser && !currentUser.isOnboarded) {
      logger.log("[Protected Layout] User not onboarded, redirecting to onboarding");
      router.replace("/onboarding");
      return;
    }
  }, [currentUser, pathname, router]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userError) {
    logger.error("Error fetching current user:", userError);
    // DEBUG MODE: Show error instead of redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error (Debug Mode)</h2>
          <pre className="text-left bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(userError, null, 2)}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Check browser console and cookies in DevTools
          </p>
        </div>
      </div>
    );
  }

  // If user is not onboarded and we're not on onboarding page, show loading
  if (currentUser && !currentUser.isOnboarded && !pathname?.startsWith("/onboarding")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }


  // Show floating toggle only on home and settings pages
  const showFloatingToggle = pathname === '/home' || pathname === '/settings';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar
        className="hidden md:flex"
        onCollapseChange={setIsSidebarCollapsed}
      />
      <main className={`pt-20 md:pt-24 pb-20 md:pb-8 ${
        isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
      }`}>
        <div className="px-4 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <BottomNav className="md:hidden" />
      {showFloatingToggle && <FloatingThemeToggle />}
    </div>
  );
}