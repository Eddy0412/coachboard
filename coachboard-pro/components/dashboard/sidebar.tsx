"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Film,
  Users,
  ClipboardList,
  Bell,
  Settings,
  CreditCard,
  Video,
  LogOut,
  HelpCircle,
  BookOpen,
  FileText,
  Ticket,
  PlayCircle,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  BarChart3,
  X,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { isAthlete } from "@/lib/permissions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users, coachOnly: true },
  { href: "/team/roster", label: "Roster", icon: ClipboardList, coachOnly: true },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/footage", label: "Footage Services", icon: Video, coachOnly: true },
  { href: "/settings/billing", label: "Billing", icon: CreditCard, coachOnly: true },
  { href: "/admin/stats", label: "Stats", icon: BarChart3, staffOnly: true },
  { href: "/admin/articles", label: "Articles", icon: ShieldCheck, staffOnly: true },
];

const SUPPORT_ITEMS = [
  { href: "/support/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/support/docs", label: "Documentation", icon: FileText },
  { href: "/support/tutorials", label: "Video Tutorials", icon: PlayCircle },
  { href: "/support/tickets", label: "Support Tickets", icon: Ticket },
];

interface SidebarProps {
  /** Mobile-drawer visibility — ignored on desktop, where the sidebar is always inline. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const athleteUser = isAthlete(profile);
  const supportOpen = pathname.startsWith("/support");
  const [supportExpanded, setSupportExpanded] = useState(supportOpen);
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // On mobile the sidebar is a full-width drawer, never a permanent rail —
  // it's not rendered at all until opened, and always shows full labels.
  if (isMobile && !mobileOpen) return null;
  const effectiveCollapsed = isMobile ? false : collapsed;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const closeIfMobile = () => {
    if (isMobile) onMobileClose?.();
  };

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
          isMobile ? "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl" : "relative",
          effectiveCollapsed ? "w-16" : isMobile ? "" : "w-60"
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-4 min-h-[57px]">
          <Image src="/logo.png" alt="Coachboard Pro logo" width={24} height={24} className="shrink-0" />
          {!effectiveCollapsed && (
            <>
              <Link href="/dashboard" className="text-lg font-extrabold truncate" onClick={closeIfMobile}>
                Coachboard
              </Link>
              {!athleteUser && (
                <Badge variant={profile?.subscription_status === "pro" ? "primary" : "default"}>
                  {profile?.subscription_status === "pro" ? "Pro" : "Free"}
                </Badge>
              )}
            </>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="ml-auto rounded-lg p-1.5 text-muted hover:bg-input hover:text-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.filter(
            (item) =>
              (!item.coachOnly || !athleteUser) && (!item.staffOnly || profile?.is_staff)
          ).map(
            (item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={effectiveCollapsed ? item.label : undefined}
                  onClick={closeIfMobile}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    effectiveCollapsed ? "justify-center" : "",
                    isActive
                      ? "bg-primary-bg border border-primary-br text-text"
                      : "text-muted hover:text-text hover:bg-input border border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!effectiveCollapsed && item.label}
                </Link>
              );
            }
          )}

          <button
            type="button"
            title={effectiveCollapsed ? "Support" : undefined}
            onClick={() => {
              if (effectiveCollapsed) setCollapsed(false);
              else setSupportExpanded((prev) => !prev);
            }}
            className={cn(
              "mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              effectiveCollapsed ? "justify-center" : "",
              supportOpen
                ? "bg-primary-bg border border-primary-br text-text"
                : "text-muted hover:text-text hover:bg-input border border-transparent"
            )}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            {!effectiveCollapsed && (
              <>
                Support
                <ChevronRight
                  className={cn(
                    "ml-auto h-3.5 w-3.5 transition-transform",
                    supportExpanded && "rotate-90"
                  )}
                />
              </>
            )}
          </button>
          {!effectiveCollapsed && supportExpanded && SUPPORT_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeIfMobile}
                className={cn(
                  "ml-4 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary-bg border border-primary-br text-text"
                    : "text-muted hover:text-text hover:bg-input border border-transparent"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          {!effectiveCollapsed && (
            <div className="mb-2 px-3 text-xs text-muted truncate">
              {profile?.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            title={effectiveCollapsed ? "Sign out" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-text hover:bg-input transition-colors",
              effectiveCollapsed ? "justify-center" : ""
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!effectiveCollapsed && "Sign out"}
          </button>
          {!isMobile && (
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-text hover:bg-input transition-colors"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  Collapse
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
