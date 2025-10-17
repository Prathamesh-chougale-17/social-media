import { router, publicProcedure, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import {
  createComment,
  getCommentsByVideo,
  deleteComment,
  createLike,
  removeLike,
  getLikesCount,
  hasUserLiked,
} from "@/lib/db/queries/interactions";

export const interactionsRouter = router({
  getComments: publicProcedure
    .input(z.object({ videoId: z.string(), limit: z.number().optional(), beforeId: z.string().optional() }))
    .query(async ({ input }) => {
      const comments = await getCommentsByVideo(input.videoId, input.limit ?? 20, input.beforeId);
      return comments;
    }),

  createComment: protectedProcedure
    .input(z.object({ videoId: z.string(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId!;
      const authorName = ctx.userName;
      const comment = await createComment(input.videoId, userId, input.content, authorName);
      return comment;
    }),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId!;
      const ok = await deleteComment(input.commentId, userId);
      return { success: ok };
    }),

  like: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId!;
      const like = await createLike(input.videoId, userId);
      return like;
    }),

  unlike: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId!;
      const ok = await removeLike(input.videoId, userId);
      return { success: ok };
    }),

  likesCount: publicProcedure.input(z.object({ videoId: z.string() })).query(async ({ input }) => {
    return { count: await getLikesCount(input.videoId) };
  }),

  hasLiked: publicProcedure.input(z.object({ videoId: z.string(), userId: z.string().optional() })).query(async ({ input }) => {
    if (!input.userId) return { liked: false };
    return { liked: await hasUserLiked(input.videoId, input.userId) };
  }),
});
