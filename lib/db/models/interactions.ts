import { z } from "zod";
import type { ObjectId } from "mongodb";

export const CommentSchema = z.object({
  _id: z.string().optional(),
  videoId: z.string(),
  userId: z.string(),
  content: z.string().min(1).max(2000),
  createdAt: z.date().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const COMMENTS_COLLECTION = "comments";

export const COMMENT_INDEXES = [
  { name: "videoId_index", key: { videoId: 1 }, background: true },
  { name: "userId_index", key: { userId: 1 }, background: true },
  { name: "video_user_compound", key: { videoId: 1, _id: -1 }, background: true },
] as const;

export const LikeSchema = z.object({
  _id: z.string().optional(),
  videoId: z.string(),
  userId: z.string(),
  createdAt: z.date().optional(),
});

export type Like = z.infer<typeof LikeSchema>;

export const LIKES_COLLECTION = "likes";

export const LIKE_INDEXES = [
  { name: "like_video_index", key: { videoId: 1 }, background: true },
  { name: "like_user_index", key: { userId: 1 }, background: true },
  // Prevent duplicate likes per user+video
  { name: "like_unique_user_video", key: { videoId: 1, userId: 1 }, unique: true, background: true },
] as const;

export async function createInteractionIndexes(db: any) {
  const comments = db.collection(COMMENTS_COLLECTION);
  const likes = db.collection(LIKES_COLLECTION);

  for (const idx of COMMENT_INDEXES) {
    const opts: any = { name: idx.name, background: idx.background };
    await comments.createIndex(idx.key, opts);
  }

  for (const idx of LIKE_INDEXES) {
    const opts: any = { name: idx.name, background: idx.background };
    if ("unique" in idx) opts.unique = (idx as any).unique;
    await likes.createIndex(idx.key, opts);
  }

  console.log("✅ Interaction indexes created successfully");
}
