"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useCallbackUrl } from "@/hooks/usePreviousUrl";
import { CartDrawer } from "@/components/cart/CartDrawer";

export default function AppBar() {
    const { data: session } = useSession();
    const callbackUrl = useCallbackUrl();

    return (
        <header className="border-b px-4 py-2 flex items-center justify-between bg-red">
            <Link href="/" className="text-xl font-semibold">
                BoilerPlate
            </Link>

            <NavigationMenu className={"flex space-x-8"}>
                <NavigationMenuList className="space-x-4 hidden md:flex">
                    <NavigationMenuItem>
                        <Link href="/admin/products" className="text-sm hover:underline">
                            Admin
                        </Link>
                    </NavigationMenuItem>
                </NavigationMenuList>
                <NavigationMenuList className="space-x-4 hidden md:flex">
                    <NavigationMenuItem>
                        <Link href="/products" className="text-sm hover:underline">
                            Products
                        </Link>
                    </NavigationMenuItem>
                </NavigationMenuList>
            </NavigationMenu>
            {session ? (
                <div className="flex items-center gap-2">
                <CartDrawer />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="cursor-pointer">
                            <AvatarImage src={session.user?.image || ""} />
                            <AvatarFallback>{session.user?.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href="/orders">My orders</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            ) : (
                <div className="space-x-2">
                    {callbackUrl && (
                        <>
                            <Link
                                href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                            >
                                <Button variant="outline">Sign in</Button>
                            </Link>
                            <Link
                                href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                            >
                                <Button>Sign up</Button>
                            </Link>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
