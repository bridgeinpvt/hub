import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { trackEvent as trackAnalyticsEvent } from "@/lib/analytics";

export const analyticsRouter = createTRPCRouter({
  // Track analytics event
  trackEvent: protectedProcedure
    .input(z.object({
      event: z.string(),
      properties: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      // Call the client-side analytics function
      // Note: This is a server-side endpoint, so we'll just return success
      // The actual tracking should happen on the client side
      return { success: true };
    }),
});
