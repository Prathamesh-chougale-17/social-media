import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { magicLink, admin as adminPlugin } from "better-auth/plugins";
import { sendEmail } from "./email";
import client from "./mongo";
import { ac, roles } from "./permissions";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('Invalid/Missing environment variable: "BETTER_AUTH_SECRET"');
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error('Invalid/Missing environment variable: "BETTER_AUTH_URL"');
}

// Ensure Google env vars exist when enabling social provider
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Invalid/Missing environment variable: "GOOGLE_CLIENT_ID"');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    'Invalid/Missing environment variable: "GOOGLE_CLIENT_SECRET"',
  );
}

export const auth = betterAuth({
  database: mongodbAdapter(client.db("oauth"), {
    client,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Require email verification before login
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Hello ${user.name || "there"},</p>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <a href="${url}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
          </div>
        `,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${user.name || "there"},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <a href="${url}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
  },
  socialProviders: {
    // Google social provider configuration
    // See https://www.better-auth.com/docs/authentication/google for options
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Recommended options to always obtain a refresh token on first consent:
      accessType: "offline",
      prompt: "select_account consent",
      // You can add additional provider-specific options here if needed
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }, request) => {
        await sendEmail({
          to: email,
          subject: "Your magic sign-in link",
          text: `Click the link to sign in: ${url}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Magic Sign-In Link</h2>
              <p>Hello,</p>
              <p>Click the button below to sign in to your account:</p>
              <a href="${url}" style="display: inline-block; background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Sign In</a>
              <p>This link will expire in 5 minutes.</p>
              <p>If you didn't request this link, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    }),
    // Admin plugin for role-based user management (roles: user, organiser, admin)
    adminPlugin({
      // Access controller and role definitions from lib/permissions.ts
      ac,
      roles,
      // Default role assigned to newly created users
      defaultRole: "user",
      // Roles considered admin roles (can perform admin operations)
      adminRoles: ["admin"],
      // Optional: list of user IDs to always treat as admins
      adminUserIds: [],
      // Impersonation session duration (seconds), default to 1 hour
      impersonationSessionDuration: 60 * 60,
      // Default ban configuration
      defaultBanReason: "No reason",
      defaultBanExpiresIn: undefined,
      bannedUserMessage:
        "You have been banned from this application. Please contact support if you believe this is an error.",
    }),
    nextCookies(), // This should be the last plugin
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL],
});
