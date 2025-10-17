/**
 * tRPC Initialization
 * 
 * Core tRPC setup with context, procedures, and router.
 * Follows Principle III: tRPC-First Data.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import SuperJSON from 'superjson';
import { ZodError } from 'zod';

/**
 * tRPC Context
 * 
 * Context is created for each request and passed to all procedures.
 * Contains user authentication info and request metadata.
 */
export interface Context {
  userId?: string;  // User ID from auth session (if authenticated)
  // Add more context fields as needed (e.g., session, headers)
}

/**
 * Create tRPC context
 * 
 * This function runs on every request to establish context.
 * For now, it returns an empty context (auth will be added later).
 */
export function createTRPCContext(): Context {
  // TODO: Add authentication context when auth is implemented
  // const session = await getSession();
  // return { userId: session?.user?.id };
  
  return {};
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
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // Now userId is guaranteed to be defined
    },
  });
});
