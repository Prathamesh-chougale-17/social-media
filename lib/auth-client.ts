import * as clientPlugins from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Build plugin list dynamically and defensively:
 * - Include the magic link plugin if present.
 * - Include the admin client plugin if present.
 * - Try to detect a social/oauth plugin under several possible export names:
 *   `socialClient`, `oauthClient`, or `social`. If found, include it.
 *
 * This lets the client work even if a particular plugin export isn't available
 * in the installed version of `better-auth/client/plugins`.
 */
const pluginList: Array<any> = [];

// Magic link plugin (if available)
if (typeof clientPlugins.magicLinkClient === "function") {
  try {
    pluginList.push(clientPlugins.magicLinkClient());
  } catch {
    // ignore plugin initialization errors
  }
}

// Admin client plugin (if available) - include defensively
const adminClientFactory = (clientPlugins as any).adminClient;
if (typeof adminClientFactory === "function") {
  try {
    // Try to initialize without args; if your app requires `ac`/`roles`
    // on the client, you can pass them here. We keep this defensive so
    // the client doesn't fail when the plugin isn't present or requires
    // different parameters.
    pluginList.push(adminClientFactory());
  } catch {
    // skip admin client if initialization fails
  }
}

// Social / OAuth plugin (if available under various export names)
const socialPluginFactory =
  (clientPlugins as any).socialClient ??
  (clientPlugins as any).oauthClient ??
  (clientPlugins as any).social;

if (typeof socialPluginFactory === "function") {
  try {
    pluginList.push(socialPluginFactory());
  } catch {
    // If initializing the social plugin throws for any reason, skip it to
    // avoid breaking the client initialization. The app can still use
    // server-side social configuration and the `signIn.social` client API.
  }
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: pluginList,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  changePassword,
  resetPassword,
  sendVerificationEmail,
} = authClient;
