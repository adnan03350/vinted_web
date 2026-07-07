import Link from "next/link";
import { ShoppingBag, Search, UserRound, MessageCircleMore } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

const links = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/sell", label: "Sell" },
  { href: "/orders", label: "Orders" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white" aria-hidden="true">T</div>
          <div>
            <p className="text-lg font-semibold text-slate-900">ThriftAsia</p>
            <p className="text-sm text-slate-500">Asian second-hand marketplace</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/browse" aria-label="Search listings" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Search className="h-4 w-4" /></Link>
          <Link href="/chat" aria-label="Open messages" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><MessageCircleMore className="h-4 w-4" /></Link>
          <NotificationBell />
          <Link href="/auth/login" aria-label="Account" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><UserRound className="h-4 w-4" /></Link>
          <Link href="/sell" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><ShoppingBag className="h-4 w-4" aria-hidden="true" />Sell now</Link>
        </div>
      </div>
    </header>
  );
}
