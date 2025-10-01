import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { logger } from "@/lib/logger";
import { decryptAssetLink } from "@/lib/encryption";

// Define enum for capsule types (should match Prisma schema)
const CapsuleType = z.enum([
  "INFO_PRODUCTS",
  "DIGITAL_TOOLS",
  "CREATIVE_ASSETS",
  "SAAS_APIS",
  "SUBSCRIPTIONS"
]);

export const capsuleRouter = createTRPCRouter({
  // Get all capsules with filtering
  getAllCapsules: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      category: CapsuleType.optional(),
      sortBy: z.enum(["newest", "popular", "rating", "price_low", "price_high"]).default("newest"),
      priceRange: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { search, category, sortBy, limit, cursor } = input;
      
      const whereClause: any = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(category && { type: category }),
      };
      
      const orderByClause: any = {
        newest: { createdAt: "desc" },
        popular: { createdAt: "desc" }, // Could be based on order count
        rating: { rating: "desc" },
        price_low: { price: "asc" },
        price_high: { price: "desc" },
      }[sortBy];

      const capsules = await ctx.db.capsule.findMany({
        where: whereClause,
        orderBy: orderByClause,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          purchases: ctx.session?.user?.id ? {
            where: {
              buyerId: ctx.session.user.id,
              paymentStatus: "COMPLETED"
            },
            select: {
              id: true
            }
          } : false,
          _count: {
            select: {
              purchases: true,
              reviews: true,
            },
          },
        },
      });

      let nextCursor: string | null = null;
      if (capsules.length > limit) {
        const nextItem = capsules.pop();
        nextCursor = nextItem!.id;
      }

      return {
        capsules: capsules.map(capsule => ({
          ...capsule,
          ordersCount: capsule._count.purchases,
          reviewsCount: capsule._count.reviews,
          isPurchased: Array.isArray(capsule.purchases) ? capsule.purchases.length > 0 : false,
          purchases: undefined, // Remove purchases from the response for security
        })),
        nextCursor
      };
    }),

  // Get capsule by ID
  getCapsuleById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;
      
      logger.log(`[getCapsuleById] Looking for capsule with ID: ${id}`);
      
      // First, let's check if the capsule exists at all (regardless of isActive)
      const capsuleExists = await ctx.db.capsule.findUnique({
        where: { id },
        select: { id: true, name: true, isActive: true }
      });
      
      logger.log(`[getCapsuleById] Initial check - capsule exists:`, capsuleExists);
      
      const capsule = await ctx.db.capsule.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
            },
          },
          packages: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          },
          reviews: {
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              reviewer: {
                select: {
                  name: true,
                  image: true,
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              purchases: true,
              reviews: true,
            },
          },
        },
      });

      logger.log(`[getCapsuleById] Found capsule:`, capsule ? capsule.name : 'null');

      if (!capsule) {
        logger.log(`[getCapsuleById] No capsule found with ID: ${id}`);
        return null;
      }

      const result = {
        ...capsule,
        ordersCount: capsule._count.purchases,
        reviewsCount: capsule._count.reviews,
      };
      
      logger.log(`[getCapsuleById] Returning capsule: ${result.name}`);
      return result;
    }),

  // Get creator dashboard stats
  getCreatorDashboardStats: protectedProcedure
    .input(z.void().optional())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Get all capsules for this creator
      const capsules = await ctx.db.capsule.findMany({
        where: { creatorId: userId },
        include: {
          purchases: {
            where: { paymentStatus: "COMPLETED" },
          },
          reviews: true,
        },
      });
      
      const totalRevenue = capsules.reduce((sum, capsule) => 
        sum + capsule.purchases.reduce((purchaseSum, purchase) => purchaseSum + purchase.amount, 0), 0
      );
      
      const totalSales = capsules.reduce((sum, capsule) => sum + capsule.purchases.length, 0);
      
      const activeCapsules = capsules.filter(c => c.isActive).length;
      
      const allReviews = capsules.flatMap(c => c.reviews);
      const avgRating = allReviews.length > 0 
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
        : 0;
        
      // Get weekly orders
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weeklyOrders = await ctx.db.capsulePurchase.count({
        where: {
          capsule: { creatorId: userId },
          createdAt: { gte: oneWeekAgo },
          paymentStatus: "COMPLETED",
        },
      });

      return {
        totalRevenue,
        totalSales,
        activeCapsules,
        avgRating: Math.round(avgRating * 10) / 10,
        monthlyGrowth: 0, // Would require historical data
        weeklyOrders,
        reviews: allReviews.length,
        pendingAmount: 0 // Would require payment processing data
      };
    }),

  // Get recent orders for creator
  getRecentOrdersForCreator: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit } = input;
      
      const orders = await ctx.db.capsulePurchase.findMany({
        where: {
          capsule: { creatorId: userId },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          capsule: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return orders;
    }),

  // Get creator's capsules detailed
  getMyCapsulesDetailed: protectedProcedure
    .input(z.void().optional())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const capsules = await ctx.db.capsule.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              purchases: true,
              reviews: true,
            },
          },
        },
      });

      return capsules.map(capsule => ({
        ...capsule,
        ordersCount: capsule._count.purchases,
        reviewsCount: capsule._count.reviews,
      }));
    }),

  // Get reviews for creator
  getReviewsForCreator: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit } = input;
      
      const reviews = await ctx.db.capsuleReview.findMany({
        where: {
          capsule: { creatorId: userId },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          capsule: {
            select: {
              id: true,
              name: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return reviews;
    }),

  // Get capsule reviews
  getCapsuleReviews: publicProcedure
    .input(z.object({
      capsuleId: z.string(),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { capsuleId, limit } = input;
      
      const reviews = await ctx.db.capsuleReview.findMany({
        where: { capsuleId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return reviews;
    }),

  // Get user's capsules (for profile page)
  getUserCapsules: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      includeInactive: z.boolean().default(false)
    }).optional())
    .query(async ({ ctx, input }) => {
      // If no userId provided and user is authenticated, use current user
      const userId = input?.userId || ctx.session?.user?.id;
      const includeInactive = input?.includeInactive ?? false;

      if (!userId) {
        return [];
      }

      const capsules = await ctx.db.capsule.findMany({
        where: {
          creatorId: userId,
          ...(includeInactive ? {} : { isActive: true })
        },
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          _count: {
            select: {
              purchases: true,
              reviews: true,
            },
          },
        },
      });

      return capsules.map(capsule => ({
        ...capsule,
        ordersCount: capsule._count.purchases,
        reviewsCount: capsule._count.reviews,
      }));
    }),

  // Get user stats for current user
  getUserStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const totalCapsules = await ctx.db.capsule.count({
        where: { creatorId: userId },
      });
      
      const activeCapsules = await ctx.db.capsule.count({
        where: { 
          creatorId: userId,
          isActive: true 
        },
      });
      
      const totalSales = await ctx.db.capsulePurchase.count({
        where: {
          capsule: { creatorId: userId },
          paymentStatus: "COMPLETED",
        },
      });
      
      const totalRevenue = await ctx.db.capsulePurchase.aggregate({
        where: {
          capsule: { creatorId: userId },
          paymentStatus: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      });

      // Get referral earnings
      const referralEarnings = await ctx.db.referral.aggregate({
        where: {
          referrerId: userId,
          rewardClaimed: true,
        },
        _sum: {
          rewardAmount: true,
        },
      });

      const capsuleRevenue = totalRevenue._sum.amount || 0;
      const referralBonus = referralEarnings._sum.rewardAmount || 0;
      const totalEarnings = capsuleRevenue + referralBonus;

      return {
        totalCapsules,
        activeCapsules,
        totalSales,
        totalRevenue: totalEarnings,
        capsuleRevenue,
        referralBonus,
      };
    }),

  // Create new capsule
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(1000),
      price: z.number().min(0),
      type: CapsuleType,
      logoUrl: z.string().optional().nullable(),
      assetLink: z.string().url("Asset link must be a valid URL"),
      packages: z.array(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        price: z.number().min(0),
        originalPrice: z.number().optional(),
        isPopular: z.boolean().default(false),
        features: z.array(z.string()).min(1),
        accessType: z.string().optional(),
        accessLimit: z.number().optional(),
        accessDuration: z.string().optional(),
      })).min(1),
      whatsIncluded: z.array(z.string()).default([]),
      keyBenefits: z.array(z.object({
        title: z.string(),
        description: z.string()
      })).default([]),
      demoImages: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const capsule = await ctx.db.capsule.create({
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          type: input.type,
          logoUrl: input.logoUrl || null,
          assetLink: input.assetLink,
          whatsIncluded: input.whatsIncluded.filter(item => item.trim()),
          keyBenefits: input.keyBenefits.filter(item => item.title.trim() && item.description.trim()),
          demoImages: input.demoImages,
          creatorId: userId,
          isActive: true,
          packages: {
            create: input.packages.map((pkg, index) => ({
              name: pkg.name,
              description: pkg.description || null,
              price: pkg.price,
              originalPrice: pkg.originalPrice || null,
              isPopular: pkg.isPopular,
              features: pkg.features.filter(f => f.trim()), // Remove empty features
              accessType: pkg.accessType || null,
              accessLimit: pkg.accessLimit || null,
              accessDuration: pkg.accessDuration || null,
              sortOrder: index,
            }))
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          packages: {
            orderBy: { sortOrder: 'asc' }
          }
        },
      });

      return capsule;
    }),

  // Update capsule
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      description: z.string().min(1),
      price: z.number().min(0),
      type: CapsuleType,
      logoUrl: z.string().optional().nullable(),
      assetLink: z.string().url("Asset link must be a valid URL"),
      packages: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().min(0),
        originalPrice: z.number().optional(),
        isPopular: z.boolean().default(false),
        features: z.array(z.string()).min(1),
        accessType: z.string().optional(),
        accessLimit: z.number().optional(),
        accessDuration: z.string().optional(),
      })).min(1),
      whatsIncluded: z.array(z.string()).default([]),
      keyBenefits: z.array(z.object({
        title: z.string(),
        description: z.string()
      })).default([]),
      demoImages: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Check if user owns this capsule
      const existingCapsule = await ctx.db.capsule.findFirst({
        where: { 
          id: input.id,
          creatorId: userId
        }
      });
      
      if (!existingCapsule) {
        throw new Error("Capsule not found or you don't have permission to edit it");
      }
      
      // Delete existing packages
      await ctx.db.capsulePackage.deleteMany({
        where: { capsuleId: input.id }
      });
      
      // Update capsule with new data
      const updatedCapsule = await ctx.db.capsule.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          type: input.type,
          logoUrl: input.logoUrl || null,
          assetLink: input.assetLink,
          whatsIncluded: input.whatsIncluded.filter(item => item.trim()),
          keyBenefits: input.keyBenefits.filter(item => item.title.trim() && item.description.trim()),
          demoImages: input.demoImages,
          packages: {
            create: input.packages.map((pkg, index) => ({
              name: pkg.name,
              description: pkg.description || null,
              price: pkg.price,
              originalPrice: pkg.originalPrice || null,
              isPopular: pkg.isPopular,
              features: pkg.features.filter(f => f.trim()),
              accessType: pkg.accessType || null,
              accessLimit: pkg.accessLimit || null,
              accessDuration: pkg.accessDuration || null,
              sortOrder: index,
            }))
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          packages: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      return updatedCapsule;
    }),

  // Purchase capsule
  purchaseCapsule: protectedProcedure
    .input(z.object({
      capsuleId: z.string(),
      paymentMethod: z.string().optional().default("stripe")
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { capsuleId, paymentMethod } = input;

      console.log(`[Purchase] Starting purchase for user ${userId}, capsule ${capsuleId}, method ${paymentMethod}`);

      // Check if capsule exists and is active
      const capsule = await ctx.db.capsule.findUnique({
        where: { id: capsuleId },
        include: { creator: true }
      });

      if (!capsule || !capsule.isActive) {
        throw new Error("Capsule not found or inactive");
      }

      // Check if user is trying to buy their own capsule
      if (capsule.creatorId === userId) {
        throw new Error("Cannot purchase your own capsule");
      }

      // Check if user already purchased this capsule
      const existingPurchase = await ctx.db.capsulePurchase.findUnique({
        where: { 
          capsuleId_buyerId: { 
            capsuleId, 
            buyerId: userId 
          } 
        }
      });

      if (existingPurchase && existingPurchase.paymentStatus === "COMPLETED") {
        throw new Error("You have already purchased this capsule");
      }

      // Create or update purchase record
      const purchase = await ctx.db.capsulePurchase.upsert({
        where: { 
          capsuleId_buyerId: { 
            capsuleId, 
            buyerId: userId 
          } 
        },
        update: {
          amount: capsule.price,
          paymentMethod,
          paymentStatus: "COMPLETED", // In real app, this would be PENDING until payment confirmation
          transactionId: `txn_${Date.now()}`, // In real app, this would come from payment processor
          updatedAt: new Date()
        },
        create: {
          capsuleId,
          buyerId: userId,
          amount: capsule.price,
          paymentMethod,
          paymentStatus: "COMPLETED", // In real app, this would be PENDING until payment confirmation
          transactionId: `txn_${Date.now()}` // In real app, this would come from payment processor
        },
        include: {
          capsule: {
            select: {
              id: true,
              name: true,
              creator: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          buyer: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Update capsule sales count
      await ctx.db.capsule.update({
        where: { id: capsuleId },
        data: {
          totalSales: {
            increment: 1
          }
        }
      });

      // Create notification for capsule creator
      console.log(`[Purchase] Creating notification for creator ${capsule.creatorId}`);
      await ctx.db.notification.create({
        data: {
          userId: capsule.creatorId,
          type: "CAPSULE_PURCHASE",
          title: "New Purchase!",
          content: `${purchase.buyer.name} purchased your "${capsule.name}" capsule`
        }
      });
      console.log(`[Purchase] Notification created for purchase ${purchase.id}`);

      // Send automated message with asset link to buyer
      console.log(`[Purchase] Capsule has assetLink: ${!!capsule.assetLink}`);
      if (capsule.assetLink) {
        try {
          // Decrypt asset link for messaging
          console.log(`[Purchase] Decrypting asset link for capsule ${capsule.id}`);
          const decryptedAssetLink = decryptAssetLink(capsule.assetLink);
          console.log(`[Purchase] Asset link decrypted successfully: ${!!decryptedAssetLink}`);

          // Send asset link message from admin user
          try {
            const { ensureAdminUser } = await import("@/lib/admin-setup");
            const adminUser = await ensureAdminUser();

            // Find or create conversation between admin and buyer
            let conversation = await ctx.db.conversation.findFirst({
              where: {
                AND: [
                  {
                    participants: {
                      some: {
                        userId: adminUser.id
                      }
                    }
                  },
                  {
                    participants: {
                      some: {
                        userId: userId
                      }
                    }
                  }
                ]
              }
            });

            if (!conversation) {
              conversation = await ctx.db.conversation.create({
                data: {
                  type: "direct",
                  participants: {
                    create: [
                      { userId: adminUser.id },
                      { userId: userId }
                    ]
                  }
                }
              });
            }

            // Send the asset delivery message
            await ctx.db.message.create({
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

            // Update conversation's updatedAt timestamp to ensure it appears at the top
            await ctx.db.conversation.update({
              where: { id: conversation.id },
              data: { updatedAt: new Date() }
            });

            // Create notification for new message
            await ctx.db.notification.create({
              data: {
                userId: userId,
                type: "NEW_MESSAGE",
                title: "New message from NoCage Admin",
                content: "Your digital asset is ready! Click to view your asset link.",
                relatedId: conversation.id,
                actionUrl: `/messages?conversation=${conversation.id}`,
                isRead: false,
              },
            });

            console.log(`[Asset Link] Successfully sent DM from admin to buyer ${userId} for capsule ${capsule.name}`);
          } catch (error) {
            console.error(`[Asset Link] Failed to send DM from admin:`, error);
          }

          console.log(`[Asset Link] Sent to buyer ${userId} for capsule ${capsule.name}`);

          // Send email notification with asset link
          setTimeout(async () => {
            try {
              const { emailService } = await import("@/lib/email");

              // Get buyer's email from the purchase
              const buyerUser = await ctx.db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true }
              });

              if (buyerUser?.email) {
                await emailService.sendAssetDeliveryEmail(buyerUser.email, {
                  buyerName: buyerUser.name || "Valued Customer",
                  capsuleName: capsule.name,
                  assetLink: decryptedAssetLink,
                  purchaseId: purchase.id,
                  sellerName: capsule.creator.name || "Creator"
                });

                console.log(`[Email] Asset delivery email sent to ${buyerUser.email}`);
              }
            } catch (error) {
              console.error("Failed to send asset delivery email:", error);
            }
          }, 5000); // Send email after 5 seconds

          // Send admin follow-up message after a delay
          setTimeout(async () => {
            try {
              const { sendAdminFollowUpMessage } = await import("@/lib/admin-setup");
              await sendAdminFollowUpMessage(
                userId,
                capsule.name,
                decryptedAssetLink,
                purchase.id
              );

              // Also send confirmation email from admin
              const { emailService } = await import("@/lib/email");
              const buyerUser = await ctx.db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true }
              });

              if (buyerUser?.email) {
                await emailService.sendAssetConfirmationEmail(buyerUser.email, {
                  buyerName: buyerUser.name || "Valued Customer",
                  capsuleName: capsule.name,
                  assetLink: decryptedAssetLink,
                  purchaseId: purchase.id,
                  sellerName: capsule.creator.name || "Creator"
                });

                console.log(`[Email] Confirmation request sent to ${buyerUser.email}`);
              }
            } catch (error) {
              console.error("Failed to send admin follow-up:", error);
            }
          }, 300000); // Wait 5 minutes before sending follow-up

        } catch (error) {
          console.error("Failed to send asset link message:", error);
          // Don't fail the purchase if messaging fails
        }
      }

      return purchase;
    }),

  // Check if user has purchased a capsule
  checkPurchaseStatus: protectedProcedure
    .input(z.object({
      capsuleId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const purchase = await ctx.db.capsulePurchase.findUnique({
        where: {
          capsuleId_buyerId: {
            capsuleId: input.capsuleId,
            buyerId: userId
          }
        }
      });

      return {
        hasPurchased: purchase?.paymentStatus === "COMPLETED",
        purchase
      };
    }),

  // Get user's purchases
  getUserPurchases: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const purchases = await ctx.db.capsulePurchase.findMany({
        where: {
          buyerId: userId,
          paymentStatus: "COMPLETED"
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          capsule: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  username: true
                }
              }
            }
          }
        }
      });

      return purchases;
    }),

  // Get purchase details for acknowledgment
  getPurchaseDetails: protectedProcedure
    .input(z.object({
      purchaseId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { purchaseId } = input;

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
              assetLink: true,
              creator: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!purchase) {
        throw new Error("Purchase not found or access denied");
      }

      // Decrypt asset link for the buyer
      let decryptedAssetLink = null;
      if (purchase.capsule.assetLink) {
        try {
          decryptedAssetLink = decryptAssetLink(purchase.capsule.assetLink);
        } catch (error) {
          logger.error("[Asset Decryption] Failed to decrypt asset link:", error);
          decryptedAssetLink = "Error: Could not decrypt asset link";
        }
      }

      return {
        ...purchase,
        capsule: {
          ...purchase.capsule,
          assetLink: decryptedAssetLink
        }
      };
    }),

  // Create a review for a capsule
  createReview: protectedProcedure
    .input(z.object({
      capsuleId: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string().min(1).max(1000)
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { capsuleId, rating, comment } = input;

      // Check if user has purchased this capsule
      const purchase = await ctx.db.capsulePurchase.findUnique({
        where: {
          capsuleId_buyerId: {
            capsuleId,
            buyerId: userId
          }
        }
      });

      if (!purchase || purchase.paymentStatus !== "COMPLETED") {
        throw new Error("You must purchase this capsule before leaving a review");
      }

      // Check if user already reviewed this capsule
      const existingReview = await ctx.db.capsuleReview.findUnique({
        where: {
          capsuleId_reviewerId: {
            capsuleId,
            reviewerId: userId
          }
        }
      });

      if (existingReview) {
        throw new Error("You have already reviewed this capsule");
      }

      // Get the capsule to access creator info
      const capsule = await ctx.db.capsule.findUnique({
        where: { id: capsuleId },
        select: {
          id: true,
          name: true,
          creatorId: true,
          creator: {
            select: {
              name: true
            }
          }
        }
      });

      if (!capsule) {
        throw new Error("Capsule not found");
      }

      // Create the review
      const review = await ctx.db.capsuleReview.create({
        data: {
          capsuleId,
          reviewerId: userId,
          rating,
          comment
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          },
          capsule: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Update capsule rating (recalculate average)
      const allReviews = await ctx.db.capsuleReview.findMany({
        where: { capsuleId },
        select: { rating: true }
      });

      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await ctx.db.capsule.update({
        where: { id: capsuleId },
        data: { rating: Math.round(avgRating * 10) / 10 }
      });

      // Create notification for capsule creator
      await ctx.db.notification.create({
        data: {
          userId: capsule.creatorId,
          type: "CAPSULE_REVIEW",
          title: "New Review!",
          content: `${review.reviewer.name} left a ${rating}-star review on "${capsule.name}"`
        }
      });

      return review;
    }),

  // Check if user can review a capsule
  canReviewCapsule: protectedProcedure
    .input(z.object({
      capsuleId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { capsuleId } = input;

      // Check if user has purchased this capsule
      const purchase = await ctx.db.capsulePurchase.findUnique({
        where: {
          capsuleId_buyerId: {
            capsuleId,
            buyerId: userId
          }
        }
      });

      if (!purchase || purchase.paymentStatus !== "COMPLETED") {
        return { canReview: false, reason: "must_purchase" };
      }

      // Check if user already reviewed this capsule
      const existingReview = await ctx.db.capsuleReview.findUnique({
        where: {
          capsuleId_reviewerId: {
            capsuleId,
            reviewerId: userId
          }
        }
      });

      if (existingReview) {
        return { canReview: false, reason: "already_reviewed", review: existingReview };
      }

      return { canReview: true };
    }),

  // Delete capsule
  delete: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;

      // Check if user owns this capsule
      const capsule = await ctx.db.capsule.findFirst({
        where: {
          id,
          creatorId: userId
        }
      });

      if (!capsule) {
        throw new Error("Capsule not found or you don't have permission to delete it");
      }

      // Check if capsule has any purchases
      const purchaseCount = await ctx.db.capsulePurchase.count({
        where: {
          capsuleId: id,
          paymentStatus: "COMPLETED"
        }
      });

      if (purchaseCount > 0) {
        throw new Error("Cannot delete capsule with existing purchases. You can deactivate it instead.");
      }

      // Delete associated data first (reviews, packages)
      await ctx.db.capsuleReview.deleteMany({
        where: { capsuleId: id }
      });

      await ctx.db.capsulePackage.deleteMany({
        where: { capsuleId: id }
      });

      // Delete the capsule
      const deletedCapsule = await ctx.db.capsule.delete({
        where: { id }
      });

      return { success: true, deletedCapsule };
    }),

  // Toggle capsule active status
  toggleActiveStatus: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;

      // Check if user owns this capsule
      const capsule = await ctx.db.capsule.findFirst({
        where: {
          id,
          creatorId: userId
        }
      });

      if (!capsule) {
        throw new Error("Capsule not found or you don't have permission to modify it");
      }

      const updatedCapsule = await ctx.db.capsule.update({
        where: { id },
        data: { isActive: !capsule.isActive }
      });

      return updatedCapsule;
    }),
});