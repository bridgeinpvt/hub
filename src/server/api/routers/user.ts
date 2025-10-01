import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { UserRole, Availability } from "@prisma/client";
import { logger } from "@/lib/logger";

export const userRouter = createTRPCRouter({
  // Get all users with optional search
  getAllUsers: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(20)
    }).optional().default({}))
    .query(async ({ ctx, input = {} }) => {
      const { search, limit = 20 } = input;
      
      try {
        const users = await ctx.db.user.findMany({
          where: search ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                username: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          } : {},
          take: limit,
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            bio: true,
            _count: {
              select: {
                posts: true,
                capsules: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        // Transform the data to match expected structure
        return users.map((user) => ({
          ...user,
          postsCount: user._count.posts,
          capsulesCount: user._count.capsules,
        }));
      } catch (error) {
        logger.error("Error fetching users:", error);
        return [];
      }
    }),
    
  // Get user by username with extended profile data
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const { username } = input;
      
      const user = await ctx.db.user.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          bio: true,
          location: true,
          banner: true,
          userRole: true,
          createdAt: true,
          followerCount: true,
          followingCount: true,
          // Role-specific fields
          shortBio: true,
          skills: true,
          hourlyRate: true,
          availability: true,
          portfolioUrls: true,
          creatorContentTypes: true,
          sampleProducts: true,
          socialPlatforms: true,
          // Counts
          _count: {
            select: {
              posts: true,
              capsules: true,
              referredUsers: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Parse social platforms if they exist
      let socialPlatforms = {};
      try {
        socialPlatforms = user.socialPlatforms ? JSON.parse(user.socialPlatforms) : {};
      } catch (e) {
        socialPlatforms = {};
      }

      return {
        ...user,
        socialPlatforms,
        postsCount: user._count.posts,
        capsulesCount: user._count.capsules,
        referralsCount: user._count.referredUsers,
      };
    }),

  // Get user by ID with extended profile data
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;
      
      const user = await ctx.db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          bio: true,
          location: true,
          banner: true,
          userRole: true,
          createdAt: true,
          followerCount: true,
          followingCount: true,
          // Role-specific fields
          shortBio: true,
          skills: true,
          hourlyRate: true,
          availability: true,
          portfolioUrls: true,
          creatorContentTypes: true,
          sampleProducts: true,
          socialPlatforms: true,
          // Counts
          _count: {
            select: {
              posts: true,
              capsules: true,
              referredUsers: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Parse social platforms if they exist
      let socialPlatforms = {};
      try {
        socialPlatforms = user.socialPlatforms ? JSON.parse(user.socialPlatforms) : {};
      } catch (e) {
        socialPlatforms = {};
      }

      return {
        ...user,
        socialPlatforms,
        postsCount: user._count.posts,
        capsulesCount: user._count.capsules,
        referralsCount: user._count.referredUsers,
      };
    }),

  // Update profile with comprehensive validation
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(50).optional(),
      bio: z.string().max(500).optional(),
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
      image: z.string().refine((val) => {
        // Allow full URLs or relative paths starting with /api/files/
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/api/files/');
      }, {
        message: "Image must be a valid URL or a relative path to uploaded file"
      }).optional(),
      banner: z.string().refine((val) => {
        // Allow full URLs or relative paths starting with /api/files/
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/api/files/');
      }, {
        message: "Banner must be a valid URL or a relative path to uploaded file"
      }).optional(),
      location: z.string().max(100).optional(),
      isOnboarded: z.boolean().optional(),
      userRole: z.nativeEnum(UserRole).optional(),
      
      // Freelancer fields
      shortBio: z.string().max(200).optional(),
      skills: z.array(z.string().max(50)).max(10).optional(),
      hourlyRate: z.number().min(0).max(1000).optional(),
      availability: z.nativeEnum(Availability).optional(),
      portfolioUrls: z.array(z.string().refine((val) => {
        // Allow full URLs or relative paths starting with /api/files/
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/api/files/');
      }, {
        message: "Portfolio URL must be a valid URL or a relative path to uploaded file"
      })).max(5).optional(),
      
      // Creator fields
      creatorContentTypes: z.array(z.string().max(50)).max(10).optional(),
      sampleProducts: z.array(z.string().refine((val) => {
        // Allow full URLs or relative paths starting with /api/files/
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/api/files/');
      }, {
        message: "Sample product URL must be a valid URL or a relative path to uploaded file"
      })).max(5).optional(),
      socialPlatforms: z.string().optional(), // Will be validated as JSON
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Validate socialPlatforms if provided
      if (input.socialPlatforms) {
        try {
          JSON.parse(input.socialPlatforms);
        } catch (e) {
          throw new Error("Invalid social platforms format. Must be valid JSON.");
        }
      }

      // If username is being updated, check availability
      if (input.username) {
        const existingUser = await ctx.db.user.findUnique({
          where: { username: input.username },
        });
        
        if (existingUser && existingUser.id !== userId) {
          throw new Error("Username is already taken");
        }
      }

      // Prepare update data
      const updateData: Record<string, any> = {};
      
      // Basic fields
      const basicFields = ['name', 'bio', 'username', 'image', 'banner', 'location', 'isOnboarded', 'userRole'];
      basicFields.forEach(field => {
        if (input[field as keyof typeof input] !== undefined) {
          updateData[field] = input[field as keyof typeof input];
        }
      });


      // Role-specific fields
      if (input.userRole === 'FREELANCER' || ctx.session.user.userRole === 'FREELANCER') {
        const freelancerFields = ['shortBio', 'skills', 'hourlyRate', 'availability', 'portfolioUrls'];
        freelancerFields.forEach(field => {
          if (input[field as keyof typeof input] !== undefined) {
            updateData[field] = input[field as keyof typeof input];
          }
        });
      }

      if (input.userRole === 'CREATOR' || ctx.session.user.userRole === 'CREATOR') {
        const creatorFields = ['creatorContentTypes', 'sampleProducts', 'socialPlatforms'];
        creatorFields.forEach(field => {
          if (input[field as keyof typeof input] !== undefined) {
            updateData[field] = input[field as keyof typeof input];
          }
        });
      }

      try {
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: updateData,
        });

        return { success: true, user: updatedUser };
      } catch (error) {
        logger.error("Error updating user profile:", error);
        throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get current user profile with all fields
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          include: {
            _count: {
              select: {
                posts: true,
                capsules: true,
                referredUsers: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Parse social platforms if they exist
        let socialPlatforms = {};
        try {
          socialPlatforms = user.socialPlatforms ? JSON.parse(user.socialPlatforms) : {};
        } catch (e) {
          socialPlatforms = {};
        }

        return {
          ...user,
          socialPlatforms,
          counts: user._count,
        };
      } catch (error) {
        logger.error("Error fetching user:", error);
        throw new Error(`Failed to fetch profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Check username availability with strict validation
  checkUsername: publicProcedure
    .input(z.object({ 
      username: z.string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    }))
    .mutation(async ({ ctx, input }) => {
      const { username } = input;
      
      const existingUser = await ctx.db.user.findUnique({
        where: { username },
      });

      return { available: !existingUser };
    }),

  // Get referrer information for current user
  getReferrerInfo: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: {
            referredById: true,
            referredBy: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        });

        if (!user?.referredById || !user?.referredBy) {
          return null;
        }

        return {
          id: user.referredBy.id,
          name: user.referredBy.name,
          username: user.referredBy.username,
          image: user.referredBy.image,
        };
      } catch (error) {
        logger.error("Error fetching referrer info:", error);
        return null;
      }
    }),

  // Follow/unfollow user
  toggleFollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      const currentUserId = ctx.session.user.id;

      if (userId === currentUserId) {
        throw new Error("Cannot follow yourself");
      }

      // Check if follow relationship already exists
      const existingFollow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });

      if (existingFollow) {
        // Unfollow
        await ctx.db.follow.delete({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: userId,
            },
          },
        });

        // Update counts
        await Promise.all([
          ctx.db.user.update({
            where: { id: userId },
            data: { followerCount: { decrement: 1 } },
          }),
          ctx.db.user.update({
            where: { id: currentUserId },
            data: { followingCount: { decrement: 1 } },
          }),
        ]);

        return { success: true, following: false };
      } else {
        // Follow
        await ctx.db.follow.create({
          data: {
            followerId: currentUserId,
            followingId: userId,
          },
        });

        // Update counts
        await Promise.all([
          ctx.db.user.update({
            where: { id: userId },
            data: { followerCount: { increment: 1 } },
          }),
          ctx.db.user.update({
            where: { id: currentUserId },
            data: { followingCount: { increment: 1 } },
          }),
        ]);

        // Get follower info for notification
        const follower = await ctx.db.user.findUnique({
          where: { id: currentUserId },
          select: { name: true, username: true }
        });

        // Check if the person being followed already follows the current user (mutual follow)
        const isFollowBack = await ctx.db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId, // The person being followed
              followingId: currentUserId, // Current user
            },
          },
        });

        // Create appropriate notification
        if (isFollowBack) {
          // This is a follow-back
          await ctx.db.notification.create({
            data: {
              userId: userId,
              type: "FOLLOW_BACK",
              title: "Followed you back!",
              content: `${follower?.name || 'Someone'} followed you back`,
              relatedId: currentUserId,
              actionUrl: `/profile/${follower?.username || 'user'}`
            }
          });
        } else {
          // This is a new follower
          await ctx.db.notification.create({
            data: {
              userId: userId,
              type: "NEW_FOLLOWER",
              title: "New Follower!",
              content: `${follower?.name || 'Someone'} started following you`,
              relatedId: currentUserId,
              actionUrl: `/profile/${follower?.username || 'user'}`
            }
          });
        }

        return { success: true, following: true };
      }
    }),

  // Check if current user is following another user
  isFollowing: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      const currentUserId = ctx.session.user.id;

      if (userId === currentUserId) {
        return { isFollowing: false };
      }

      const follow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });

      return { isFollowing: !!follow };
    }),

  // Check follow status for multiple users at once
  getMultipleFollowStatus: protectedProcedure
    .input(z.object({ userIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const { userIds } = input;
      const currentUserId = ctx.session.user.id;

      if (userIds.length === 0) {
        return [];
      }

      const follows = await ctx.db.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: userIds },
        },
        select: {
          followingId: true,
        },
      });

      const followingIds = new Set(follows.map(f => f.followingId));

      return userIds.map(userId => ({
        userId,
        isFollowing: followingIds.has(userId),
      }));
    }),

  // Get current user's followers (private)
  getFollowers: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const { limit } = input;
      const userId = ctx.session.user.id;

      const followers = await ctx.db.follow.findMany({
        where: { followingId: userId },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              userRole: true,
            },
          },
        },
      });

      return followers.map((f: any) => f.follower);
    }),

  // Get current user's following (private)
  getFollowing: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const { limit } = input;
      const userId = ctx.session.user.id;

      const following = await ctx.db.follow.findMany({
        where: { followerId: userId },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              userRole: true,
            },
          },
        },
      });

      return following.map((f: any) => f.following);
    }),

  // Delete user account
  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Delete user account and all related data (cascading deletes handled by schema)
      await ctx.db.user.delete({
        where: { id: userId },
      });

      return { success: true };
    }),

  // Get user notifications
  getNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      unreadOnly: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const notifications = await ctx.db.notification.findMany({
        where: {
          userId,
          ...(input.unreadOnly && { isRead: false })
        },
        orderBy: { createdAt: "desc" },
        take: input.limit
      });

      return notifications;
    }),

  // Mark notification as read
  markNotificationRead: protectedProcedure
    .input(z.object({
      notificationId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const notification = await ctx.db.notification.updateMany({
        where: {
          id: input.notificationId,
          userId
        },
        data: {
          isRead: true
        }
      });

      return { success: true };
    }),

  // Mark all notifications as read
  markAllNotificationsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      await ctx.db.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      return { success: true };
    }),

  // Get unread notification count
  getUnreadNotificationCount: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const count = await ctx.db.notification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return { count };
    }),

  // Submit asset acknowledgment
  submitAssetAcknowledgment: protectedProcedure
    .input(z.object({
      purchaseId: z.string(),
      status: z.enum(["confirmed", "issue", "help"]),
      rating: z.number().min(1).max(5).optional(),
      feedback: z.string().optional(),
      issueDescription: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { purchaseId, status, rating, feedback, issueDescription } = input;

      // Verify the purchase belongs to the user
      const purchase = await ctx.db.capsulePurchase.findFirst({
        where: {
          id: purchaseId,
          buyerId: userId
        },
        include: {
          capsule: {
            select: {
              id: true,
              name: true,
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!purchase) {
        throw new Error("Purchase not found or access denied");
      }

      // Create acknowledgment record (you may need to add this model to Prisma schema)
      try {
        // For now, we'll log the acknowledgment and create a notification
        logger.log(`[Asset Acknowledgment] User ${userId} acknowledged purchase ${purchaseId} with status: ${status}`);

        // Create notification for the seller based on status
        let notificationContent = "";
        let notificationType: "CAPSULE_REVIEW" | "SYSTEM_ANNOUNCEMENT" = "CAPSULE_REVIEW";

        switch (status) {
          case "confirmed":
            notificationContent = `✅ ${ctx.session.user.name || "A customer"} confirmed successful receipt of "${purchase.capsule.name}"`;
            if (rating) {
              notificationContent += ` and rated it ${rating} stars`;
            }
            notificationType = "CAPSULE_REVIEW";
            break;
          case "issue":
            notificationContent = `⚠️ ${ctx.session.user.name || "A customer"} reported an issue with "${purchase.capsule.name}"`;
            notificationType = "SYSTEM_ANNOUNCEMENT";
            break;
          case "help":
            notificationContent = `❓ ${ctx.session.user.name || "A customer"} needs help with "${purchase.capsule.name}"`;
            notificationType = "SYSTEM_ANNOUNCEMENT";
            break;
        }

        // Notify the capsule creator
        await ctx.db.notification.create({
          data: {
            userId: purchase.capsule.creator.id,
            type: notificationType,
            title: `Asset ${status === "confirmed" ? "Confirmed" : status === "issue" ? "Issue Reported" : "Help Requested"}`,
            content: notificationContent,
            relatedId: purchaseId
          }
        });

        // If there's an issue or help request, also notify admin
        if (status !== "confirmed") {
          // Try to get admin user
          const adminUser = await ctx.db.user.findFirst({
            where: {
              email: "admin@nocage.in"
            }
          });

          if (adminUser) {
            await ctx.db.notification.create({
              data: {
                userId: adminUser.id,
                type: "SYSTEM_ANNOUNCEMENT",
                title: `Customer ${status === "issue" ? "Issue" : "Help Request"}`,
                content: `${ctx.session.user.name || "A customer"} needs ${status === "issue" ? "issue resolution" : "help"} with "${purchase.capsule.name}". Purchase ID: ${purchaseId}`,
                relatedId: purchaseId
              }
            });
          }
        }

        // Send email notification to creator if it's an issue
        if (status === "issue" && purchase.capsule.creator.email) {
          try {
            // Simple email notification (in production, you'd use your email service)
            logger.log(`[Email] Would send issue notification to creator ${purchase.capsule.creator.email}`);
          } catch (error) {
            logger.error("Failed to send issue notification email:", error);
          }
        }

        return {
          success: true,
          message: status === "confirmed"
            ? "Thank you for confirming receipt of your digital asset!"
            : status === "issue"
            ? "We've been notified of the issue and will help resolve it soon."
            : "We've received your help request and will assist you shortly.",
          status,
          rating
        };

      } catch (error) {
        logger.error("[Asset Acknowledgment] Failed to process acknowledgment:", error);
        throw new Error("Failed to submit acknowledgment");
      }
    }),
});
