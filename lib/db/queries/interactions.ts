import { getDatabase } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import { Comment, Like, COMMENTS_COLLECTION, LIKES_COLLECTION } from "@/lib/db/models/interactions";

export async function createComment(videoId: string, userId: string, content: string, authorName?: string) {
  const db = await getDatabase();
  const doc: any = {
    videoId,
    userId,
    content,
    authorName,
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
  
  // Aggregate to join with user data from better-auth
  const comments = await db
    .collection(COMMENTS_COLLECTION)
    .aggregate([
      { $match: query },
      { $sort: { _id: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "user", // better-auth stores users in 'user' collection
          localField: "userId",
          foreignField: "id",
          as: "userInfo",
        },
      },
      {
        $project: {
          _id: 1,
          videoId: 1,
          userId: 1,
          content: 1,
          authorName: 1,
          createdAt: 1,
          userName: { $arrayElemAt: ["$userInfo.name", 0] },
          userImage: { $arrayElemAt: ["$userInfo.image", 0] },
        },
      },
    ])
    .toArray();

  return comments.map((d: any) => ({ 
    ...d, 
    _id: d._id.toHexString(),
    // Use userName from joined data if available, fallback to authorName
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
