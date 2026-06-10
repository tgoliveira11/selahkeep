"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/letters");
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Sign in</h1>
        <form onSubmit={handleCredentials} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in with email"}
          </Button>
        </form>

        <div className="my-6 text-center text-[var(--muted)]">or</div>

        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/letters" })}
          >
            Sign in with Google
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => signIn("apple", { callbackUrl: "/letters" })}
          >
            Sign in with Apple
          </Button>
        </div>

        <p className="mt-6 text-center text-sm">
          No account?{" "}
          <Link href="/register" className="text-[var(--primary)] hover:underline">
            Create one
          </Link>
        </p>
      </main>
    </>
  );
}
