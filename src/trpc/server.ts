import "server-only";

import { createCaller } from "@/server/api/root";

import { type AppRouter } from "@/server/api/root";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { db } from "@/server/db";

/**
 * This function is used to create a caller for the tRPC server.
 * It allows us to call tRPC procedures directly in server-side code.
 */

/**
 * Creates the server API caller with proper context.
 */
const createContext = async () => {
  // Get session for server-side calls
  const session = await getServerSession(authConfig) as Session | null;
  return {
    session,
    db,
  };
};

const getApi = async () => {
  const context = await createContext();
  return createCaller(context);
};

export const api = {
  async getCaller() {
    return await getApi();
  }
};