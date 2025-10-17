"use client";
import React from "react";
import { trpc } from "@/trpc/shared";

export function CommentList({ videoId }: { videoId: string }) {
  const { data: comments, isLoading } = trpc.interactions.getComments.useQuery({ videoId, limit: 50 });

  if (isLoading) return <div>Loading comments...</div>;

  if (!comments || comments.length === 0) return <div className="text-sm text-muted-foreground">No comments yet.</div>;

  return (
    <ul className="space-y-2">
      {comments.map((c: any) => (
        <li key={c._id} className="border rounded p-2">
          <div className="text-sm text-gray-800">{c.content}</div>
          <div className="text-xs text-gray-500">by {c.userId} • {new Date(c.createdAt).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}
