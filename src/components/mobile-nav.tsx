"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, UserRound, Heart } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, accent: true },
  { href: "/favorites", label: "Saved", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const hiddenPrefixes = ["/auth", "/admin"];

export function MobileNav() {
  const pathname = usePathname();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          if (tab.accent) {
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className="flex flex-col items-center gap-1 rounded-2xl px-3 py-1 text-[10px] font-semibold text-orange-600"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-[10px] font-medium ${
                  active ? "text-slate-900" : "text-slate-500"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-orange-600" : ""}`} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
