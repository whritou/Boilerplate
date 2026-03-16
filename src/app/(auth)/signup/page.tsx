"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SignUpPage() {
  const router = useRouter();

  const [callbackUrl, setCallbackUrl] = useState<string>("/");

  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "/");
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setPreview(URL.createObjectURL(file));
      setImageFile(file);
    } else {
      setPreview(null);
      setImageFile(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    let imageUrl: string | null = null;
    if (imageFile) {
      const uploadForm = new FormData();
      uploadForm.append("file", imageFile);
      const upRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      if (upRes.ok) {
        imageUrl = (await upRes.json()).url;
      }
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:           fd.get("name"),
        email:          fd.get("email"),
        password:       fd.get("password"),
        confirmPassword: fd.get("confirmPassword"),
        image:          imageUrl,
        callbackUrl,
      }),
    });

      const data = await res.json();

      if (!res.ok) {
          setError(data.error?.message ?? "Une erreur est survenue.");
          return;
      }

      router.push("/check-email?email=" + encodeURIComponent(fd.get("email") as string));
  }

  return (
      <main className="flex items-center justify-center min-h-screen px-4 bg-white">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
                variant="outline"
                className="w-full"
                onClick={() => signIn("google", { callbackUrl })}
            >
              Sign up with Google
            </Button>

            <Separator />

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="name" type="text" placeholder="Name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
              />
              <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  required
              />
              <Input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
              />
              {preview && (
                  <img
                      src={preview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover mx-auto"
                  />
              )}
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </form>

            <Separator />

            <p className="text-sm text-center">
              Already have an account?{" "}
              <a
                  href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="underline text-blue-600"
              >
                Sign in
              </a>
            </p>

            {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </main>
  );
}
