import { getDatabase } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import { Comment, Like, COMMENTS_COLLECTION, LIKES_COLLECTION } from "@/lib/db/models/interactions";

export async function createComment(videoId: string, userId: string, content: string) {
  const db = await getDatabase();
  const doc: any = {
    videoId,
    userId,
    content,
    createdAt: new Date(),
  };
  const res = await db.collection(COMMENTS_COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId.toHexString() } as Comment;
}

export async function getCommentsByVideo(videoId: string, limit = 20, beforeId?: string) {
  const db = await getDatabase();
  const query: any = { videoId };
  if (beforeId) {
    query._id = { $lt: new ObjectId(beforeId) };
  }
  const docs = await db
    .collection(COMMENTS_COLLECTION)
    .find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .toArray();

  return docs.map((d: any) => ({ ...d, _id: d._id.toHexString() } as Comment));
}

export async function deleteComment(commentId: string, userId: string) {
  const db = await getDatabase();
  const res = await db.collection(COMMENTS_COLLECTION).deleteOne({ _id: new ObjectId(commentId), userId });
  return res.deletedCount === 1;
}

export async function createLike(videoId: string, userId: string) {
  const db = await getDatabase();
  const doc: any = { videoId, userId, createdAt: new Date() };
  try {
    const res = await db.collection(LIKES_COLLECTION).insertOne(doc);
    return { ...doc, _id: res.insertedId.toHexString() } as Like;
  } catch (err: any) {
    // Duplicate key => already liked
    if (err?.code === 11000) {
      return null;
    }
    throw err;
  }
}

export async function removeLike(videoId: string, userId: string) {
  const db = await getDatabase();
  const res = await db.collection(LIKES_COLLECTION).deleteOne({ videoId, userId });
  return res.deletedCount === 1;
}

export async function getLikesCount(videoId: string) {
  const db = await getDatabase();
  return db.collection(LIKES_COLLECTION).countDocuments({ videoId });
}

export async function hasUserLiked(videoId: string, userId: string) {
  const db = await getDatabase();
  const doc = await db.collection(LIKES_COLLECTION).findOne({ videoId, userId }, { projection: { _id: 1 } });
  return !!doc;
}
