/**
 * Video Database Model
 *
 * MongoDB schema, Zod validation, and type definitions for the videos collection.
 * Follows Principle VIII: MongoDB Schemas with typed collections and explicit indexes.
 */

import { z } from "zod";
import type { ObjectId } from "mongodb";

/**
 * Video creator schema (Zod)
 */
export const VideoCreatorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

/**
 * Video URLs schema (Zod)
 */
export const VideoUrlsSchema = z.object({
  tiny: z.string().url(),
  small: z.string().url(),
  medium: z.string().url(),
  large: z.string().url(),
  hd: z.string().url().nullable(),
  fullHd: z.string().url().nullable(),
});

/**
 * Video schema (Zod) for validation
 *
 * This is the domain model schema used for API responses
 */
export const VideoSchema = z.object({
  id: z.string(),
  pexelsId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  creator: VideoCreatorSchema,
  duration: z.number().int().positive().max(36000), // 10 hours max
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  thumbnailUrl: z.string().url(),
  videoUrls: VideoUrlsSchema,
  tags: z.array(z.string()),
  uploadedAt: z.date(),
  syncedAt: z.date(),
});

/**
 * Type inference from Zod schema
 */
export type Video = z.infer<typeof VideoSchema>;

/**
 * MongoDB document structure
 *
 * This is the raw document shape stored in MongoDB
 * (before transformation to domain Video type)
 */
export interface VideoDocument {
  _id: ObjectId;
  pexelsId: number;
  title: string;
  creator: {
    name: string;
    url: string;
  };
  duration: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  videoUrls: {
    tiny: string;
    small: string;
    medium: string;
    large: string;
    hd: string | null;
    fullHd: string | null;
  };
  tags: string[];
  uploadedAt: Date;
  syncedAt: Date;
}

/**
 * MongoDB collection name
 */
export const VIDEOS_COLLECTION = "videos";

/**
 * MongoDB indexes for videos collection
 *
 * These indexes MUST be created before querying.
 * Run this function during database initialization.
 */
export const VIDEO_INDEXES = [
  {
    name: "pexelsId_unique",
    key: { pexelsId: 1 },
    unique: true,
    background: true,
  },
  {
    name: "uploadedAt_id_compound",
    key: { uploadedAt: -1, _id: -1 },
    background: true,
  },
] as const;

/**
 * Create MongoDB indexes for videos collection
 *
 * @param db - MongoDB database instance
 */
export async function createVideoIndexes(db: any) {
  const collection = db.collection(VIDEOS_COLLECTION);

  for (const index of VIDEO_INDEXES) {
    const opts: any = {
      name: index.name,
      background: index.background,
    };

    // Only set `unique` when explicitly provided on the index definition.
    // Passing `unique: undefined` can be serialized to `null` by the driver
    // and MongoDB rejects `unique: null`.
    if ("unique" in index) {
      opts.unique = index.unique;
    }

    await collection.createIndex(index.key, opts);
  }

  console.log("✅ Video indexes created successfully");
}
