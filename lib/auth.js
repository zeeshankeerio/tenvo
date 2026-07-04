import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prismaBase } from "./db";
import { admin, emailOTP, lastLoginMethod, twoFactor, username } from "better-auth/plugins";
import { isValidStoreHandleUsername } from "./auth/store-handle-validator";
import {
    resolveAuthCanonicalBaseURL,
    resolveAuthTrustedOrigins,
    resolveBetterAuthAllowedHosts,
    resolveGoogleOAuthRedirectURI,
} from "./auth/authOrigins";

function resolveBetterAuthSecret() {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (process.env.NODE_ENV === "production") {
        if (!secret || secret.length < 32) {
            throw new Error(
                "BETTER_AUTH_SECRET must be set in production to a random string of at least 32 characters."
            );
        }
        return secret;
    }
    return secret || "dev-only-better-auth-secret-not-for-production";
}

/** Server-side canonical URL for OAuth callbacks and emailed links (no trailing slash). */
function resolveAuthBaseURL() {
    return resolveAuthCanonicalBaseURL();
}

/**
 * Better Auth `baseURL`: a string, or a dynamic config when allowed hosts are configured
 * (env `BETTER_AUTH_ALLOWED_HOSTS` or derived from canonical app URLs).
 * Google `redirectURI` is pinned to the canonical base so mobile/apex mismatches do not break OAuth.
 */
function resolveBetterAuthBaseURLOption() {
    const staticBase = resolveAuthBaseURL();
    const allowedHosts = resolveBetterAuthAllowedHosts();
    if (!allowedHosts?.length) return staticBase;

    return {
        allowedHosts,
        fallback: staticBase || "http://localhost:3000",
        protocol: process.env.NODE_ENV === "production" ? "https" : "auto",
    };
}

const trustedOrigins = resolveAuthTrustedOrigins();
const googleRedirectURI = resolveGoogleOAuthRedirectURI();

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleOAuthEnabled = Boolean(googleClientId && googleClientSecret);

// Singleton pattern — one BetterAuth instance per process.
// Uses Prisma **without** tenant query extension so auth tables are never auto-filtered.
const globalForAuth = global;

const auth = globalForAuth.auth ?? betterAuth({
    baseURL: resolveBetterAuthBaseURLOption(),
    trustedOrigins,
    database: prismaAdapter(prismaBase, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    secret: resolveBetterAuthSecret(),
    ...(googleOAuthEnabled
        ? {
              socialProviders: {
                  google: {
                      clientId: googleClientId,
                      clientSecret: googleClientSecret,
                      prompt: "select_account",
                      ...(googleRedirectURI ? { redirectURI: googleRedirectURI } : {}),
                  },
              },
          }
        : {}),
    ...(process.env.NODE_ENV === "production"
        ? {
              advanced: {
                  defaultCookieAttributes: {
                      secure: true,
                      sameSite: "lax",
                  },
              },
          }
        : {}),
    plugins: [
        admin(),
        username({
            // Registration uses URL-style slugs (hyphens); Better Auth default allows only [a-zA-Z0-9_.]
            minUsernameLength: 3,
            maxUsernameLength: 63,
            usernameValidator: (u) => isValidStoreHandleUsername(u),
        }),
        twoFactor(),
        lastLoginMethod({
            storeInDatabase: true
        }),
        emailOTP({
            otpLength: 6,
            expiresIn: 600,
            async sendVerificationOTP({ email, otp, type }) {
                const { sendAuthOtpEmail } = await import("@/lib/auth/sendAuthOtpEmail.jsx");
                await sendAuthOtpEmail({ email, otp, type });
            },
        }),
    ]
});

// Cache in all environments — module cache handles this in production,
// but the explicit global guard prevents duplicate instances during hot-reload in dev.
globalForAuth.auth = auth;

export { auth };
