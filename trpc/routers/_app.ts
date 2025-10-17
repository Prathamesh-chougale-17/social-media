/**
 * Main tRPC App Router
 * 
 * Combines all feature routers into a single app router.
 * This is the root router that exposes all tRPC procedures.
 */

import { router } from '../init';
import { videosRouter } from './videos';

/**
 * App Router
 * 
 * Main router that includes all feature routers.
 * Add new routers here as features are implemented.
 */
export const appRouter = router({
  videos: videosRouter,
  // Add more routers here:
  // interactions: interactionsRouter,
  // users: usersRouter,
  // etc.
});

/**
 * Export type for use in client
 */
export type AppRouter = typeof appRouter;
