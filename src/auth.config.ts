import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isOnProfile = nextUrl.pathname.startsWith("/profile");
            const isOnRoot = nextUrl.pathname === "/";

            if (isLoggedIn) {
                if (nextUrl.pathname === "/login" || isOnRoot) {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }
                return true;
            }

            if (isOnDashboard || isOnProfile || isOnRoot) {
                return false;
            }
            return true;
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
