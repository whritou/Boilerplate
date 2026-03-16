"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params =
      typeof window === "undefined"
          ? new URLSearchParams()
          : new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, passwordConfirm }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Une erreur est survenue");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/"), 1000);
  }

  return (
      <main className="flex items-center justify-center min-h-screen bg-white px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle>Réinitialiser le mot de passe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
                <p className="text-green-600 text-center">
                  Mot de passe mis à jour. Redirection…
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                      type="password"
                      placeholder="Nouveau mot de passe"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      required
                  />
                  <Input
                      type="password"
                      placeholder="Confirmez le mot de passe"
                      value={passwordConfirm}
                      onChange={(e) => {
                        setPasswordConfirm(e.target.value);
                        setError("");
                      }}
                      required
                  />
                  <Button type="submit" className="w-full">
                    Valider
                  </Button>
                </form>
            )}
            {error && (
                <p className="text-red-500 text-center text-sm">{error}</p>
            )}
          </CardContent>
        </Card>
      </main>
  );
}
