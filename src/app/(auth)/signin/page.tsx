"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SignInPage() {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [callbackUrl, setCallbackUrl] = useState<string>("/");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        setError(params.get("error"));
        setCallbackUrl(params.get("callbackUrl") || "/");
    }, []);

    async function handleCredSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        const res = await signIn("credentials", {
            email: fd.get("email") as string,
            password: fd.get("password") as string,
            callbackUrl,
            redirect: false,
        });

        if (res?.error === "EmailNotVerified") {
            router.push(
                `/check-email?email=${encodeURIComponent(
                    fd.get("email") as string
                )}&callbackUrl=${encodeURIComponent(callbackUrl)}`
            );
            return;
        }

        if (res?.url) router.push(res.url);
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-white px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader>
                    <CardTitle>Sign in</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => signIn("google", { callbackUrl })}
                    >
                        Sign in with Google
                    </Button>

                    <Separator />

                    <form onSubmit={handleCredSubmit} className="space-y-4">
                        <Input name="email" type="email" placeholder="Email" required />
                        <Input
                            name="password"
                            type="password"
                            placeholder="Password"
                            required
                        />
                        <Button type="submit" className="w-full">
                            Sign in
                        </Button>
                    </form>

                    <p className="text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <a
                            href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                            className="underline text-blue-600"
                        >
                            Sign up
                        </a>
                    </p>
                    <p className="text-sm text-center">
                        <a
                            href="/request-reset-password"
                            className="underline text-blue-600"
                        >
                            Forgot password?
                        </a>
                    </p>

                    {error === "OAuthAccountNotLinked" && (
                        <p className="text-red-500 text-sm text-center">
                            This email is already registered with another provider.
                        </p>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
