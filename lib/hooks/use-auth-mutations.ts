import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import type {
  SignInFormData,
  SignUpFormData,
  MagicLinkFormData,
} from "@/lib/validations/auth";

/**
 * Core auth mutations (signup/signin/magic link)
 * (unchanged behavior; kept here for context)
 */
export function useSignUp() {
  return useMutation({
    mutationFn: async (data: SignUpFormData) => {
      const result = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error(
          result.error.message || "Failed to create account. Please try again.",
        );
      }

      return result;
    },
  });
}

export function useSignIn() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: SignInFormData) => {
      const result = await (authClient.signIn as any).email({
        email: data.email,
        password: data.password,
        callbackURL: "/",
      });

      if (result.error) {
        if (result.error.status === 403) {
          throw new Error(
            "Please verify your email address before signing in. Check your inbox for the verification link.",
          );
        }
        throw new Error(
          result.error.message ||
            "Failed to sign in. Please check your credentials.",
        );
      }

      return result;
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });
}

export function useMagicLink() {
  return useMutation({
    mutationFn: async (data: MagicLinkFormData) => {
      const result = await (authClient.signIn as any).magicLink({
        email: data.email,
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to send magic link.");
      }

      return result;
    },
  });
}

/**
 * Social sign-in mutation (Google).
 *
 * Usage:
 *  const googleSignIn = useSocialSignIn();
 *  googleSignIn.mutate(); // will initiate redirect-based OAuth flow
 *
 * Alternatively, to sign in with an ID token obtained client-side:
 *  googleSignIn.mutate({ idToken: { token: '...', accessToken: '...' } })
 *
 * Notes:
 *  - This uses `authClient.signIn.social` as described in the Better Auth docs.
 *  - If `idToken` is provided the client may attempt a direct sign-in without redirect.
 *  - On success the user is redirected to "/" (same behavior as email sign-in).
 */
export function useSocialSignIn(provider: string = "google") {
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload?: {
      callbackURL?: string;
      idToken?: { token: string; accessToken?: string };
      prompt?: string;
      scopes?: string[];
    }) => {
      // Build request object for the client method
      const req: any = { provider };

      if (payload?.idToken) {
        // When an ID token is provided, Better Auth may sign in directly
        req.idToken = payload.idToken;
      }

      if (payload?.callbackURL) {
        req.callbackURL = payload.callbackURL;
      } else {
        req.callbackURL = "/";
      }

      if (payload?.prompt) {
        req.prompt = payload.prompt;
      }

      if (payload?.scopes) {
        req.scopes = payload.scopes;
      }

      const result = await (authClient.signIn as any).social(req);

      if (result.error) {
        throw new Error(
          result.error.message || `Failed to sign in with ${provider}.`,
        );
      }

      return result;
    },
    onSuccess: () => {
      // Redirect to home after successful sign-in
      router.push("/");
      router.refresh();
    },
  });
}

/**
 * Admin client wrappers
 *
 * These helpers use the Admin plugin client if available on `authClient.admin`.
 * - useListUsers: a React Query wrapper to list users (supports query params).
 * - useSetUserRole: a mutation to set a user's role (admin-only).
 *
 * Both are defensive: if the admin client isn't available, they throw an error
 * so calling code can handle/report the misconfiguration.
 */

/**
 * useListUsers
 * Params:
 *  - queryOptions: object passed to the admin.listUsers() client method (if any)
 *
 * Returns:
 *  - useQuery result with { users, total, limit, offset } per admin.listUsers response
 */
export function useListUsers(
  queryParams?: Record<string, unknown>,
  enabled = true,
) {
  // create a stable query key
  const key = ["admin", "listUsers", queryParams ?? {}];

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const adminClient = (authClient as any).admin;
      if (!adminClient || typeof adminClient.listUsers !== "function") {
        throw new Error(
          "Admin client not available. Ensure the admin plugin is configured on the auth server and the admin client plugin is included.",
        );
      }

      // Some client implementations expect the params wrapped in `query` property
      // or passed directly. Try both defensively.
      try {
        // Preferred: pass as { query: { ... } }
        const res = await adminClient.listUsers({ query: queryParams || {} });
        return res;
      } catch (err) {
        // Fallback: pass params directly
        const res = await adminClient.listUsers(queryParams || {});
        return res;
      }
    },
    // Only run if explicitly enabled
    enabled,
    // Set sensible stale time; callers can override via options if needed
    staleTime: 60 * 1000,
  });
}

/**
 * useSetUserRole
 * Mutation to change a user's role (admin operation).
 *
 * Example:
 *   const mutation = useSetUserRole();
 *   mutation.mutate({ userId: 'abc', role: 'organiser' });
 */
export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      role: string | string[];
    }) => {
      const adminClient = (authClient as any).admin;
      if (!adminClient || typeof adminClient.setRole !== "function") {
        throw new Error(
          "Admin client not available. Ensure the admin plugin is configured on the auth server and the admin client plugin is included.",
        );
      }

      // server-side client often expects a body wrapper
      try {
        const res = await adminClient.setRole({ body: payload });
        if (res?.error) {
          throw new Error(res.error.message || "Failed to set role");
        }
        return res;
      } catch (err) {
        // fallback attempt: pass payload directly
        const res = await adminClient.setRole(payload as any);
        if (res?.error) {
          throw new Error(res.error.message || "Failed to set role");
        }
        return res;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries so UI updates (e.g. user list)
      queryClient.invalidateQueries({ queryKey: ["admin", "listUsers"] });
    },
  });
}
