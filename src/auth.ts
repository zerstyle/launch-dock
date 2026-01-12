import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { z } from "zod";

import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                if (!user.email) return false;

                console.log("[SignIn Check] Attempting login with:", user.email);

                // Whitelist Check: Only allow users that already exist in DB
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email },
                });

                console.log("[SignIn Check] DB Lookup Result:", existingUser);

                if (!existingUser) {
                    console.log("Access Denied: Email not registered by admin");
                    return false; // Or throw Error("Access Denied")
                }

                return true;
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                // When logging in, verify user exists in DB to get the internal ID
                // (Already checked in signIn, but we need the ID here)
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                });

                if (dbUser) {
                    token.id = dbUser.id;
                    token.email = dbUser.email;
                    token.name = dbUser.username || dbUser.email?.split('@')[0];
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.AUTH_SECRET,
});
