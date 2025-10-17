import { getDatabase } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import { Comment, Like, COMMENTS_COLLECTION, LIKES_COLLECTION } from "@/lib/db/models/interactions";

export async function createComment(videoId: string, userId: string, content: string, authorName?: string, userImage?: string | null) {
  const db = await getDatabase();
  
  // Use the provided authorName and userImage from the session
  // If not provided, try to fetch from user collection (fallback for old sessions)
  let userName = authorName;
  let avatar = userImage;
  
  if (!userName) {
    // Fallback: try to fetch user by session userId
    const user = await db.collection("user").findOne({ id: userId });
    if (user) {
      userName = user.name;
      avatar = user.image;
    }
  }
  
  const doc: any = {
    videoId,
    userId,
    content,
    authorName: userName || "Anonymous",
    userName: userName || "Anonymous",
    userImage: avatar || null,
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
  
  // Fetch comments with user data already stored
  const comments = await db
    .collection(COMMENTS_COLLECTION)
    .find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .toArray();

  return comments.map((d: any) => ({ 
    ...d, 
    _id: d._id.toHexString(),
    userName: d.userName || d.authorName || "Anonymous",
    userImage: d.userImage || null,
  }));
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

export async function getCommentsCount(videoId: string) {
  const db = await getDatabase();
  return db.collection(COMMENTS_COLLECTION).countDocuments({ videoId });
}

// Bookmarks collection
const BOOKMARKS_COLLECTION = "bookmarks";

export async function createBookmark(videoId: string, userId: string) {
  const db = await getDatabase();
  const doc: any = { videoId, userId, createdAt: new Date() };
  try {
    const res = await db.collection(BOOKMARKS_COLLECTION).insertOne(doc);
    return { ...doc, _id: res.insertedId.toHexString() };
  } catch (err: any) {
    // Duplicate key => already bookmarked
    if (err?.code === 11000) {
      return null;
    }
    throw err;
  }
}

export async function removeBookmark(videoId: string, userId: string) {
  const db = await getDatabase();
  const res = await db.collection(BOOKMARKS_COLLECTION).deleteOne({ videoId, userId });
  return res.deletedCount === 1;
}

export async function hasUserBookmarked(videoId: string, userId: string) {
  const db = await getDatabase();
  const doc = await db.collection(BOOKMARKS_COLLECTION).findOne({ videoId, userId }, { projection: { _id: 1 } });
  return !!doc;
}
