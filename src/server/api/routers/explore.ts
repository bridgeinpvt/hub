import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const exploreRouter = createTRPCRouter({
  // Search users
  search: publicProcedure
    .input(z.object({
      query: z.string().trim().min(1)
    }))
    .query(async ({ ctx, input }) => {
      const { query } = input;
      
      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              username: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              bio: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        },
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
        take: 20,
      });

      return users.map(user => ({
        ...user,
        postsCount: user._count.posts,
        capsulesCount: user._count.capsules,
      }));
    }),

  // Search everything (users, posts, capsules, news)
  searchAll: publicProcedure
    .input(z.object({
      query: z.string().trim().min(1),
      type: z.enum(["all", "users", "posts", "capsules", "news"]).default("all")
    }))
    .query(async ({ ctx, input }) => {
      const { query, type } = input;
      const results: any = {
        users: [],
        posts: [],
        capsules: [],
        news: [],
      };

      if (type === "all" || type === "users") {
        results.users = await ctx.db.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
              { bio: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            bio: true,
          },
          take: 10,
        });
      }

      if (type === "all" || type === "posts") {
        results.posts = await ctx.db.post.findMany({
          where: {
            content: { contains: query, mode: "insensitive" },
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
          take: 10,
        });
      }

      if (type === "all" || type === "capsules") {
        results.capsules = await ctx.db.capsule.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
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
          },
          take: 10,
        });
      }

      if (type === "all" || type === "news") {
        results.news = await ctx.db.news.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          include: {
            source: {
              select: {
                name: true,
                url: true,
              },
            },
          },
          take: 10,
        });
      }

      return results;
    }),
});