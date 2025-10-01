import { db } from "@/server/db";
import { logger } from "@/lib/logger";

/**
 * Creates the admin@nocage.in user if it doesn't exist
 * This user will send automated follow-up messages and acknowledgment requests
 */
export async function ensureAdminUser() {
  const adminEmail = "admin@nocage.in";
  const adminUsername = "nocage_admin";

  try {
    // Check if admin user already exists
    const existingAdmin = await db.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username: adminUsername }
        ]
      }
    });

    if (existingAdmin) {
      logger.log(`[Admin Setup] Admin user already exists with ID: ${existingAdmin.id}`);
      return existingAdmin;
    }

    // Create admin user
    const adminUser = await db.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        name: "NoCage Admin",
        image: "/admin-avatar.png", // You can add an admin avatar
        bio: "Automated system assistant for NoCage. I help with asset delivery confirmations and support.",
        emailVerified: new Date(),
      }
    });

    logger.log(`[Admin Setup] Created admin user with ID: ${adminUser.id}`);
    return adminUser;

  } catch (error) {
    logger.error("[Admin Setup] Failed to create admin user:", error);
    throw error;
  }
}

/**
 * Sends an automated follow-up message from admin after asset delivery
 */
export async function sendAdminFollowUpMessage(
  buyerId: string,
  capsuleName: string,
  assetLink: string,
  purchaseId: string
) {
  try {
    // Ensure admin user exists
    const adminUser = await ensureAdminUser();

    // Import chat router
    const { chatRouter } = await import("@/server/api/routers/chat");

    // Create context for admin user
    const adminCtx = {
      db,
      session: {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      }
    };

    const caller = chatRouter.createCaller(adminCtx);

    // Send follow-up message from admin
    const followUpMessage = `👋 Hi! This is NoCage Admin.

I'm following up on your recent purchase of "${capsuleName}".

🔗 **Your Asset Link:** ${assetLink}

✅ **Please confirm that you have:**
1. Successfully accessed the digital asset
2. Downloaded/saved the content safely
3. Found the content as described

🔗 **Complete Asset Acknowledgment:**
Please fill out our quick acknowledgment form: ${process.env.NEXTAUTH_URL || 'https://nocage.com'}/acknowledge/${purchaseId}

💬 **Quick Response Options:**
- Reply "CONFIRMED" if everything is working perfectly
- Reply "ISSUE" if you're having any problems accessing the asset
- Reply "HELP" if you need any assistance

This helps us ensure you receive exactly what you paid for!

Purchase Reference: ${purchaseId}`;

    await caller.startConversation({
      participantId: buyerId,
      message: followUpMessage
    });

    logger.log(`[Admin Follow-up] Sent to buyer ${buyerId} for capsule ${capsuleName}`);
    return { success: true };

  } catch (error) {
    logger.error("[Admin Follow-up] Failed to send follow-up message:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Processes buyer response to admin follow-up
 */
export async function processAdminResponse(
  messageContent: string,
  buyerId: string,
  conversationId: string,
  purchaseId?: string
) {
  const response = messageContent.toUpperCase().trim();

  try {
    const adminUser = await ensureAdminUser();

    const { chatRouter } = await import("@/server/api/routers/chat");
    const adminCtx = {
      db,
      session: {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      }
    };

    const caller = chatRouter.createCaller(adminCtx);

    let replyMessage = "";

    switch (response) {
      case "CONFIRMED":
        const acknowledgeLink = purchaseId
          ? `${process.env.NEXTAUTH_URL || 'https://nocage.com'}/acknowledge/${purchaseId}`
          : "Please check your purchase history for the acknowledgment link";

        replyMessage = `🎉 Perfect! Thank you for confirming that you received your digital asset successfully.

For our records and to help improve our service, would you mind taking 30 seconds to complete our formal acknowledgment form?

🔗 **Complete Here:** ${acknowledgeLink}

This helps us ensure quality for all customers and is greatly appreciated!

Your purchase is now complete and confirmed. If you need any future support, feel free to reach out to the capsule creator directly.

Enjoy your new digital asset! 🚀`;

        // Log successful delivery confirmation
        logger.log(`[Admin] Asset delivery confirmed by buyer ${buyerId}`);
        break;

      case "ISSUE":
        replyMessage = `😔 I'm sorry to hear you're having issues accessing your digital asset.

I'm connecting you with our support team who will help resolve this immediately.

In the meantime, please describe the specific issue you're experiencing:
- Can't access the link?
- Link is broken?
- Content is different from description?
- File format issues?

We'll make sure this gets resolved quickly for you! 💪`;

        // Log delivery issue
        logger.log(`[Admin] Asset delivery issue reported by buyer ${buyerId}`);
        break;

      case "HELP":
        replyMessage = `🆘 I'm here to help!

Here are some common solutions:

**Link Issues:**
- Make sure you're using the exact link provided
- Try opening in a different browser
- Check if you need to be logged into the platform (Google Drive, Canva, etc.)

**Access Issues:**
- Some platforms require you to request access
- Check your email for access notifications
- Try copying the link instead of clicking

**Still having trouble?**
Please describe your specific issue and I'll get you connected with direct support immediately!

We're committed to making sure you get exactly what you paid for. 🎯`;
        break;

      default:
        // For any other response, provide general assistance
        replyMessage = `Thank you for your message!

If you're experiencing any issues with your digital asset access, please let me know by responding with:
- "CONFIRMED" - if everything is working perfectly
- "ISSUE" - if you're having problems
- "HELP" - if you need assistance

I'm here to ensure you get the full value from your purchase! 😊`;
        break;
    }

    await caller.sendMessage({
      conversationId,
      content: replyMessage
    });

    return { success: true, responseType: response };

  } catch (error) {
    logger.error("[Admin Response] Failed to process admin response:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}