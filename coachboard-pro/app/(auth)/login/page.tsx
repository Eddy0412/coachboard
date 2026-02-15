import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-extrabold">
            Coachboard Pro
          </Link>
          <p className="mt-2 text-sm text-muted">
            Sign in to your coaching workspace
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
