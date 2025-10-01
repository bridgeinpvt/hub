"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { CreatePostForm } from "@/components/post/CreatePostForm";
import { PostList } from "@/components/post/PostList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowRight } from "lucide-react";

// Lazy load sidebar components
import dynamic from 'next/dynamic';
const YourStats = dynamic(() => import("@/components/sidebar/YourStats").then(mod => ({ default: mod.YourStats })), { ssr: false });
const TrendingCapsules = dynamic(() => import("@/components/sidebar/TrendingCapsules").then(mod => ({ default: mod.TrendingCapsules })), { ssr: false });
const Notifications = dynamic(() => import("@/components/sidebar/Notifications").then(mod => ({ default: mod.Notifications })), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [shouldLoadSidebar, setShouldLoadSidebar] = useState(false);

  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId);
    // You can add navigation to individual post page here
    // router.push(`/posts/${postId}`);
  };

  const { data: currentUser } = api.user.getCurrentUser.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const {
    data: newsData,
    error: newsError,
    isLoading: newsLoading,
  } = api.post.getPostsByUser.useQuery({
      username: "nocagenetwork",
      limit: 3,
    }, {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    });

  const {
    data: postsData,
    error: postsError,
    isLoading: postsLoading,
  } = api.post.getLatest.useQuery({
      sortBy: "recent",
      includeReplies: false,
      limit: 3,
    }, {
      staleTime: 1 * 60 * 1000, // 1 minute
      gcTime: 3 * 60 * 1000, // 3 minutes
    });

  // Get the data (no longer paginated)
  const newsPosts = newsData?.posts || [];
  const userPosts = postsData?.posts || [];

  // Delay sidebar loading to improve initial page performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadSidebar(true);
    }, 1000); // Load sidebar after 1 second
    return () => clearTimeout(timer);
  }, []);



  return (
    <div className="flex w-full max-w-full min-h-0">
      {/* Main Content */}
      <div className="flex-1 space-y-8 px-4 max-w-full min-w-0 lg:max-w-[calc(100%-24rem)] lg:pr-8">
          {/* Welcome Message with Theme Toggle */}
          <div className="text-center py-4 relative">
            {/* Theme Toggle - positioned in top right */}
            <div className="absolute top-0 right-0">
              <ThemeToggle />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Welcome back, {currentUser?.name || "User"}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Ready to share your ideas?
            </p>
          </div>
          <CreatePostForm onPostCreated={() => {}} />
          
          {/* Recent Activity Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Recent Activity</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/explore')}
                className="see-more-button"
              >
                See more
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {postsError ? (
                <div className="text-center py-8 text-destructive">
                  <div className="text-sm">Failed to load posts</div>
                  <div className="text-xs mt-1">Database connection error</div>
                </div>
              ) : (
                <PostList 
                  posts={userPosts || []} 
                  isLoading={postsLoading}
                  showLoadMore={false}
                />
              )}
            </CardContent>
          </Card>

          {/* Latest News & Updates Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Latest News & Updates</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/explore')}
                className="see-more-button"
              >
                See more
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {newsError ? (
                <div className="text-center py-8 text-destructive">
                  <div className="text-sm">Failed to load news</div>
                  <div className="text-xs mt-1">Database connection error</div>
                </div>
              ) : (
                <PostList 
                  posts={newsPosts || []} 
                  isLoading={newsLoading}
                  showLoadMore={false}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Fixed to right edge */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="fixed right-6 top-20 w-80 h-[calc(100vh-6rem)] overflow-y-auto space-y-6">
          {shouldLoadSidebar ? (
            <>
              <YourStats />
              <TrendingCapsules />
              <Notifications />
            </>
          ) : (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
    </div>
  );
}
