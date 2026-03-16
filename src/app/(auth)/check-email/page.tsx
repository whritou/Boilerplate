"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function CheckEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string>("/");
  const [remaining, setRemaining] = useState(60);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email"));
    setCallbackUrl(params.get("callbackUrl") || "/");
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  async function resend() {
    setSent(false);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, callbackUrl }),
    });
    if (res.ok) {
      setSent(true);
      setRemaining(60);
    } else {
      alert("Impossible de renvoyer l’email – réessayez plus tard.");
    }
  }

  if (!email) {
    return (
        <main className="min-h-screen flex items-center justify-center px-4">
          <p>Chargement…</p>
        </main>
    );
  }

  return (
      <main className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Presque fini !</h1>
          <p>
            Nous avons envoyé un lien de confirmation à&nbsp;
            <span className="font-medium">{email}</span>.<br />
            Vérifiez votre boîte mail et cliquez sur le lien pour activer votre
            compte.
          </p>

          <Button
              onClick={resend}
              disabled={remaining > 0}
              className="w-full max-w-xs"
          >
            {remaining > 0 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  &nbsp;Renvoyer dans {remaining}s
                </>
            ) : (
                "Renvoyer l’email de vérification"
            )}
          </Button>

          {sent && (
              <p className="text-green-600 text-sm">Email renvoyé !</p>
          )}
        </div>
      </main>
  );
}
