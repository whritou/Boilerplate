"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RequestResetPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("idle");

    const res = await fetch("/api/auth/request-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      try {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue.");
      } catch {
        setError("Une erreur est survenue.");
      }
      setStatus("error");
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md w-full">
        <h1 className="text-xl font-semibold text-center">
          Mot de passe oublié ?
        </h1>
        <Input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Envoyer le lien
        </Button>
        {status === "sent" && (
          <p className="text-green-600 text-sm text-center">
            Consultez votre boîte mail.
          </p>
        )}
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      </form>
    </main>
  );
}
