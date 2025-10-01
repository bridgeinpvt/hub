import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createNewMessageNotification } from "@/lib/notifications";

export const chatRouter = createTRPCRouter({
  // Get conversations
  getConversations: protectedProcedure
    .input(z.void().optional())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const conversations = await ctx.db.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return conversations.map(conv => ({
        ...conv,
        lastMessage: conv.messages[0] || null,
        otherParticipants: conv.participants
          .filter(p => p.userId !== userId)
          .map(p => p.user),
      }));
    }),

  // Get messages
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const { conversationId, limit } = input;
      const userId = ctx.session.user.id;

      // Check if user is part of the conversation
      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: userId,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found or access denied");
      }

      const messages = await ctx.db.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return messages.reverse(); // Return in chronological order
    }),

  // Send message
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { conversationId, content } = input;
      const userId = ctx.session.user.id;
      const sender = ctx.session.user;

      // Check if user is part of the conversation and get participants
      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found or access denied");
      }

      const message = await ctx.db.message.create({
        data: {
          conversationId,
          senderId: userId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      // Update conversation's updated timestamp
      await ctx.db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Create notifications for other participants
      const otherParticipants = conversation.participants.filter(p => p.userId !== userId);
      const messagePreview = content.length > 100 ? content.substring(0, 100) + '...' : content;

      for (const participant of otherParticipants) {
        await createNewMessageNotification({
          recipientId: participant.userId,
          senderName: sender.name || sender.email || "Someone",
          conversationId,
          messagePreview,
        });
      }

      // Check if this is a response to admin@nocage.in
      const adminParticipant = conversation.participants.find(p =>
        p.user.email === "admin@nocage.in"
      );

      if (adminParticipant && adminParticipant.userId !== userId) {
        // This is a message sent TO admin, so process it as an admin response
        try {
          const { processAdminResponse } = await import("@/lib/admin-setup");
          await processAdminResponse(content, userId, conversationId);
        } catch (error) {
          console.error("Failed to process admin response:", error);
        }
      }

      return message;
    }),

  // Get single conversation
  getConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { conversationId } = input;
      const userId = ctx.session.user.id;

      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
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

      return conversation;
    }),

  // Start conversation with another user (direct messaging)
  startConversation: protectedProcedure
    .input(z.object({
      participantId: z.string(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { participantId, message } = input;
      const userId = ctx.session.user.id;

      if (participantId === userId) {
        throw new Error("Cannot start conversation with yourself");
      }

      // Check if conversation already exists
      const existingConversation = await ctx.db.conversation.findFirst({
        where: {
          type: "direct",
          AND: [
            {
              participants: {
                some: {
                  userId: userId
                }
              }
            },
            {
              participants: {
                some: {
                  userId: participantId
                }
              }
            }
          ]
        },
        include: {
          participants: true,
        },
      });

      let conversation;
      if (existingConversation && existingConversation.participants.length === 2) {
        conversation = existingConversation;
      } else {
        // Create new conversation
        conversation = await ctx.db.conversation.create({
          data: {
            type: "direct",
            participants: {
              create: [
                { userId: userId },
                { userId: participantId },
              ],
            },
          },
        });
      }

      // Send initial message if provided
      if (message?.trim()) {
        await ctx.db.message.create({
          data: {
            content: message.trim(),
            senderId: userId,
            conversationId: conversation.id,
          },
        });

        // Update conversation's updatedAt
        await ctx.db.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
      }

      return conversation.id;
    }),

  // Send automated message with asset link after purchase
  sendAssetLinkMessage: protectedProcedure
    .input(z.object({
      buyerId: z.string(),
      sellerId: z.string(),
      capsuleName: z.string(),
      assetLink: z.string(),
      purchaseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { buyerId, sellerId, capsuleName, assetLink, purchaseId } = input;

      // Check if conversation already exists between seller and buyer
      const existingConversation = await ctx.db.conversation.findFirst({
        where: {
          type: "direct",
          AND: [
            {
              participants: {
                some: {
                  userId: sellerId
                }
              }
            },
            {
              participants: {
                some: {
                  userId: buyerId
                }
              }
            }
          ]
        },
      });

      let conversation;
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // Create new conversation between seller and buyer
        conversation = await ctx.db.conversation.create({
          data: {
            type: "direct",
            participants: {
              create: [
                { userId: sellerId },
                { userId: buyerId },
              ],
            },
          },
        });
      }

      // Send the asset link message from seller to buyer
      const message = `🎉 **Your Digital Asset is Ready!**

Thank you for purchasing "${capsuleName}"!

🔗 **Your Asset Link:**
${assetLink}

📝 **Instructions:**
1. Click the link above to access your digital asset
2. Follow any platform-specific instructions (Google Drive, Canva, etc.)
3. Download and save the content to your device

💬 **Need Help?**
Reply to this message if you have any issues accessing your asset.

Purchase ID: ${purchaseId}

Enjoy your new digital asset! 🚀`;

      await ctx.db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sellerId,
          content: message,
        },
      });

      // Update conversation's updated timestamp
      await ctx.db.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return { success: true, conversationId: conversation.id };
    }),

  // Get unread message counts per conversation
  getUnreadCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // Get unread message notifications for the current user
      const unreadNotifications = await ctx.db.notification.findMany({
        where: {
          userId,
          type: "NEW_MESSAGE",
          isRead: false,
        },
        select: {
          relatedId: true, // This should be the conversationId
        },
      });

      // Count unread messages per conversation
      const unreadCounts: Record<string, number> = {};
      unreadNotifications.forEach(notification => {
        if (notification.relatedId) {
          unreadCounts[notification.relatedId] = (unreadCounts[notification.relatedId] || 0) + 1;
        }
      });

      return unreadCounts;
    }),

  // Mark conversation messages as read
  markConversationAsRead: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Mark all unread message notifications for this conversation as read
      await ctx.db.notification.updateMany({
        where: {
          userId,
          type: "NEW_MESSAGE",
          relatedId: input.conversationId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    }),
});