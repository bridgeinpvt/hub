"use client";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
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
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  logger.log("Protected Layout - Session:", session?.user?.id, "Status:", status);
  
  const { data: currentUser, isLoading: userLoading, error: userError } = api.user.getCurrentUser.useQuery(
    undefined,
    {
      enabled: status === "authenticated" && !!session?.user?.id,
      retry: false,
    }
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      logger.log("Unauthenticated user, redirecting to login");
      router.replace("/login");
      return;
    }
  }, [status, router]);

  // Check onboarding status
  useEffect(() => {
    // Don't redirect if we're already on the onboarding page
    if (pathname?.startsWith("/onboarding")) {
      return;
    }

    // If user is authenticated and we have user data, check onboarding
    if (
      status === "authenticated" && 
      currentUser && 
      !currentUser.isOnboarded
    ) {
      logger.log("[Protected Layout] User not onboarded, redirecting to onboarding");
      router.replace("/onboarding");
      return;
    }
  }, [status, currentUser, pathname, router]);

  // Don't render anything if unauthenticated (redirect will handle)
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (status === "loading" || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userError) {
    logger.error("Error fetching current user:", userError);
    // For any user data loading error, sign out and redirect to login
    signOut({ callbackUrl: '/login' });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If user is not onboarded and we're not on onboarding page, show loading
  if (
    session && 
    currentUser && 
    !currentUser.isOnboarded && 
    !pathname?.startsWith("/onboarding")
  ) {
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