import { db } from "@/server/db";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  relatedId?: string;
  actionUrl?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  content,
  relatedId,
  actionUrl,
}: CreateNotificationParams) {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        relatedId,
        actionUrl,
        isRead: false,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function createCapsulePurchaseNotification({
  sellerId,
  buyerName,
  capsuleName,
  capsuleId,
}: {
  sellerId: string;
  buyerName: string;
  capsuleName: string;
  capsuleId: string;
}) {
  await createNotification({
    userId: sellerId,
    type: "CAPSULE_PURCHASE",
    title: "New Capsule Purchase! 🎉",
    content: `${buyerName} purchased your capsule "${capsuleName}"`,
    relatedId: capsuleId,
    actionUrl: `/capsules/${capsuleId}`,
  });
}

export async function createNewMessageNotification({
  recipientId,
  senderName,
  conversationId,
  messagePreview,
}: {
  recipientId: string;
  senderName: string;
  conversationId: string;
  messagePreview: string;
}) {
  await createNotification({
    userId: recipientId,
    type: "NEW_MESSAGE",
    title: `New message from ${senderName}`,
    content: messagePreview,
    relatedId: conversationId,
    actionUrl: `/messages?conversation=${conversationId}`,
  });
}