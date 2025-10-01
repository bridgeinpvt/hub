import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/api/root"
import { cookies } from "next/headers"
import { db } from "@/server/db"
import { type Session } from "next-auth"
import { decode } from "next-auth/jwt"
import { logger } from "@/lib/logger"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ req }) => {
      // Get cookies from Next.js headers
      const cookieStore = cookies()
      
      // Get the session token from cookies
      const sessionToken = cookieStore.get("next-auth.session-token") || cookieStore.get("__Secure-next-auth.session-token")
      
      let session: Session | null = null
      
      if (sessionToken) {
        try {
          // Decode the JWT token to get session data
          const decoded = await decode({
            token: sessionToken.value,
            secret: process.env.NEXTAUTH_SECRET!,
          })
          
          if (decoded) {
            session = {
              user: {
                id: decoded.id as string,
                email: decoded.email as string,
                name: decoded.name as string,
                image: decoded.image as string,
              },
              expires: new Date((decoded.exp as number) * 1000).toISOString(),
            }
          }
        } catch (error) {
          logger.error("Error decoding session token:", error)
        }
      }
      
      logger.log("TRPC Context - Session:", session?.user?.id)
      
      return {
        session,
        db,
      }
    },
  })

export { handler as GET, handler as POST }