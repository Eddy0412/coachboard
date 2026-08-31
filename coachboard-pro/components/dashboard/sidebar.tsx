"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const athleteUser = isAthlete(profile);
  const supportOpen = pathname.startsWith("/support");
  const [supportExpanded, setSupportExpanded] = useState(supportOpen);
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-4 min-h-[57px]">
        <Image src="/logo.png" alt="Coachboard Pro logo" width={24} height={24} className="shrink-0" />
        {!collapsed && (
          <>
            <Link href="/dashboard" className="text-lg font-extrabold truncate">
              Coachboard
            </Link>
            {!athleteUser && (
              <Badge variant={profile?.subscription_status === "pro" ? "primary" : "default"}>
                {profile?.subscription_status === "pro" ? "Pro" : "Free"}
              </Badge>
            )}
          </>
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
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-primary-bg border border-primary-br text-text"
                    : "text-muted hover:text-text hover:bg-input border border-transparent"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          }
        )}

        <button
          type="button"
          title={collapsed ? "Support" : undefined}
          onClick={() => {
            if (collapsed) setCollapsed(false);
            else setSupportExpanded((prev) => !prev);
          }}
          className={cn(
            "mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            collapsed ? "justify-center" : "",
            supportOpen
              ? "bg-primary-bg border border-primary-br text-text"
              : "text-muted hover:text-text hover:bg-input border border-transparent"
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          {!collapsed && (
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
        {!collapsed && supportExpanded && SUPPORT_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
        {!collapsed && (
          <div className="mb-2 px-3 text-xs text-muted truncate">
            {profile?.email}
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-text hover:bg-input transition-colors",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-text hover:bg-input transition-colors",
            collapsed ? "justify-center" : ""
          )}
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
      </div>
    </aside>
  );
}
