"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/trpc/react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { PostList } from "@/components/post/PostList";
import Link from "next/link";
import { useAnalytics } from "@/hooks/useAnalytics";

// Lazy load sidebar components
import dynamic from 'next/dynamic';
const YourStats = dynamic(() => import("@/components/sidebar/YourStats").then(mod => ({ default: mod.YourStats })), { ssr: false });
const TrendingCapsules = dynamic(() => import("@/components/sidebar/TrendingCapsules").then(mod => ({ default: mod.TrendingCapsules })), { ssr: false });
const Notifications = dynamic(() => import("@/components/sidebar/Notifications").then(mod => ({ default: mod.Notifications })), { ssr: false });

// Simple user card component without follow/message functionality
function UserCard({ user }: { user: any }) {

  return (
    <div className="p-4 border rounded-lg hover:shadow-md">
      <div className="flex items-center space-x-3">
        <Link href={`/profile/${user.username}`}>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80">
            <span className="text-purple-600 font-bold">
              {user.name?.[0] || user.username?.[0] || "U"}
            </span>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${user.username}`} className="hover:text-primary">
            <h3 className="font-semibold truncate">{user.name || user.username}</h3>
          </Link>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          {user.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {user.postsCount || 0} posts • {user.capsulesCount || 0} capsules
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const { data: session } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [searchQuery, setSearchQuery] = useState("");
  const [shouldLoadSidebar, setShouldLoadSidebar] = useState(false);
  const { trackSearch, trackPageView } = useAnalytics();


  const { 
    data: postResults, 
    isLoading: postResultsLoading,
    fetchNextPage: fetchNextPostsPage,
    hasNextPage: hasNextPostsPage,
    isFetchingNextPage: isFetchingNextPostsPage
  } = api.post.getLatest.useInfiniteQuery(
    {
      sortBy: "recent",
      includeReplies: false,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  
  const { data: userResults } = api.user.getAllUsers.useQuery({}, {
    enabled: searchQuery.length >= 3, // Only fetch when search query is at least 3 characters
  });
  
  const { 
    data: newsResults,
    isLoading: newsResultsLoading,
    fetchNextPage: fetchNextNewsPage,
    hasNextPage: hasNextNewsPage,
    isFetchingNextPage: isFetchingNextNewsPage
  } = api.post.getPostsByUser.useInfiniteQuery(
    {
      username: "nocagenetwork",
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Filter content based on search query
  const filteredPosts = useMemo(() => {
    const allPosts = postResults?.pages.flatMap(page => page.posts) || [];
    if (!searchQuery) return allPosts;
    return allPosts.filter(post => 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.createdBy.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.createdBy.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [postResults, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!userResults) return [];
    if (!searchQuery) return userResults;
    return userResults.filter(user =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userResults, searchQuery]);

  const filteredNews = useMemo(() => {
    const allNews = newsResults?.pages.flatMap(page => page.posts) || [];
    if (!searchQuery) return allNews;
    return allNews.filter(post =>
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.createdBy.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [newsResults, searchQuery]);

  // Delay sidebar loading to improve initial page performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadSidebar(true);
    }, 1000); // Load sidebar after 1 second
    return () => clearTimeout(timer);
  }, []);

  // Track page view on mount
  useEffect(() => {
    trackPageView('explore');
  }, [trackPageView]);

  // Track search queries
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const resultsCount = activeTab === 'posts' ? filteredPosts.length : 
                          activeTab === 'users' ? filteredUsers.length : 
                          filteredNews.length;
      trackSearch(searchQuery, activeTab as 'posts' | 'users' | 'news', resultsCount);
    }
  }, [searchQuery, activeTab, filteredPosts.length, filteredUsers.length, filteredNews.length, trackSearch]);

  return (
    <div className="flex w-full max-w-full">
      {/* Main Content */}
      <div className="flex-1 max-w-full lg:max-w-[calc(100%-24rem)]">
          {/* Header - Centered in main content area */}
          <div className="text-center py-4 px-3 sm:px-6 lg:mx-6 lg:px-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Explore</h1>
            <p className="text-muted-foreground text-lg">Discover amazing content and people</p>
          </div>

          {/* Search */}
          <div className="space-y-4 px-3 sm:px-6 lg:mx-6 lg:px-0 mb-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts, users, news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="sticky top-16 z-40 shadow-sm -mx-3 sm:-mx-6 lg:mx-6 lg:px-0" style={{ position: 'sticky' }}>
              <div className="px-3 sm:px-6 py-3">
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="news">News</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="space-y-4 mt-6 w-full px-3 sm:px-6 lg:mx-6 lg:px-0">
              <TabsContent value="posts" className="space-y-4 w-full">
                <div className="w-full max-w-none">
                  <PostList 
                    posts={filteredPosts} 
                    isLoading={postResultsLoading}
                    hasNextPage={!searchQuery && hasNextPostsPage}
                    isFetchingNextPage={isFetchingNextPostsPage}
                    onLoadMore={() => fetchNextPostsPage()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4 w-full">
                {searchQuery.length < 3 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Type user's name or email or username to search for users</p>
                  </div>
                ) : filteredUsers && filteredUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {filteredUsers.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No users found
                  </div>
                )}
              </TabsContent>

              <TabsContent value="news" className="space-y-4 w-full">
                <div className="w-full max-w-none">
                  <PostList 
                    posts={filteredNews} 
                    isLoading={newsResultsLoading}
                    hasNextPage={!searchQuery && hasNextNewsPage}
                    isFetchingNextPage={isFetchingNextNewsPage}
                    onLoadMore={() => fetchNextNewsPage()}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar - Fixed to right edge */}
        <div className="hidden lg:block w-80 ml-6">
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