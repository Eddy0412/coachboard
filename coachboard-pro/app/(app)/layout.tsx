"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/dashboard/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { TourGuide } from "@/components/dashboard/tour-guide";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <TourGuide />
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:justify-end sm:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-muted hover:bg-input hover:text-text transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <Image src="/logo.png" alt="Coachboard Pro logo" width={20} height={20} />
              <span className="text-sm font-extrabold">Coachboard</span>
            </Link>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
