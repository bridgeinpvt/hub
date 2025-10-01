import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

function generateReferralCode(userId: string): string {
  // Generate a referral code based on user ID and timestamp
  const timestamp = Date.now().toString(36);
  const userPart = userId.slice(-4).toUpperCase();
  return `REF${userPart}${timestamp}`.slice(0, 12);
}

export const referralRouter = createTRPCRouter({
  // Generate referral code
  generateReferralCode: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check if user already has a referral code
      const existingUser = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });
      
      if (existingUser?.referralCode) {
        return { referralCode: existingUser.referralCode, success: true };
      }
      
      // Generate new referral code
      let referralCode: string;
      let isUnique = false;
      
      do {
        referralCode = generateReferralCode(userId);
        const existing = await ctx.db.user.findUnique({
          where: { referralCode },
        });
        isUnique = !existing;
      } while (!isUnique);
      
      // Update user with referral code
      await ctx.db.user.update({
        where: { id: userId },
        data: { referralCode },
      });

      return { referralCode, success: true };
    }),

  // Get referral stats
  getReferralStats: protectedProcedure
    .input(z.void().optional())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Get user's referral code and credits
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { 
          referralCode: true,
          referralCredits: true 
        },
      });
      
      if (!user?.referralCode) {
        return {
          totalReferrals: 0,
          totalEarnings: 0,
          activeReferrals: 0,
          monthlyReferrals: 0,
          referralCredits: 0,
          referralCode: null
        };
      }
      
      // Get all referrals made by this user
      const referrals = await ctx.db.referral.findMany({
        where: { referrerId: userId },
        include: {
          referred: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      });
      
      const completedReferrals = referrals.filter(r => r.status === "COMPLETED");
      const totalReferrals = completedReferrals.length;
      
      // Calculate monthly referrals
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const monthlyReferrals = completedReferrals.filter(
        r => r.createdAt >= oneMonthAgo
      ).length;

      return {
        totalReferrals,
        totalEarnings: totalReferrals * 10, // $10 per referral (example)
        activeReferrals: totalReferrals,
        monthlyReferrals,
        referralCredits: user.referralCredits || 0,
        referralCode: user.referralCode
      };
    }),

  // Get referral history
  getReferralHistory: protectedProcedure
    .input(z.void().optional())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const referrals = await ctx.db.referral.findMany({
        where: {
          referrerId: userId,
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        include: {
          referred: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return referrals.map(referral => ({
        id: referral.id,
        referralCode: referral.referralCode,
        createdAt: referral.createdAt,
        referred: referral.referred,
        earnings: 10, // Example earning per referral
      }));
    }),

  // Validate referral code
  validateReferralCode: publicProcedure
    .input(z.object({
      referralCode: z.string().min(1)
    }))
    .query(async ({ ctx, input }) => {
      const { referralCode } = input;
      
      const user = await ctx.db.user.findUnique({
        where: { referralCode },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      });
      
      if (!user) {
        return { valid: false, referrer: null };
      }

      return {
        valid: true,
        referrer: user,
        referralCode,
      };
    }),

  // Apply referral code
  applyReferralCode: publicProcedure
    .input(z.object({
      referralCode: z.string().min(1),
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { referralCode, userId } = input;
      
      // Find the referral by code from User model
      const referrer = await ctx.db.user.findUnique({
        where: { referralCode },
      });
      
      if (!referrer) {
        return { success: false, error: "Invalid referral code" };
      }
      
      if (referrer.id === userId) {
        return { success: false, error: "Cannot use your own referral code" };
      }
      
      // Check if user already has a referral relationship
      const existingReferral = await ctx.db.referral.findFirst({
        where: {
          referrerId: referrer.id,
          referredId: userId,
        },
      });
      
      if (existingReferral) {
        return { success: false, error: "Referral relationship already exists" };
      }
      
      // Create the referral relationship
      await ctx.db.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: userId,
          referralCode,
          status: "COMPLETED",
        },
      });

      return { success: true };
    }),
});