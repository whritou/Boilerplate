"use client"
import AppBar from "@/components/layouts/AppBar"

export default function HomeLayout({ children }: { children: React.ReactNode }) {

    return (
        <>
            <AppBar />
            <main>
                {children}
            </main>
        </>
    )
}
