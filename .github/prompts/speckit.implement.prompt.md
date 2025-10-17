---
description: Implementation guide for social media platform features following tRPC, Next.js, TypeScript, MongoDB architecture.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This prompt guides implementation of features for the social media platform. It bridges the gap between feature specification (from `/speckit.specify`) and actual code.

**Prerequisites**: You have a completed specification from `/speckit.specify` and a detailed implementation plan from `/speckit.plan`.

**Your responsibility**: Code implementation that strictly follows:
1. Constitution principles (`.specify/memory/constitution.md`) - 10 Core Principles
2. Architecture patterns (see below and in `speckit.social-media-implementation.prompt.md`)
3. Type safety (TypeScript strict mode, no `any` types)
4. Testing standards (unit + E2E)

**10 Core Principles from Constitution**:
1. **Type Safety & DX** - Strict TypeScript, no `any` types
2. **Server Components** - Next.js App Router + server components by default
3. **tRPC-First Data** - All data via tRPC procedures, never direct MongoDB
4. **URL State (Nuqs)** - Filters, pagination, search in URL parameters
5. **TanStack Query** - Client-side caching + optimistic updates
6. **Forms (RHF + Zod)** - Client validation + server-side schema check
7. **Component Composition** - Shadcn/ui + Kibo UI, compose don't duplicate
8. **MongoDB Schemas** - Typed collections, explicit indexes
9. **Pexels Content** - API sync service, no direct client access
10. **Auth in tRPC Context** - Every mutation checks `ctx.userId` first

Reference files:
- `.specify/memory/constitution.md` - Complete constitution with detailed principles
- `QUICK_REFERENCE.md` - Quick lookup for patterns and rules
- `SPECIFICATION.md` - Project architecture and database schema
- `.github/prompts/speckit.social-media-implementation.prompt.md` - Implementation patterns

### Architecture Patterns for This Platform

#### Pattern 1: Server Component with Prefetch + Client Infinite Query

**When to use**: List pages (feed, user profile videos, saved videos)

**Structure**:
```typescript
// app/(videos)/page.tsx — Server component
import { HydrateClient, trpc } from '@/trpc/server';
import { InfiniteVideoList } from '@/components/videos/infinite-video-list';

export default async function VideosPage() {
  // Prefetch initial data on server
  void await trpc.videos.getInfinite.prefetchInfinite({ limit: 10 });
  
  return (
    <HydrateClient>
      <InfiniteVideoList />
    </HydrateClient>
  );
}
```

```typescript
// components/videos/infinite-video-list.tsx — Client component
'use client';
import { trpc } from '@/trpc/client';
import { useInfiniteQuery } from '@tanstack/react-query';

export function InfiniteVideoList() {
  const { data, fetchNextPage, hasNextPage, isFetching } = 
    trpc.videos.getInfinite.useInfiniteQuery(
      { limit: 10 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );
  
  // Render logic
}
```

**Key points**:
- Server component does `void await prefetchInfinite()` (don't wait, just queue)
- HydrateClient serializes initial data to client
- Client component uses `useInfiniteQuery` hook
- Nuqs syncs cursor to URL if needed

#### Pattern 2: Server Component + Detail Query

**When to use**: Detail pages (video detail, user profile)

**Structure**:
```typescript
// app/(videos)/[videoId]/page.tsx — Server component
import { HydrateClient, trpc } from '@/trpc/server';
import { notFound } from 'next/navigation';
import { VideoDetail } from '@/components/videos/video-detail';

export default async function VideoDetailPage({
  params: { videoId },
}: {
  params: { videoId: string };
}) {
  // Fetch on server with error handling
  const video = await trpc.videos.getById.query({ id: videoId });
  
  if (!video) {
    notFound(); // 404 page
  }
  
  // Prefetch related data
  void await trpc.interactions.getComments.prefetchInfinite({
    videoId,
    limit: 10,
  });
  
  return (
    <HydrateClient>
      <VideoDetail videoId={videoId} />
    </HydrateClient>
  );
}
```

**Key points**:
- Await query (not prefetch) so page can use data for metadata, 404 check
- HydrateClient + prefetch for related queries
- Client component queries for real-time updates
- Server ensures video exists before rendering

#### Pattern 3: Mutation with Optimistic Update + TanStack Query

**When to use**: Like, comment, save, follow buttons

**Structure**:
```typescript
// components/interactions/like-button.tsx — Client component
'use client';
import { trpc } from '@/trpc/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function LikeButton({ videoId }: { videoId: string }) {
  const queryClient = useQueryClient();
  const [isOptimistic, setIsOptimistic] = useState(false);
  
  const likeMutation = trpc.interactions.addLike.useMutation({
    onMutate: async () => {
      setIsOptimistic(true);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['videos', videoId] 
      });
      
      // Snapshot previous state
      const previous = queryClient.getQueryData(['videos', videoId]);
      
      // Update cache optimistically
      queryClient.setQueryData(['videos', videoId], (old: any) => ({
        ...old,
        likeCount: old.likeCount + 1,
        isLiked: true,
      }));
      
      return { previous };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['videos', videoId], context.previous);
      }
      setIsOptimistic(false);
    },
    onSuccess: () => {
      // Refetch to get server truth
      queryClient.invalidateQueries({ queryKey: ['videos', videoId] });
      setIsOptimistic(false);
    },
  });
  
  return (
    <button onClick={() => likeMutation.mutate({ videoId })}>
      {isOptimistic ? '...' : '❤️'}
    </button>
  );
}
```

**Key points**:
- `onMutate`: Optimistic update BEFORE server call
- `onError`: Rollback if mutation fails
- `onSuccess`: Invalidate query to refetch server truth
- State tracks optimistic UI (loading spinner, visual feedback)

#### Pattern 4: Form with React Hook Form + Zod + tRPC Mutation

**When to use**: Comment form, profile edit, search form

**Structure**:
```typescript
// components/forms/comment-form.tsx — Client component
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormItem, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/trpc/client';
import { useQueryClient } from '@tanstack/react-query';

const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment required')
    .max(500, 'Max 500 characters'),
});

type CommentInput = z.infer<typeof commentSchema>;

export function CommentForm({ videoId }: { videoId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<CommentInput>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });
  
  const addComment = trpc.interactions.addComment.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['interactions', 'comments', videoId],
      });
      form.reset();
    },
    onError: (error) => {
      form.setError('content', {
        type: 'server',
        message: error.message,
      });
    },
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => 
        addComment.mutate({ videoId, ...data })
      )}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Add a comment..."
                  disabled={addComment.isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={addComment.isPending}>
          Comment
        </Button>
      </form>
    </Form>
  );
}
```

**Key points**:
- Zod schema for client + server validation
- RHF integrates with shadcn/ui Form component
- Server error flows back through `form.setError()`
- Reset form on success

### Key Implementation Rules

#### Rule 1: No `any` Type

```typescript
// ✗ BAD
const video: any = await fetchVideo();

// ✓ GOOD
const video = await trpc.videos.getById.query({ id: videoId });
// Type inferred from tRPC procedure output
```

#### Rule 2: All Data Access via tRPC

```typescript
// ✗ BAD — Direct MongoDB access from component
import client from '@/lib/mongo';
const videos = await client.db().collection('videos').find({}).toArray();

// ✓ GOOD — Via tRPC procedure
const { data: videos } = trpc.videos.getInfinite.useQuery();
```

#### Rule 3: Authorization in tRPC Context, Not Components

```typescript
// ✗ BAD — Authorization in component
if (user?.id === videoId.split('_')[0]) { // What?! Security issue
  allowDelete();
}

// ✓ GOOD — tRPC procedure checks context
// trpc/routers/interactions.ts
deleteComment: procedure.input(z.object({ commentId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    // Backend confirms user owns comment
    const comment = await db.interactions.findOne({ _id: input.commentId });
    if (comment.userId.toString() !== ctx.userId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    // Delete
  }),
```

#### Rule 4: URL State via Nuqs

```typescript
// ✗ BAD — State only in React state
const [page, setPage] = useState(1);

// ✓ GOOD — URL state with Nuqs
'use client';
import { useSearchParam } from 'nuqs';

export function VideoFeed() {
  const [page, setPage] = useSearchParam('page');
  // Now URL is ?page=2, shareable and bookmarkable
}
```

#### Rule 5: Component Composition, Not Duplication

```typescript
// ✗ BAD — Duplicating shadcn/ui Button with custom styles
export function LikeButton() {
  return <button className="rounded-full bg-red-500...">❤️</button>;
}

// ✓ GOOD — Compose shadcn/ui Button
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export function LikeButton() {
  return (
    <Button variant="ghost" size="sm">
      <Heart className="w-4 h-4" />
    </Button>
  );
}
```

#### Rule 6: Server Components by Default

```typescript
// ✗ BAD — Client component for server-only data fetching
'use client';
export function VideoFeed() {
  const [videos, setVideos] = useState([]);
  useEffect(() => {
    fetch('/api/videos').then(r => r.json()).then(setVideos);
  }, []);
  return <div>{videos.map(...)}</div>;
}

// ✓ GOOD — Server component with tRPC prefetch
import { HydrateClient, trpc } from '@/trpc/server';
import { InfiniteVideoList } from '@/components/videos/infinite-video-list';

export default async function VideoFeed() {
  void await trpc.videos.getInfinite.prefetchInfinite({ limit: 10 });
  return (
    <HydrateClient>
      <InfiniteVideoList />
    </HydrateClient>
  );
}
```

### Development Workflow

1. **Start with spec** (from `/speckit.specify`)
   - Know WHAT user needs
   - Know acceptance criteria
   - Know functional requirements

2. **Create tRPC procedures** first (types first)
   - Input: Zod schema
   - Output: Zod schema or TypeScript interface
   - Authorization checks in context
   - No implementation until types are clear

3. **Write tests** for procedures
   - Happy path (valid input)
   - Error case (permission denied, validation error)
   - Edge case (empty list, duplicate record)

4. **Build components** (small → large)
   - Single buttons (LikeButton, SaveButton)
   - Forms (CommentForm, SearchForm)
   - Cards (VideoCard, UserCard)
   - Lists (CommentList, VideoFeed)
   - Pages (VideoDetail, UserProfile)

5. **Integrate with server components**
   - Prefetch data on server
   - Use HydrateClient for client-side queries
   - Nuqs for URL state

6. **Test user flow** (E2E)
   - User views video
   - User likes video
   - User comments on video
   - Comment appears in feed

### File Naming Conventions

- **Components**: PascalCase, match export name
  - `components/videos/VideoCard.tsx` exports `VideoCard`
  - `components/videos/VideoPlayer.tsx` exports `VideoPlayer`

- **Hooks**: camelCase with `use` prefix
  - `hooks/useVideos.ts` exports `useVideos`
  - `hooks/usePagination.ts` exports `usePagination`

- **Utils**: camelCase, descriptive noun
  - `lib/utils.ts` exports utility functions
  - `lib/pexels-client.ts` exports `PexelsClient`

- **Routers**: camelCase, plural noun
  - `trpc/routers/videos.ts` exports `videosRouter`
  - `trpc/routers/interactions.ts` exports `interactionsRouter`

- **Types**: PascalCase, in `types/` or co-located
  - `types/models.ts` exports `Video`, `User`, `Interaction`
  - Or in `app/(videos)/types.ts` if route-specific

### When to Use Client vs Server Components

| Scenario | Use |
|----------|-----|
| Initial data fetch for page | Server component with tRPC prefetch |
| Interactive form submission | Client component with useMutation |
| Real-time updates (optional) | Client component with useQuery polling |
| Authorization check | Server component before rendering |
| User interaction feedback | Client component |
| Initial page SEO data | Server component |
| Infinite scroll | Client component with useInfiniteQuery |
| Search filters (URL state) | Client component with Nuqs |

### Testing Expectations

**Every new feature ships with**:
1. **Type coverage**: TypeScript compiles, no `any` types
2. **Happy path**: Feature works as documented in spec
3. **Error case**: Proper error handling + user feedback
4. **Authorization**: Only authorized users can perform action

**Example test**:
```typescript
// Like button: user can like, cannot unlike if not author, sees like count
describe('LikeButton', () => {
  test('user can like video', async () => {
    const { user } = await createTestUser();
    const video = await createTestVideo();
    
    // Like
    const button = screen.getByRole('button', { name: /like/i });
    await user.click(button);
    
    // Verify mutation called
    expect(trpc.interactions.addLike).toHaveBeenCalledWith({ videoId: video._id });
  });
  
  test('user sees error if unauthorized', async () => {
    // No user logged in
    const button = screen.getByRole('button', { name: /like/i });
    await user.click(button);
    
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
```

---

**Reference**: This prompt assumes you have:
- Constitution at `.specify/memory/constitution.md`
- Specification from previous `/speckit.specify` command
- Implementation plan from previous `/speckit.plan` command
