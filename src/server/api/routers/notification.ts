import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { NotificationType } from "@prisma/client";

export const notificationRouter = createTRPCRouter({
  // Get notifications
  getNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      unreadOnly: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const { limit, unreadOnly } = input;
      const userId = ctx.session.user.id;
      
      const notifications = await ctx.db.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { isRead: false }),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return notifications;
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { notificationId } = input;
      const userId = ctx.session.user.id;
      
      await ctx.db.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Ensure user can only update their own notifications
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      await ctx.db.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    }),

  // Get unread count
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const count = await ctx.db.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return { count };
    }),

  // Create notification (internal function for other parts of the app to use)
  createNotification: protectedProcedure
    .input(z.object({
      userId: z.string(),
      type: z.nativeEnum(NotificationType),
      title: z.string(),
      content: z.string().optional(),
      relatedId: z.string().optional(),
      actionUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.create({
        data: input,
      });

      return notification;
    }),

  // Create system announcement (admin only - for future implementation)
  createSystemAnnouncement: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      targetUserIds: z.array(z.string()).optional(), // If empty, send to all users
    }))
    .mutation(async ({ ctx, input }) => {
      // Note: In production, you'd want to check if user is admin here
      // For now, any authenticated user can create announcements

      const { title, content, targetUserIds } = input;

      if (targetUserIds && targetUserIds.length > 0) {
        // Send to specific users
        const notifications = await Promise.all(
          targetUserIds.map(userId =>
            ctx.db.notification.create({
              data: {
                userId,
                type: "SYSTEM_ANNOUNCEMENT",
                title,
                content,
              }
            })
          )
        );
        return { success: true, count: notifications.length };
      } else {
        // Send to all users - this could be expensive, so limit in production
        const allUsers = await ctx.db.user.findMany({
          select: { id: true },
          take: 1000, // Limit for safety
        });

        const notifications = await Promise.all(
          allUsers.map(user =>
            ctx.db.notification.create({
              data: {
                userId: user.id,
                type: "SYSTEM_ANNOUNCEMENT",
                title,
                content,
              }
            })
          )
        );

        return { success: true, count: notifications.length };
      }
    }),
});

// Helper function to create notifications (can be used by other routers)
export async function createNotificationHelper(
  db: any,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    content?: string;
    relatedId?: string;
    actionUrl?: string;
  }
) {
  try {
    return await db.notification.create({
      data: {
        ...data,
        isRead: false,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}