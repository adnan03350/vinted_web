import { AuthForm } from "@/components/auth-form";
import { BackButton } from "@/components/back-button";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <BackButton />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Create account</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Join ThriftAsia</h1>
          <p className="mt-3 text-sm text-slate-500">Start listing items, chatting with buyers, and managing orders from one place.</p>
        </div>
        <AuthForm mode="signup" />
        <div className="mt-6 text-sm text-slate-500">
          Already registered? <Link href="/auth/login" className="font-semibold text-slate-900">Log in</Link>
        </div>
        </div>
      </div>
    </div>
  );
}
