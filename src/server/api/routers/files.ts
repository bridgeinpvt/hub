import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { deleteFromR2 } from "@/lib/r2-storage";

export const filesRouter = createTRPCRouter({
  // Update user profile picture
  updateProfilePicture: protectedProcedure
    .input(z.object({
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { fileId } = input;

      try {
        // Verify the file exists and belongs to the user
        const file = await ctx.db.fileStorage.findFirst({
          where: {
            id: fileId,
            uploadedBy: userId,
            purpose: "profile_picture",
          },
        });

        if (!file) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found or you don't have permission to use it",
          });
        }

        // Update user's profile picture
        const imageUrl = `/api/files/${file.id}`;
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: { image: imageUrl },
        });

        return {
          success: true,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            image: updatedUser.image,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile picture",
        });
      }
    }),

  // Update capsule logo
  updateCapsuleLogo: protectedProcedure
    .input(z.object({
      capsuleId: z.string(),
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { capsuleId, fileId } = input;

      try {
        // Verify the file exists and belongs to the user
        const file = await ctx.db.fileStorage.findFirst({
          where: {
            id: fileId,
            uploadedBy: userId,
            purpose: "capsule_logo",
          },
        });

        if (!file) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found or you don't have permission to use it",
          });
        }

        // Verify the capsule belongs to the user
        const capsule = await ctx.db.capsule.findFirst({
          where: {
            id: capsuleId,
            creatorId: userId,
          },
        });

        if (!capsule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Capsule not found or you don't have permission to edit it",
          });
        }

        // Update capsule logo
        const logoUrl = `/api/files/${file.id}`;
        const updatedCapsule = await ctx.db.capsule.update({
          where: { id: capsuleId },
          data: { logoUrl },
        });

        return {
          success: true,
          capsule: {
            id: updatedCapsule.id,
            name: updatedCapsule.name,
            logoUrl: updatedCapsule.logoUrl,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update capsule logo",
        });
      }
    }),

  // Get user's uploaded files
  getUserFiles: protectedProcedure
    .input(z.object({
      purpose: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { purpose, limit, cursor } = input;

      try {
        const files = await ctx.db.fileStorage.findMany({
          where: {
            uploadedBy: userId,
            ...(purpose && { purpose }),
          },
          select: {
            id: true,
            filename: true,
            mimetype: true,
            size: true,
            purpose: true,
            r2Url: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
          }),
        });

        let nextCursor: string | undefined;
        if (files.length > limit) {
          const nextItem = files.pop();
          nextCursor = nextItem!.id;
        }

        return {
          files: files.map(file => ({
            ...file,
            url: `/api/files/${file.id}`, // Always use our API endpoint
          })),
          nextCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch files",
        });
      }
    }),

  // Delete a file
  deleteFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { fileId } = input;

      try {
        // Verify the file belongs to the user
        const file = await ctx.db.fileStorage.findFirst({
          where: {
            id: fileId,
            uploadedBy: userId,
          },
        });

        if (!file) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found or you don't have permission to delete it",
          });
        }

        // Delete file from R2 first (only if it exists in R2)
        if (file.r2Key) {
          await deleteFromR2(file.r2Key);
        }

        // Delete the file record from database
        await ctx.db.fileStorage.delete({
          where: { id: fileId },
        });

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete file",
        });
      }
    }),
});