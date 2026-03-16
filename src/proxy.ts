import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/user") && token.role !== "USER") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
    }


    return NextResponse.next();
}

export const config = {
    matcher: ["/user/:path*", "/admin/:path*"],
};
