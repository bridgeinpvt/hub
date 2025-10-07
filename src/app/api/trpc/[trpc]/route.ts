import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/api/root"
import { db } from "@/server/db"
import { getUserFromHeaders } from "@/lib/shared-auth-middleware"
import { logger } from "@/lib/logger"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ req }) => {
      // Get user from headers set by middleware
      const headers = new Headers(req.headers)
      const user = getUserFromHeaders(headers)

      logger.log("TRPC Context - User:", user?.id)

      return {
        user,
        db,
      }
    },
  })

export { handler as GET, handler as POST }