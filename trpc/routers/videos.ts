/**
 * Videos tRPC Router
 *
 * Handles all video-related operations:
 * - getInfinite: Paginated video feed with cursor-based pagination
 * - syncFromPexels: Sync videos from Pexels API to MongoDB
 *
 * Follows Principle III: tRPC-First Data.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../init";
import { VideoSchema } from "@/lib/db/models/video";
import {
  getVideosWithCursor,
  upsertVideos,
  transformPexelsVideo,
} from "@/lib/db/queries/videos";
import { pexelsClient } from "@/lib/pexels-client";
import { getDatabase } from "@/lib/mongo";

/**
 * Input schema for getInfinite query
 */
const GetInfiniteVideosInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(15),
  cursor: z.string().optional(),
});

/**
 * Output schema for getInfinite query
 */
const GetInfiniteVideosOutputSchema = z.object({
  items: z.array(VideoSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

/**
 * Input schema for syncFromPexels mutation
 */
const SyncFromPexelsInputSchema = z.object({
  page: z.number().int().min(1).max(100).default(1),
  perPage: z.number().int().min(1).max(80).default(20),
});

/**
 * Output schema for syncFromPexels mutation
 */
const SyncFromPexelsOutputSchema = z.object({
  success: z.boolean(),
  syncedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  totalFetched: z.number().int().min(0),
  page: z.number().int(),
  errors: z.array(z.string()),
});

/**
 * Videos router
 */
export const videosRouter = router({
  /**
   * Get paginated videos (infinite query)
   *
   * Supports cursor-based pagination for infinite scroll.
   * Returns videos sorted by uploadedAt (descending).
   */
  getInfinite: publicProcedure
    .input(GetInfiniteVideosInputSchema)
    .output(GetInfiniteVideosOutputSchema)
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      try {
        const db = await getDatabase();
        const result = await getVideosWithCursor(db, limit, cursor);

        return result;
      } catch (error) {
        if (error instanceof Error && error.message.includes("cursor")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid cursor format",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch videos",
        });
      }
    }),

  /**
   * Sync videos from Pexels API
   *
   * Fetches popular videos from Pexels and stores them in MongoDB.
   * Skips videos that already exist (based on pexelsId).
   *
   * TODO: Add authentication - should be admin-only
   */
  syncFromPexels: publicProcedure
    .input(SyncFromPexelsInputSchema)
    .output(SyncFromPexelsOutputSchema)
    .mutation(async ({ input }) => {
      const { page, perPage } = input;
      const errors: string[] = [];

      try {
        // 1. Fetch videos from Pexels API
        const pexelsVideos = await pexelsClient.fetchPopularVideos(
          page,
          perPage,
        );
        const totalFetched = pexelsVideos.length;

        // 2. Transform videos to MongoDB format
        const transformedVideos = [];
        for (const pexelsVideo of pexelsVideos) {
          const transformed = transformPexelsVideo(pexelsVideo);
          if (transformed) {
            transformedVideos.push(transformed);
          } else {
            errors.push(
              `Failed to transform video ${pexelsVideo.id}: Missing required data`,
            );
          }
        }

        // 3. Upsert to database
        const db = await getDatabase();
        const { syncedCount, skippedCount } = await upsertVideos(
          db,
          transformedVideos,
        );

        return {
          success: true,
          syncedCount,
          skippedCount,
          totalFetched,
          page,
          errors,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        return {
          success: false,
          syncedCount: 0,
          skippedCount: 0,
          totalFetched: 0,
          page,
          errors: [errorMessage],
        };
      }
    }),
});
