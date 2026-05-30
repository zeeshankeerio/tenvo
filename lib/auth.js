import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prismaBase } from "./db";
import { admin, lastLoginMethod, twoFactor, username } from "better-auth/plugins";

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

// Singleton pattern — one BetterAuth instance per process.
// Uses Prisma **without** tenant query extension so auth tables are never auto-filtered.
const globalForAuth = global;

const auth = globalForAuth.auth ?? betterAuth({
    database: prismaAdapter(prismaBase, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    secret: resolveBetterAuthSecret(),
    plugins: [
        admin(),
        username(),
        twoFactor(),
        lastLoginMethod({
            storeInDatabase: true
        })
    ]
});

// Cache in all environments — module cache handles this in production,
// but the explicit global guard prevents duplicate instances during hot-reload in dev.
globalForAuth.auth = auth;

export { auth };
