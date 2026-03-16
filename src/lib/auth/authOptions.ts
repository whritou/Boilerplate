import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { createEmailToken } from "@/utils/token";
import { sendVerificationEmail } from "@/utils/mail";

export const options: AuthOptions = {
    adapter: PrismaAdapter(prisma),

    providers: [
        GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),

        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },

            async authorize(credentials, req) {
                if (!credentials?.email || !credentials.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) return null;

                const isValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isValid) return null;

                if (!user.emailVerified) {
                    const token = await createEmailToken(user.email);

                    const callbackUrl = req?.body?.callbackUrl || "/";

                    const link =
                        `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify-email` +
                        `?token=${token}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

                    await sendVerificationEmail(user.email, link);

                    throw new Error("EmailNotVerified");
                }

                return user;
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24 * 30,
    },

    jwt: {
        maxAge: 60 * 60 * 24 * 30,
    },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role ?? "USER";
                token.image = (user as any).image;

                token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
                return token;
            }

            if (!token.role) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true },
                });

                token.role = dbUser?.role ?? "USER";
            }

            if (Date.now() >= (token.accessTokenExpires as number)) {
                token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "ADMIN" | "USER";
                session.user.image =
                    (session.user.image || token.image || null) as string | null;
            }

            return session;
        },
    },
};
