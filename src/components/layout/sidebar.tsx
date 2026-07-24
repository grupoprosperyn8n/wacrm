"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import {
  Bell, Bot, ChevronRight, Crown, GitBranch, LayoutDashboard,
  LogOut, MessageSquare, Radio, RadioTower, Settings, Shield,
  User, UserCog, Users, UsersRound, Workflow, X, Zap,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

const ROLE_CHIP = {
  owner: { icon: Crown, labelKey: "roleOwner", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  admin: { icon: Shield, labelKey: "roleAdmin", className: "border-primary/40 bg-primary/10 text-primary" },
  agent: { icon: UserCog, labelKey: "roleAgent", className: "border-border bg-muted text-foreground" },
  viewer: { icon: User, labelKey: "roleViewer", className: "border-border bg-card text-muted-foreground" },
};

const navItems = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/inbox", labelKey: "inbox", icon: MessageSquare },
  { href: "/notifications", labelKey: "notifications", icon: Bell },
  { href: "/contacts", labelKey: "contacts", icon: Users },
  { href: "/pipelines", labelKey: "pipelines", icon: GitBranch },
  { href: "/broadcasts", labelKey: "broadcasts", icon: Radio },
  { href: "/channels", labelKey: "channels", icon: RadioTower },
  { href: "/automations", labelKey: "automations", icon: Zap },
  { href: "/flows", labelKey: "flows", icon: Workflow, beta: true },
  { href: "/agents", labelKey: "aiAgents", icon: Bot },
];
const bottomNavItems = [{ href: "/settings", labelKey: "settings", icon: Settings }];

export function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapse }: { open?: boolean; onClose?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  const [brandName, setBrandName] = useState("CRM Agentico");

  useEffect(() => {
    if (account?.name) setBrandName(account.name);
  }, [account?.name]);

  const showAccountStrip = !profileLoading && !!account?.name && account.name !== profile?.full_name;

  useEffect(() => { onClose?.(); }, [pathname]);

  return (
    <>
      <button type="button" aria-label={t("closeMenu")} onClick={onClose}
        className={cn("fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border bg-card transition-all duration-200",
        open ? "w-64 translate-x-0" : "w-64 -translate-x-full",
        collapsed ? "lg:w-16 lg:translate-x-0" : "lg:w-60 lg:translate-x-0",
      )} aria-label="Primary">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-2">
          <Link href="/dashboard" className="flex items-center justify-center gap-2 flex-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-sm font-semibold text-foreground">{brandName}</span>}
          </Link>
          <button type="button" onClick={onClose} aria-label={t("closeMenu")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden">
            <X className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToggleCollapse} aria-label={collapsed ? "Expandir" : "Contraer"}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:flex">
            <ChevronRight className={"h-4 w-4 transition-transform " + (collapsed ? "" : "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="flex flex-col items-center gap-0.5 px-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.href} className="w-full">
                  <Link href={item.href} title={collapsed ? t(item.labelKey) : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}>
                    <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!collapsed && <span className="flex-1 truncate">{t(item.labelKey)}</span>}
                    {!collapsed && item.beta && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">{t("beta")}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="my-3 border-t border-border mx-2" />
          <ul className="flex flex-col items-center gap-0.5 px-1.5">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href} className="w-full">
                  <Link href={item.href} title={collapsed ? t(item.labelKey) : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}>
                    <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-border p-2">
          {showAccountStrip && account?.name && !collapsed && (
            <div className="mb-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              <span className="truncate" title={account.name}>{account.name}</span>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60", collapsed ? "justify-center" : "")}>
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? ""} /> : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{profile?.full_name ?? t("defaultUser")}</p>
                  <p className="truncate text-xs text-muted-foreground">{profile?.email ?? ""}</p>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={6} className="min-w-56 bg-popover text-popover-foreground ring-border">
              <DropdownMenuItem render={<Link href="/settings?tab=profile" onClick={onClose} />}>
                <User className="size-4" /> {t("menuProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings?tab=whatsapp" onClick={onClose} />}>
                <Settings className="size-4" /> {t("menuSettings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="size-4" /> {t("menuSignOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
