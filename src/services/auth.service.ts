import crypto from "crypto"
import bcrypt from "bcryptjs"
import { encode } from "next-auth/jwt"
import { User } from "@prisma/client"

import { prisma } from "@/lib/db/prisma"
import { BadRequestError, NotFoundError } from "@/utils/errors"


type SessionPayload = Pick<User, "id" | "email" | "name" | "image" | "role">

interface SessionResult {
    token: string
    cookieOptions: {
        httpOnly: boolean
        secure: boolean
        path: string
        maxAge: number
        sameSite: "lax" | "strict" | "none"
    }
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 jours
const EMAIL_TOKEN_TTL = 15 * 60 * 1000 // 15 minutes

export class AuthService {

    /**
     * Crée un JWT signé + options cookie — utilisé par toutes les routes
     * qui doivent connecter l'utilisateur automatiquement.
     */
    async createSession(user: SessionPayload): Promise<SessionResult> {
        const token = await encode({
            secret: process.env.NEXTAUTH_SECRET!,
            maxAge: SESSION_MAX_AGE,
            token: {
                sub: user.id,
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
            },
        })

        return {
            token,
            cookieOptions: {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: SESSION_MAX_AGE,
                sameSite: "lax",
            },
        }
    }

    /**
     * Génère un token aléatoire, le hache, le persiste en base.
     * Retourne le token brut (à mettre dans le lien email).
     */
    async createEmailToken(email: string): Promise<string> {
        const rawToken = crypto.randomBytes(32).toString("hex")
        const hashedToken = this.hashToken(rawToken)
        const expires = new Date(Date.now() + EMAIL_TOKEN_TTL)

        await prisma.verificationToken.deleteMany({ where: { identifier: email } })
        await prisma.verificationToken.create({
            data: { identifier: email, token: hashedToken, expires },
        })

        return rawToken
    }

    /**
     * Vérifie le token brut, retourne l'utilisateur associé.
     * Lève une erreur si le token est invalide ou expiré.
     */
    async verifyEmailToken(rawToken: string): Promise<{ user: User; hashedToken: string }> {
        const hashedToken = this.hashToken(rawToken)

        const record = await prisma.verificationToken.findUnique({
            where: { token: hashedToken },
        })

        if (!record || record.expires < new Date()) {
            throw new BadRequestError("Token invalide ou expiré")
        }

        const user = await prisma.user.findUnique({ where: { email: record.identifier } })
        if (!user) throw new NotFoundError("Utilisateur introuvable")

        return { user, hashedToken }
    }

    /**
     * Consomme le token (le supprime) après usage.
     */
    async consumeToken(hashedToken: string): Promise<void> {
        await prisma.verificationToken.delete({ where: { token: hashedToken } })
    }

    async markEmailVerified(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: new Date() },
        })
    }

    async resetPassword(rawToken: string, newPassword: string): Promise<User> {
        const { user, hashedToken } = await this.verifyEmailToken(rawToken)
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        })

        await this.consumeToken(hashedToken)

        return user
    }

    private hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex")
    }
}

export const authService = new AuthService()
