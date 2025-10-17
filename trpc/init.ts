/**
 * tRPC Initialization
 *
 * Core tRPC setup with context, procedures, and router.
 * Follows Principle III: tRPC-First Data.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { ZodError } from "zod";
import { getSessionCookie } from "better-auth/cookies";
import { getDatabase } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import { auth } from "../lib/auth"; // path to your Better Auth server instance
import { headers } from "next/headers";
/**
 * tRPC Context
 *
 * Context is created for each request and passed to all procedures.
 * Contains user authentication info and request metadata.
 */
export interface Context {
  userId?: string; // User ID from auth session (if authenticated)
  userName?: string; // Display name from auth session (if available)
  userImage?: string | null; // User profile image from auth session (if available)
  // Add more context fields as needed (e.g., session, headers)
}

/**
 * Create tRPC context
 *
 * This function runs on every request to establish context.
 * For now, it returns an empty context (auth will be added later).
 */
export async function createTRPCContext(opts?: { req?: Request } ) : Promise<Context> {
  // Attempt to read Better Auth session cookie from the incoming request.
  try {
    const req = opts?.req as any | undefined;
    
    if (!req) {
      return {};
    }


    const session = await auth.api.getSession({
      headers: await headers() // you need to pass the headers object.
    });

  const userId = session ? session.user?.id : undefined;
  let userName = session ? session.user?.name : undefined;
  let userImage = session ? session.user?.image : null;

    // Development-only logging was removed after verification.

    // Fallback: if session did not include name/image, try to fetch from DB
    if ((!userName || !userImage) && userId) {
      try {
        const db = await getDatabase();
        let userDoc: any = null;

        // If userId looks like an ObjectId, try querying by _id
        if (/^[0-9a-fA-F]{24}$/.test(userId)) {
          userDoc = await db.collection("user").findOne({ _id: new ObjectId(userId) });
        }

        // If not found by _id, try querying by id (better-auth's id)
        if (!userDoc) {
          userDoc = await db.collection("user").findOne({ id: userId });
        }

        // If still not found and userId looks URL-encoded, try decoding and lookup
        if (!userDoc && typeof userId === "string" && userId.includes("%")) {
          try {
            const decoded = decodeURIComponent(userId);
            userDoc = await db.collection("user").findOne({ id: decoded });
              // found by decoded id (no-op)
          } catch (e) {
            // ignore decode errors
          }
        }

        if (userDoc) {
          userName = userName || userDoc.name;
          userImage = userImage || userDoc.image || null;
        }
      } catch (e) {
        // swallow fallback lookup errors in production and dev (they're non-fatal)
      }
    }

    return { userId, userName, userImage };
  } catch (err) {
    console.error("Error creating tRPC context:", err);
    return {};
  }
}

/**
 * Initialize tRPC with SuperJSON transformer
 *
 * SuperJSON allows us to serialize Date, Map, Set, etc. automatically.
 */
const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create caller factory
 *
 * Used to create server-side callers for tRPC procedures.
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Create a router
 *
 * Used to create new tRPC routers.
 */
export const router = t.router;

/**
 * Public procedure
 *
 * Anyone can call this procedure (no authentication required).
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure
 *
 * Only authenticated users can call this procedure.
 * Throws UNAUTHORIZED error if user is not authenticated.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // Now userId is guaranteed to be defined
    },
  });
});
