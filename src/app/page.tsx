"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Nocage Hub</CardTitle>
          <CardDescription>Your Social Platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center">Welcome to Nocage Hub - Your Social Platform</p>
          <Button
            className="w-full"
            onClick={() => router.push("/home")}
          >
            Go to Home
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            You'll be asked to sign in if you're not authenticated
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
