import { getServerSession } from "next-auth";
import { options } from "@/lib/auth/authOptions";

export async function getSessionUser() {
    const session = await getServerSession(options);
    return session?.user ?? null;
}