"use client";
import React, { useState } from "react";
import { trpc } from "@/trpc/shared";

export function CommentForm({ videoId }: { videoId: string }) {
  const [content, setContent] = useState("");
  const utils = trpc.useContext();
  const createComment = trpc.interactions.createComment.useMutation({
    onSuccess() {
      setContent("");
      utils.interactions.getComments.invalidate({ videoId });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment.mutate({ videoId, content: content.trim() });
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={content} onChange={(e) => setContent(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Add a comment" />
      <button disabled={!content.trim()} className="px-3 py-1 bg-blue-600 text-white rounded">Post</button>
    </form>
  );
}
