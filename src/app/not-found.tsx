import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-500">The listing or page you were looking for is no longer available.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 font-semibold text-white">Go home</Link>
      </div>
    </div>
  );
}
