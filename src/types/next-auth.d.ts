import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
    interface User extends DefaultUser {
        role: "ADMIN" | "USER";
    }
    interface Session extends DefaultSession {
        user: DefaultSession["user"] & { id: string; role: "ADMIN" | "USER" };
    }
}

declare module "next-auth/jwt" {
    interface JWT { id: string; role: "ADMIN" | "USER"; }
}