import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await requireAdmin()
    if (!session) redirect("/unauthorized")

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
                    <Link href="/products" className="text-sm font-semibold text-foreground hover:text-foreground/80">
                        Home
                    </Link>
                    <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
                        Products
                    </Link>
                    <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
                        Orders
                    </Link>
                    <span className="ml-auto text-xs text-muted-foreground">
                        Admin — {session.user.email}
                    </span>
                </div>
            </header>
            <main className="mx-auto max-w-7xl p-4 sm:p-6">
                {children}
            </main>
        </div>
    )
}
