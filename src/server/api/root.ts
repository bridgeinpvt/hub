import { createTRPCRouter } from "@/server/api/trpc";
import { postRouter } from "./routers/post";
import { userRouter } from "./routers/user";
import { newsRouter } from "./routers/news";
import { exploreRouter } from "./routers/explore";
import { capsuleRouter } from "./routers/capsule";
import { chatRouter } from "./routers/chat";
import { referralRouter } from "./routers/referral";
import { notificationRouter } from "./routers/notification";
import { filesRouter } from "./routers/files";
import { walletRouter } from "./routers/wallet";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
  news: newsRouter,
  explore: exploreRouter,
  capsule: capsuleRouter,
  chat: chatRouter,
  referral: referralRouter,
  notification: notificationRouter,
  files: filesRouter,
  wallet: walletRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

// Export a server-side caller factory
export const createCaller = (ctx: any) => {
  return appRouter.createCaller(ctx);
};