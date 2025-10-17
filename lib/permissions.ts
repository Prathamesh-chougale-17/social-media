/**
 * better-auth-role/lib/permissions.ts
 *
 * Access control and role definitions for the Admin plugin (Better Auth).
 *
 * This file:
 * - Creates an Access Control instance using the `createAccessControl` helper.
 * - Declares the set of resources and their possible actions (the `statement`).
 * - Creates three roles: `user`, `organiser`, and `admin`.
 * - Exports the access controller and the roles object for use in both server
 *   and client configuration (see Better Auth admin plugin docs).
 *
 * Notes:
 * - The `statement` object is defined `as const` so TypeScript can infer literal
 *   permission types for stronger type-safety.
 * - Adjust resources/actions in `statement` to match the needs of your app.
 */

import { createAccessControl } from "better-auth/plugins/access";

/**
 * Define resources and the actions available for each resource.
 *
 * Add/remove resources or actions here as your app requires.
 */
export const statement = {
  // Example resource representing projects or similar entities
  project: ["create", "share", "update", "delete"] as const,

  // Example resource representing events/meetups/organiser-managed items
  event: ["create", "update", "delete", "publish"] as const,

  // User management operations (admin operations mostly)
  user: [
    "create", // create user (admin API)
    "list", // list users
    "set-role", // change role for a user
    "ban", // ban a user
    "impersonate", // impersonate a user
    "delete", // hard-delete a user
    "set-password", // set user password via admin
  ] as const,

  // Session-related operations
  session: ["list", "revoke", "delete"] as const,
} as const;

/**
 * Create the access controller.
 *
 * The access controller exposes helpers to create roles and check permissions.
 */
export const ac = createAccessControl(statement);

/**
 * Role definitions
 *
 * - `user`: default, minimal permissions (end-users).
 * - `organiser`: can manage events and related resources (higher privileges than user).
 * - `admin`: full control across resources (used by Better Auth admin plugin).
 *
 * Each role is created using `ac.newRole(...)` and describes the allowed actions
 * on each resource. You can provide a subset of resource-action mappings; missing
 * resources will be treated as empty for that role.
 *
 * Note: Roles may be passed to the admin plugin on both server and client:
 *   adminPlugin({ ac, roles: { admin, organiser, user } })
 */
export const user = ac.newRole({
  project: ["create"], // user can create projects by default
  event: [], // cannot create/manage events by default
  user: [], // no admin user management permissions
  session: [], // cannot manage sessions
});

export const organiser = ac.newRole({
  project: ["create", "update"], // organiser can create and update projects
  event: ["create", "update", "publish"], // manage events
  user: [], // no user management
  session: [], // no session management
});

export const admin = ac.newRole({
  // Admin gets broad permissions across resources. Grant everything from statement.
  project: [...statement.project],
  event: [...statement.event],
  user: [...statement.user],
  session: [...statement.session],
});

/**
 * Export roles as a single object for convenience when wiring the admin plugin.
 *
 * Example usage in your `lib/auth.ts` when configuring the admin plugin:
 *
 *   import { ac, admin, user, organiser } from "@/lib/permissions";
 *   ...
 *   plugins: [ adminPlugin({ ac, roles: { admin, user, organiser } }) ]
 */
export const roles = {
  user,
  organiser,
  admin,
};

// Compatibility exports for consumers that expect `defaultStatements` and `adminAc`
// from the admin plugin. If the Better Auth package provides these, consumers
// should import them from that package; however, to improve compatibility we
// export reasonable fallbacks here.
//
// - `defaultStatements` falls back to the local `statement` defined above.
// - `adminAc` falls back to a minimal object that contains `statements` so
//    code that reads `adminAc.statements` will continue to work.
export const defaultStatements = statement;
export const adminAc = { statements: statement } as const;

export default {
  statement,
  ac,
  roles,
  defaultStatements,
  adminAc,
};
