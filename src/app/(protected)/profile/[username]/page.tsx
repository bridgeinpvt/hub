"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostList } from "@/components/post/PostList";
import { CapsuleCard } from "@/components/capsule/CapsuleCard";
import { CommentCard } from "@/components/post/CommentCard";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { CapsuleListSkeleton } from "@/components/skeletons/CapsuleSkeleton";

export default function ProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const username = params.username as string;

  const { data: user, isLoading: userLoading } = api.user.getByUsername.useQuery({ username });
  const { data: posts, isLoading: postsLoading } = api.post.getByUserId.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id }
  );

  // Fetch user's capsules
  const { data: userCapsules, isLoading: capsulesLoading } = api.capsule.getUserCapsules.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id }
  );

  // Fetch user's liked posts
  const { data: likedPosts, isLoading: likedPostsLoading } = api.post.getLikedByUser.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id }
  );

  // Check if this is the current user's own profile
  const isOwnProfile = session?.user?.username === username;

  // Fetch current user's bookmarked content (only for own profile)
  const { data: bookmarkedPosts, isLoading: bookmarkedPostsLoading } = api.post.getBookmarkedByUser.useQuery(
    undefined,
    { enabled: isOwnProfile }
  );

  // Fetch user's comments
  const { data: userComments, isLoading: commentsLoading } = api.post.getUserComments.useQuery(
    { userId: user?.id || "" },
    { enabled: !!user?.id }
  );

  // Show loading skeleton while fetching user data
  if (userLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-4 lg:px-0 mt-2 sm:mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfileSkeleton />
          </div>
          <div>
            <ProfileSkeleton />
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="flex space-x-4 border-b">
            <div className="h-10 w-20 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-16 bg-muted rounded animate-pulse"></div>
          </div>
          <PostList posts={[]} isLoading={true} />
        </div>
      </div>
    );
  }

  // Show not found only when user is definitely not found (not loading)
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 px-2 sm:px-4 mt-2 sm:mt-4">
        <h1 className="text-2xl font-bold text-foreground">User not found</h1>
        <p className="text-muted-foreground mt-2">The profile you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-4 lg:px-0 mt-2 sm:mt-4">
      {/* Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 min-w-0">
          <ProfileCard user={user} />
        </div>
        <div className="min-w-0">
          <ProfileStats user={user} />
        </div>
      </div>

      {/* Profile Content */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className={`grid w-full gap-1 ${isOwnProfile ? 'grid-cols-5' : 'grid-cols-4'} text-xs sm:text-sm overflow-x-auto`}>
          <TabsTrigger value="posts" className="text-xs sm:text-sm px-1 sm:px-3 min-w-0 whitespace-nowrap">
            <span className="hidden sm:inline">Posts ({posts?.length || 0})</span>
            <span className="sm:hidden">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="capsules" className="text-xs sm:text-sm px-1 sm:px-3 min-w-0 whitespace-nowrap">
            <span className="hidden sm:inline">Capsules ({userCapsules?.length || 0})</span>
            <span className="sm:hidden">Capsules</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs sm:text-sm px-1 sm:px-3 min-w-0 whitespace-nowrap">
            <span className="hidden sm:inline">Comments ({userComments?.length || 0})</span>
            <span className="sm:hidden">Comments</span>
          </TabsTrigger>
          <TabsTrigger value="likes" className="text-xs sm:text-sm px-1 sm:px-3 min-w-0 whitespace-nowrap">
            <span className="hidden sm:inline">Likes ({likedPosts?.length || 0})</span>
            <span className="sm:hidden">Likes</span>
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="bookmarks" className="text-xs sm:text-sm px-1 sm:px-3 min-w-0 whitespace-nowrap">
              <span className="hidden sm:inline">Bookmarks ({bookmarkedPosts?.length || 0})</span>
              <span className="sm:hidden">Saved</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <PostList posts={posts || []} isLoading={postsLoading} />
        </TabsContent>

        <TabsContent value="capsules" className="space-y-4">
          {capsulesLoading ? (
            <CapsuleListSkeleton count={6} />
          ) : userCapsules && userCapsules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {userCapsules.map((capsule) => (
                <CapsuleCard key={capsule.id} capsule={capsule} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Capsules Yet</h3>
              <p className="text-muted-foreground">
                {user.name || user.username} hasn't created any capsules yet.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {commentsLoading ? (
            <PostList posts={[]} isLoading={true} />
          ) : userComments && userComments.length > 0 ? (
            <div className="space-y-4">
              {userComments.map((comment: any) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Comments Yet</h3>
              <p className="text-muted-foreground">
                {user.name || user.username} hasn't made any comments yet.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="likes" className="space-y-4">
          {likedPostsLoading ? (
            <PostList posts={[]} isLoading={true} />
          ) : likedPosts && likedPosts.length > 0 ? (
            <PostList posts={likedPosts} />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Liked Posts</h3>
              <p className="text-muted-foreground">
                {user.name || user.username} hasn't liked any posts yet.
              </p>
            </div>
          )}
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="bookmarks" className="space-y-4">
            {bookmarkedPostsLoading ? (
              <PostList posts={[]} isLoading={true} />
            ) : bookmarkedPosts && bookmarkedPosts.length > 0 ? (
              <PostList posts={bookmarkedPosts} />
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Bookmarks</h3>
                <p className="text-muted-foreground">
                  You haven't bookmarked any content yet.
                </p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}