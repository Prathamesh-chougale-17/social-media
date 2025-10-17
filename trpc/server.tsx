import "server-only"; // <-- ensure this file cannot be imported from the client
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { createCallerFactory, createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";
import { trpc as sharedTrpc } from "./shared";
// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);
const caller = createCallerFactory(appRouter)(createTRPCContext);
export const { trpc: serverTrpc, HydrateClient } = createHydrationHelpers<
  typeof appRouter
>(caller, getQueryClient);

// Export the shared client-side trpc instance as `trpc` for consistency.
// Server hydration helpers expose `HydrateClient` and `serverTrpc` for internal use.
// Export server-side trpc (hydration-capable) as `trpc` so server
// components can call `prefetchInfinite`, etc.
export { serverTrpc as trpc, sharedTrpc as clientTrpc };
