import React, { useEffect, useRef, useMemo } from "react";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "@/components/skeletons";

interface PostListProps {
  posts: Array<{
    id: string;
    content: string;
    createdAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    };
    _count?: {
      likes: number;
      comments: number;
    };
  }>;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  showLoadMore?: boolean;
}

export function PostList({ 
  posts, 
  isLoading = false, 
  hasNextPage = false, 
  isFetchingNextPage = false,
  onLoadMore,
  showLoadMore = true 
}: PostListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || !onLoadMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // Increased to improve performance
        root: null, // Use viewport as root
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, onLoadMore, isFetchingNextPage]);
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No posts found. Create your first post to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {/* Auto-trigger element for infinite scroll */}
      {showLoadMore && hasNextPage && !isFetchingNextPage && (
        <div 
          ref={loadMoreRef} 
          className="h-4"
        />
      )}
      
      {/* Loading skeleton when fetching next page */}
      {showLoadMore && isFetchingNextPage && (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm">Loading more posts...</span>
            </div>
          </div>
          {[...Array(2)].map((_, i) => (
            <PostSkeleton key={`loading-${i}`} />
          ))}
        </div>
      )}
      
      {/* End of posts indicator */}
      {showLoadMore && !hasNextPage && posts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground border-t border-border">
          <span className="text-sm">You've reached the end of the posts</span>
        </div>
      )}
    </div>
  );
}