import { getServerSession } from "next-auth";
import { options } from "@/lib/auth/authOptions";

export async function requireAdmin() {
    const session = await getServerSession(options);
    if (!session?.user || session.user.role !== "ADMIN") {
        return null;
    }

    return session;
}

export async function requireUser() {
    const session = await getServerSession(options);

    if (!session?.user) return null;

    return session;
}
