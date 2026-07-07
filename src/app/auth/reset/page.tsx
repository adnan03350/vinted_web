import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata(
  "Reset password",
  "Reset your ThriftAsia account password securely.",
  "/auth/reset"
);

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <BackButton href="/auth/login" label="Back to login" />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            If you opened this page from a password reset email, follow the instructions in that email to choose a new password.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Go to login
          </Link>
        </div>
      </main>
    </div>
  );
}
