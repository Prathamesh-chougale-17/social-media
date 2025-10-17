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

/**
 * tRPC Context
 *
 * Context is created for each request and passed to all procedures.
 * Contains user authentication info and request metadata.
 */
export interface Context {
  userId?: string; // User ID from auth session (if authenticated)
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
  // The helper `getSessionCookie` is defensive and may accept a Fetch `Request` or
  // Next.js `NextRequest`. We try a few common shapes for the session to extract
  // a canonical `userId` value.
  try {
    const req = opts?.req as any | undefined;
    let session: any = getSessionCookie(req);

    // `getSessionCookie` may return a JSON string in some versions; try to parse
    if (typeof session === "string") {
      try {
        session = JSON.parse(session);
      } catch (e) {
        // leave as string if parsing fails
      }
    }

    // Helper to safely read nested properties
    const getUserId = (s: any) => {
      if (!s) return undefined;
      if (typeof s === "string") return s;
      return s?.user?.id ?? s?.userId ?? s?.sub ?? s?.id ?? undefined;
    };

    const userId = getUserId(session);
    return { userId };
  } catch (err) {
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
