import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./routers/_app";

// Shared trpc instance used by both client and server helpers so
// the React context identity remains stable across bundles.
export const trpc = createTRPCReact<AppRouter>();
