import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { logger } from "@/lib/logger";
import { createNotificationHelper } from "./notification";

export const postRouter = createTRPCRouter({
  // Get latest posts with pagination
  getLatest: publicProcedure
    .input(z.object({
      sortBy: z.enum(["recent", "popular"]).optional().default("recent"),
      includeReplies: z.boolean().optional().default(true),
      limit: z.number().min(1).max(100).optional().default(10),
      cursor: z.string().optional() // for cursor-based pagination
    }).optional().default({}))
    .query(async ({ ctx, input = {} }) => {
      const { sortBy = "recent", limit = 10, cursor } = input;
      
      try {
        const posts = await ctx.db.post.findMany({
          take: limit + 1, // fetch one more to check if there are more posts
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0, // skip the cursor post if it exists
          where: {
            isReply: false, // only get main posts, not replies
            published: true,
            createdBy: {
              username: {
                not: "nocagenetwork" // Exclude news posts from user posts feed
              }
            }
          },
          orderBy: sortBy === "recent" 
            ? { createdAt: "desc" } 
            : { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            tags: true,
            _count: {
              select: {
                likes: true,
                replies: true,
              },
            },
          },
        });

        let nextCursor: string | undefined = undefined;
        if (posts.length > limit) {
          const nextItem = posts.pop(); // remove the extra post
          nextCursor = nextItem?.id;
        }

        return {
          posts: posts.map(post => ({
            ...post,
            _count: {
              likes: post._count.likes,
              comments: post._count.replies,
            },
          })),
          nextCursor,
          hasMore: !!nextCursor,
        };
      } catch (error) {
        logger.error("Error fetching posts:", error);
        return {
          posts: [],
          nextCursor: undefined,
          hasMore: false,
        };
      }
    }),

  // Search posts
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).optional().default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      
      const posts = await ctx.db.post.findMany({
        where: {
          content: {
            contains: query,
            mode: "insensitive",
          },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return posts;
    }),

  // Create post
  create: protectedProcedure
    .input(z.object({
      content: z.string().min(1),
      images: z.array(z.string()).optional(),
      hashtags: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { content, images = [], hashtags = [] } = input;
      const userId = ctx.user.id;

      // Process hashtags - create tags if they don't exist and connect them
      const tagConnections = [];
      if (hashtags.length > 0) {
        for (const hashtag of hashtags) {
          // Create tag if it doesn't exist, otherwise connect to existing
          const tag = await ctx.db.tag.upsert({
            where: { name: hashtag.toLowerCase() },
            create: { name: hashtag.toLowerCase() },
            update: {}
          });
          tagConnections.push({ id: tag.id });
        }
      }

      const post = await ctx.db.post.create({
        data: {
          content,
          images,
          createdByUserId: userId,
          tags: {
            connect: tagConnections
          }
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          tags: true,
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
        },
      });


      return post;
    }),

  // Get post by ID
  getById: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;
      
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return post;
    }),

  // Get posts by username with pagination
  getPostsByUser: publicProcedure
    .input(z.object({ 
      username: z.string(),
      limit: z.number().min(1).max(100).optional().default(10),
      cursor: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { username, limit, cursor } = input;
      
      try {
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          where: { 
            createdBy: {
              username: username
            },
            published: true,
            isReply: false
          },
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            tags: true,
            _count: {
              select: {
                likes: true,
                replies: true,
              },
            },
          },
        });

        let nextCursor: string | undefined = undefined;
        if (posts.length > limit) {
          const nextItem = posts.pop();
          nextCursor = nextItem?.id;
        }

        return {
          posts: posts.map(post => ({
            ...post,
            _count: {
              likes: post._count.likes,
              comments: post._count.replies,
            },
          })),
          nextCursor,
          hasMore: !!nextCursor,
        };
      } catch (error) {
        logger.error("Error fetching posts by username:", error);
        return {
          posts: [],
          nextCursor: undefined,
          hasMore: false,
        };
      }
    }),

  // Get posts by user ID
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      
      const posts = await ctx.db.post.findMany({
        where: { createdByUserId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return posts;
    }),

  // Like post
  like: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.user.id;

      const existingLike = await ctx.db.like.findUnique({
        where: {
          postId_likedByUserId: {
            postId,
            likedByUserId: userId,
          },
        },
      });

      if (existingLike) {
        await ctx.db.like.delete({
          where: { id: existingLike.id },
        });
        return { liked: false };
      } else {
        // Get post info for notification
        const post = await ctx.db.post.findUnique({
          where: { id: postId },
          include: {
            createdBy: {
              select: { name: true, username: true }
            }
          }
        });

        await ctx.db.like.create({
          data: {
            postId,
            likedByUserId: userId,
          },
        });

        // Create notification for post author (only if it's not their own post)
        if (post && post.createdByUserId !== userId) {
          const liker = await ctx.db.user.findUnique({
            where: { id: userId },
            select: { name: true }
          });

          await createNotificationHelper(ctx.db, {
            userId: post.createdByUserId,
            type: "POST_LIKE",
            title: "Post Liked!",
            content: `${liker?.name || 'Someone'} liked your post`
          });
        }

        return { liked: true };
      }
    }),

  // Get user's liked posts
  getLikedByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      
      const likedPosts = await ctx.db.like.findMany({
        where: { likedByUserId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      return likedPosts.map(like => like.post);
    }),

  // Bookmark post
  bookmark: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.user.id;

      const existingBookmark = await ctx.db.bookmark.findUnique({
        where: {
          postId_bookmarkedByUserId: {
            postId,
            bookmarkedByUserId: userId,
          },
        },
      });

      if (existingBookmark) {
        await ctx.db.bookmark.delete({
          where: { id: existingBookmark.id },
        });
        return { bookmarked: false };
      } else {
        await ctx.db.bookmark.create({
          data: {
            postId,
            bookmarkedByUserId: userId,
          },
        });
        return { bookmarked: true };
      }
    }),

  // Get current user's bookmarked posts (private)
  getBookmarkedByUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      const bookmarkedPosts = await ctx.db.bookmark.findMany({
        where: { bookmarkedByUserId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      return bookmarkedPosts.map(bookmark => bookmark.post);
    }),

  // Get post with replies (comments)
  getWithComments: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;
      
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          tags: true,
          replies: {
            where: {
              isReply: true,
            },
            orderBy: { createdAt: "desc" },
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
        },
      });

      return post ? {
        ...post,
        comments: post.replies, // Map replies to comments for backward compatibility
      } : null;
    }),

  // Check if user liked a post
  isLiked: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.user.id;

      const like = await ctx.db.like.findUnique({
        where: {
          postId_likedByUserId: {
            postId,
            likedByUserId: userId,
          },
        },
      });

      return !!like;
    }),

  // Check if user bookmarked a post
  isBookmarked: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.user.id;

      const bookmark = await ctx.db.bookmark.findUnique({
        where: {
          postId_bookmarkedByUserId: {
            postId,
            bookmarkedByUserId: userId,
          },
        },
      });

      return !!bookmark;
    }),

  // Create comment on post (as reply)
  comment: protectedProcedure
    .input(z.object({
      postId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { postId, content } = input;
      const userId = ctx.user.id;

      // Check if post exists
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new Error("Post not found");
      }

      const comment = await ctx.db.post.create({
        data: {
          content,
          replyToId: postId,
          isReply: true,
          createdByUserId: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      // Create notification for post author (only if it's not their own post)
      if (post.createdByUserId !== userId) {
        const commenter = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { name: true }
        });

        await createNotificationHelper(ctx.db, {
          userId: post.createdByUserId,
          type: "POST_COMMENT",
          title: "New Comment!",
          content: `${commenter?.name || 'Someone'} commented on your post`,
          relatedId: postId,
          actionUrl: `/post/${postId}`
        });
      }

      return comment;
    }),

  // Share post (track share count)
  share: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.user.id;

      // Check if post exists
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new Error("Post not found");
      }

      // For now, just return success. In the future, you might want to track shares
      return { success: true, postId, sharedBy: userId };
    }),

  // Get user's comments
  getUserComments: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      
      const comments = await ctx.db.post.findMany({
        where: {
          createdByUserId: userId,
          isReply: true,
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          replyTo: { // Include the post the comment is replying to
            select: {
              id: true,
              content: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      return comments;
    }),

});