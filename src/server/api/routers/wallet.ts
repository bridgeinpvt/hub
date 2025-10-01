import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { walletService, generateReferenceId } from "@/lib/wallet";
import { UPIService } from "@/lib/upi";

export const walletRouter = createTRPCRouter({
  // Get wallet balance
  getWallet: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Create wallet if doesn't exist
      const wallet = await ctx.db.wallet.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          balance: 0,
        },
      });

      return wallet;
    }),

  // Get wallet transactions
  getTransactions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      type: z.enum(["ADD_MONEY", "CAPSULE_PURCHASE", "CAPSULE_SALE", "REFUND", "PAYOUT"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const transactions = await ctx.db.walletTransaction.findMany({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
          ...(input.type && { type: input.type }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          capsule: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let nextCursor: string | null = null;
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem!.id;
      }

      return {
        transactions,
        nextCursor,
      };
    }),

  // Create wallet top-up request
  createWalletTopup: protectedProcedure
    .input(z.object({
      amount: z.number().min(1).max(100000), // Min 1 rupee, max 1 lakh rupees
      method: z.enum(["QR_PAYMENT"]).default("QR_PAYMENT"),
      upiId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      

      if (input.upiId && !UPIService.validateUPIId(input.upiId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid UPI ID format",
        });
      }

      const referenceId = generateReferenceId();
      let qrCodeData: string | null = null;

      if (input.method === "QR_PAYMENT") {
        const qrData = UPIService.generateWalletTopupQR(input.amount, referenceId);
        qrCodeData = qrData.upiUrl;
      }

      // Create wallet top-up request
      const topupRequest = await ctx.db.walletTopup.create({
        data: {
          userId,
          amount: input.amount,
          method: input.method,
          upiId: input.upiId,
          referenceId,
          status: "AWAITING_PAYMENT",
          qrCodeData,
        },
      });

      return {
        id: topupRequest.id,
        referenceId: topupRequest.referenceId,
        amount: input.amount,
        method: input.method,
        qrCodeData,
        status: topupRequest.status,
      };
    }),

  // Get wallet top-up requests
  getWalletTopups: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      status: z.enum(["PENDING", "AWAITING_PAYMENT", "SUCCESS", "FAILED"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const topups = await ctx.db.walletTopup.findMany({
        where: {
          userId,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | null = null;
      if (topups.length > input.limit) {
        const nextItem = topups.pop();
        nextCursor = nextItem!.id;
      }

      return {
        topups,
        nextCursor,
      };
    }),


  // Purchase capsule using wallet
  purchaseCapsuleWithWallet: protectedProcedure
    .input(z.object({
      capsuleId: z.string(),
      packageId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buyerId = ctx.session.user.id;
      const buyer = ctx.session.user;

      // Get capsule details
      const capsule = await ctx.db.capsule.findUnique({
        where: { id: input.capsuleId },
        include: {
          creator: true,
          packages: input.packageId ? {
            where: { id: input.packageId },
          } : false,
        },
      });

      if (!capsule || !capsule.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Capsule not found or inactive",
        });
      }

      if (capsule.creatorId === buyerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot purchase your own capsule",
        });
      }

      // Check if already purchased
      const existingPurchase = await ctx.db.capsulePurchase.findUnique({
        where: {
          capsuleId_buyerId: {
            capsuleId: input.capsuleId,
            buyerId,
          },
        },
      });

      if (existingPurchase && existingPurchase.paymentStatus === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already purchased this capsule",
        });
      }

      // Determine purchase amount
      const purchaseAmount = input.packageId 
        ? capsule.packages?.[0]?.price || capsule.price
        : capsule.price;

      // Get buyer's wallet
      const buyerWallet = await ctx.db.wallet.findUnique({
        where: { userId: buyerId },
      });

      if (!buyerWallet || buyerWallet.balance < purchaseAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient wallet balance",
        });
      }

      // Process the transaction including messaging for reliability
      const transactionResult = await ctx.db.$transaction(async (tx) => {
        // Deduct from buyer's wallet
        await tx.wallet.update({
          where: { userId: buyerId },
          data: {
            balance: {
              decrement: purchaseAmount,
            },
          },
        });

        // Add to creator's wallet
        await tx.wallet.upsert({
          where: { userId: capsule.creatorId },
          update: {
            balance: {
              increment: purchaseAmount,
            },
          },
          create: {
            userId: capsule.creatorId,
            balance: purchaseAmount,
          },
        });

        // Create wallet transaction for purchase
        await tx.walletTransaction.create({
          data: {
            fromUserId: buyerId,
            toUserId: capsule.creatorId,
            amount: purchaseAmount,
            type: "CAPSULE_PURCHASE",
            status: "COMPLETED",
            description: `Purchase: ${capsule.name}`,
            capsuleId: input.capsuleId,
          },
        });

        // Create wallet transaction for sale
        await tx.walletTransaction.create({
          data: {
            fromUserId: buyerId,
            toUserId: capsule.creatorId,
            amount: purchaseAmount,
            type: "CAPSULE_SALE",
            status: "COMPLETED",
            description: `Sale: ${capsule.name}`,
            capsuleId: input.capsuleId,
          },
        });

        // Create purchase record
        const purchase = await tx.capsulePurchase.upsert({
          where: {
            capsuleId_buyerId: {
              capsuleId: input.capsuleId,
              buyerId,
            },
          },
          update: {
            amount: purchaseAmount,
            paymentMethod: "wallet",
            paymentStatus: "COMPLETED",
            transactionId: `wallet_${Date.now()}`,
          },
          create: {
            capsuleId: input.capsuleId,
            buyerId,
            amount: purchaseAmount,
            paymentMethod: "wallet",
            paymentStatus: "COMPLETED",
            transactionId: `wallet_${Date.now()}`,
          },
        });

        // Update capsule sales count
        await tx.capsule.update({
          where: { id: input.capsuleId },
          data: {
            totalSales: {
              increment: 1,
            },
          },
        });

        // Create notification for creator
        await tx.notification.create({
          data: {
            userId: capsule.creatorId,
            type: "CAPSULE_PURCHASE",
            title: "New Capsule Purchase! 🎉",
            content: `${buyer.name || buyer.email || "Someone"} purchased your capsule "${capsule.name}"`,
            relatedId: input.capsuleId,
            actionUrl: `/capsules/${input.capsuleId}`,
            isRead: false,
          },
        });

        return purchase;
      });

      const purchase = transactionResult;

      console.log(`[Wallet Purchase] Transaction completed successfully for purchase ${purchase.id}`);

      // IMMEDIATE ASSET DELIVERY - Fixed for serverless environments
      if (capsule.assetLink) {
        console.log(`[Wallet Purchase] Delivering asset for capsule ${capsule.id}`);

        // Execute asset delivery immediately - no setTimeout in serverless
        try {
          console.log(`[Wallet Purchase] Starting asset delivery for purchase ${purchase.id}`);

          const { decryptAssetLink } = await import("@/lib/encryption");
          const { ensureAdminUser } = await import("@/lib/admin-setup");

          const decryptedAssetLink = decryptAssetLink(capsule.assetLink!);
          const adminUser = await ensureAdminUser();

          console.log(`[Wallet Purchase] Admin user: ${adminUser.email}, Buyer: ${buyerId}`);

          // Find or create conversation
          let conversation = await ctx.db.conversation.findFirst({
            where: {
              AND: [
                { participants: { some: { userId: adminUser.id } } },
                { participants: { some: { userId: buyerId } } }
              ]
            }
          });

          if (!conversation) {
            console.log(`[Wallet Purchase] Creating new conversation`);
            conversation = await ctx.db.conversation.create({
              data: {
                type: "direct",
                participants: {
                  create: [
                    { userId: adminUser.id },
                    { userId: buyerId }
                  ]
                }
              }
            });
          }

          console.log(`[Wallet Purchase] Using conversation ${conversation.id}`);

          // Send message
          const message = await ctx.db.message.create({
            data: {
              conversationId: conversation.id,
              senderId: adminUser.id,
                content: `🎉 **Your Digital Asset is Ready!**

Thank you for purchasing "${capsule.name}"!

🔗 **Your Asset Link:**
${decryptedAssetLink}

📝 **Instructions:**
1. Click the link above to access your digital asset
2. Follow any platform-specific instructions (Google Drive, Canva, etc.)
3. Download and save the content to your device

💬 **Need Help?**
Reply to this message if you have any issues accessing your asset.

Purchase ID: ${purchase.id}

Enjoy your new digital asset! 🚀`
            }
          });

          console.log(`[Wallet Purchase] Message created: ${message.id}`);

          // Update conversation timestamp
          await ctx.db.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() }
          });

          // Create notification
          const notification = await ctx.db.notification.create({
            data: {
              userId: buyerId,
              type: "NEW_MESSAGE",
              title: "New message from NoCage Admin",
              content: `Your digital asset "${capsule.name}" is ready! Click to view your asset link.`,
              relatedId: conversation.id,
              actionUrl: `/messages?conversation=${conversation.id}`,
              isRead: false,
            },
          });

          console.log(`[Wallet Purchase] Notification created: ${notification.id}`);
          console.log(`[Wallet Purchase] ✅ Asset delivery completed successfully for purchase ${purchase.id}`);

        } catch (error) {
          console.error(`[Wallet Purchase] ❌ Asset delivery failed for purchase ${purchase.id}:`, error);
        }
      }

      return { success: true };
    }),

  // Request payout
  requestPayout: protectedProcedure
    .input(z.object({
      amount: z.number().min(10), // Minimum 10 rupees
      bankAccount: z.string().min(8).max(20),
      ifscCode: z.string().length(11),
      accountHolder: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Get user's wallet
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId },
      });

      if (!wallet || wallet.balance < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient wallet balance",
        });
      }

      // Create payout request
      const payoutRequest = await ctx.db.payoutRequest.create({
        data: {
          userId,
          amount: input.amount,
          bankAccount: input.bankAccount,
          ifscCode: input.ifscCode,
          accountHolder: input.accountHolder,
          status: "PENDING",
        },
      });

      return payoutRequest;
    }),

  // Get payout requests
  getPayoutRequests: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const requests = await ctx.db.payoutRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return requests;
    }),

  // Process payout (simplified - manual bank transfer)
  processPayout: protectedProcedure
    .input(z.object({
      payoutRequestId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // For now, we'll assume any user can process their own payout
      // In production, this should be restricted to admins
      const payoutRequest = await ctx.db.payoutRequest.findFirst({
        where: {
          id: input.payoutRequestId,
          userId, // User can only process their own payout
          status: "PENDING",
        },
        include: {
          user: true,
        },
      });

      if (!payoutRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payout request not found or already processed",
        });
      }

      // Update payout request status and deduct from wallet
      await ctx.db.$transaction(async (tx) => {
        // Update payout request status
        await tx.payoutRequest.update({
          where: { id: payoutRequest.id },
          data: {
            status: "PROCESSING",
            processedAt: new Date(),
          },
        });

        // Deduct from wallet using wallet service
        const debitSuccess = await walletService.debit(
          userId,
          payoutRequest.amount,
          `Payout to bank account ending with ${payoutRequest.bankAccount?.slice(-4) || "****"}`
        );

        if (!debitSuccess) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient wallet balance",
          });
        }

        // Create wallet transaction record
        await tx.walletTransaction.create({
          data: {
            fromUserId: userId,
            toUserId: null, // Bank transfer
            amount: payoutRequest.amount,
            type: "PAYOUT",
            status: "COMPLETED",
            description: `Payout to bank account ending with ${payoutRequest.bankAccount?.slice(-4) || "****"}`,
          },
        });
      });

      return {
        success: true,
        message: "Payout processed successfully",
        payoutRequest: payoutRequest
      };
    }),

  // Admin route to mark payout as completed
  markPayoutCompleted: protectedProcedure
    .input(z.object({
      payoutRequestId: z.string(),
      transactionId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin role check here
      // const userRole = ctx.session.user.role;
      // if (userRole !== "ADMIN") {
      //   throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
      // }

      const payoutRequest = await ctx.db.payoutRequest.findUnique({
        where: { id: input.payoutRequestId },
      });

      if (!payoutRequest || payoutRequest.status !== "PROCESSING") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payout request not found or not in processing state",
        });
      }

      await ctx.db.payoutRequest.update({
        where: { id: input.payoutRequestId },
        data: {
          status: "COMPLETED",
          reason: input.notes,
        },
      });

      return { success: true };
    }),

  // Admin routes for managing wallet top-ups
  getAllWalletTopups: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
      status: z.enum(["PENDING", "AWAITING_PAYMENT", "SUCCESS", "FAILED"]).optional(),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // TODO: Add admin role check
      // const userRole = ctx.session.user.role;
      // if (userRole !== "ADMIN") {
      //   throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
      // }

      const topups = await ctx.db.walletTopup.findMany({
        where: {
          ...(input.status && { status: input.status }),
          ...(input.userId && { userId: input.userId }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | null = null;
      if (topups.length > input.limit) {
        const nextItem = topups.pop();
        nextCursor = nextItem!.id;
      }

      return {
        topups,
        nextCursor,
      };
    }),

  adminConfirmPayment: protectedProcedure
    .input(z.object({
      topupId: z.string(),
      utrNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin role check
      // const userRole = ctx.session.user.role;
      // if (userRole !== "ADMIN") {
      //   throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
      // }

      const topup = await ctx.db.walletTopup.findUnique({
        where: { id: input.topupId },
        include: { user: true },
      });

      if (!topup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Top-up request not found",
        });
      }

      if (!["PENDING", "AWAITING_PAYMENT"].includes(topup.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Top-up request is not in a confirmable state",
        });
      }

      // Update top-up status and credit wallet
      await ctx.db.$transaction(async (tx) => {
        // Update top-up request
        await tx.walletTopup.update({
          where: { id: topup.id },
          data: {
            status: "SUCCESS",
            notes: `Admin confirmed: UTR ${input.utrNumber || 'N/A'} - ${input.notes || 'No notes'}`,
          },
        });

        // Credit wallet using wallet service
        await walletService.credit(
          topup.userId,
          topup.amount,
          `Admin confirmed wallet top-up - ${topup.referenceId}`
        );
      });

      return { success: true };
    }),

  adminRejectPayment: protectedProcedure
    .input(z.object({
      topupId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin role check
      // const userRole = ctx.session.user.role;
      // if (userRole !== "ADMIN") {
      //   throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
      // }

      const topup = await ctx.db.walletTopup.findUnique({
        where: { id: input.topupId },
      });

      if (!topup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Top-up request not found",
        });
      }

      await ctx.db.walletTopup.update({
        where: { id: input.topupId },
        data: {
          status: "FAILED",
          notes: `Admin rejected: ${input.reason}`,
        },
      });

      return { success: true };
    }),

  // Convert referral credits to wallet balance
  convertReferralCreditsToWallet: protectedProcedure
    .input(z.object({
      credits: z.number().min(100).max(10000), // Min 100 credits (₹20), max 10000 credits (₹2000)
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { credits } = input;

      // Get user's current referral credits
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          referralCredits: true,
          name: true
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.referralCredits || user.referralCredits < credits) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient referral credits",
        });
      }

      // Calculate wallet amount (100 credits = ₹20, so 1 credit = ₹0.20)
      const walletAmount = Math.floor((credits / 100) * 20);

      if (walletAmount < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum conversion amount is ₹1 (100 credits)",
        });
      }

      // Process the conversion
      await ctx.db.$transaction(async (tx) => {
        // Deduct referral credits from user
        await tx.user.update({
          where: { id: userId },
          data: {
            referralCredits: {
              decrement: credits,
            },
          },
        });

        // Add to user's wallet
        await tx.wallet.upsert({
          where: { userId },
          update: {
            balance: {
              increment: walletAmount,
            },
          },
          create: {
            userId,
            balance: walletAmount,
          },
        });

        // Create wallet transaction record
        await tx.walletTransaction.create({
          data: {
            toUserId: userId,
            amount: walletAmount,
            type: "ADD_MONEY",
            status: "COMPLETED",
            description: `Referral credits conversion: ${credits} credits → ₹${walletAmount}`,
          },
        });
      });

      return {
        success: true,
        creditsConverted: credits,
        walletAmountAdded: walletAmount,
        conversionRate: "100 credits = ₹20"
      };
    }),
});