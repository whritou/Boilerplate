export interface UserEntity {
    id: string
    name: string | null
    email: string
    password: string | null
    emailVerified: Date | null
    image: string | null
    role: "USER" | "ADMIN"
}

export interface UserDTO {
    id: string
    name: string | null
    email: string
    password?: string | null
    emailVerified: string | null
    image: string | null
    role: "USER" | "ADMIN"
}