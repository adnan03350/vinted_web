import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileNav />
    </>
  );
}
