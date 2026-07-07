import { AuthForm } from "@/components/auth-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">Secure sign in</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Join the marketplace built for trusted regional trade.</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">Sign in to explore listings, follow favorites, and manage your sales and purchases in one place.</p>
        </div>
        <div className="space-y-4">
          <AuthForm mode="login" />
          <p className="text-sm text-slate-500">New to ThriftAsia? <Link href="/auth/signup" className="font-semibold text-slate-900">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
