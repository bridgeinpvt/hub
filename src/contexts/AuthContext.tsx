"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { api } from "@/trpc/react";

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = api.user.getCurrentUser.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to replace useSession
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  // Return in NextAuth session format for compatibility
  return {
    data: context.user ? { user: context.user } : null,
    status: context.isLoading ? "loading" : context.user ? "authenticated" : "unauthenticated",
  };
}

// Logout function to replace signOut from next-auth
export function signOut() {
  // Clear cookies and redirect to auth-service logout
  window.location.href = 'http://localhost:3001/api/auth/signout?callbackUrl=' + encodeURIComponent('http://localhost:3000');
}

export { AuthContext };
