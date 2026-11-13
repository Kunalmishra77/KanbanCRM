import { Link, useLocation } from "wouter";
import { InstallAppButton } from "@/components/InstallAppButton";
import { LayoutDashboard, Users, KanbanSquare, Settings, LogOut, ChevronLeft, ChevronRight, Search, Building2, Target, Megaphone, Menu, X, Wallet, Activity, TrendingUp, CalendarClock, Repeat } from "lucide-react";
import { useIsFounder, useCanManageTeam, useCanViewPayroll, useCanViewTeamStats, usePerm } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import agentixLogo from "@/assets/agentix-logo.png";
import agentixLogoDark from "@/assets/agentix-logo-dark.png";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isFounder = useIsFounder();
  const canManageInternal = usePerm("manageInternal");
  const canManageTeam = useCanManageTeam();
  const canViewTeamStats = useCanViewTeamStats();
  const canViewPayroll = useCanViewPayroll();

  const allNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/", access: "all" },
    { icon: Users, label: "Clients", href: "/clients", access: "all" },
    { icon: KanbanSquare, label: "Global Board", href: "/global-kanban", access: "all" },
    { icon: Target, label: "Leads", href: "/leads", access: "all" },
    { icon: CalendarClock, label: "Employee Services", href: "/services", access: "all" },
    { icon: Megaphone, label: "Announcements", href: "/announcements", access: "all" },
    { icon: Wallet, label: "Salary & Incentives", href: "/salary", access: "payroll" },
    { icon: Building2, label: "Internal", href: "/internal", access: "internal" },
    { icon: Activity, label: "Audit Log", href: "/audit-log", access: "team" },
    { icon: TrendingUp, label: "Team Performance", href: "/team", access: "stats" },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.access === "founder") return isFounder;
    if (item.access === "internal") return canManageInternal;
    if (item.access === "team") return canManageTeam;
    if (item.access === "stats") return canViewTeamStats;
    if (item.access === "payroll") return canViewPayroll;
    return true;
  });

  const renderSidebar = (collapsed: boolean) => (
    <aside
      className={cn(
        "h-dvh flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] macos-sidebar",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 mb-2">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={agentixLogo} alt="AGENTiX" className="h-12 w-auto dark:hidden" />
            <img src={agentixLogoDark} alt="AGENTiX" className="h-12 w-auto hidden dark:block" />
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <img src={agentixLogo} alt="AGENTiX" className="h-10 w-10 object-contain dark:hidden" />
            <img src={agentixLogoDark} alt="AGENTiX" className="h-10 w-10 object-contain hidden dark:block" />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 hidden sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          aria-label="Close menu"
          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 sm:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {collapsed && (
        <div className="px-3 mb-2 hidden sm:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Expand sidebar"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 mx-auto"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onMobileClose}>
              <div
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  collapsed ? "mx-auto" : "mr-3"
                )} />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-black/5 dark:border-white/10 space-y-2">
        <Link href="/settings" onClick={onMobileClose}>
          <div
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <Settings className="h-5 w-5" />
            {!collapsed && <span className="ml-3 text-sm">Settings</span>}
          </div>
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <div className="hidden sm:block sticky top-0 left-0 z-50 h-dvh">
        {renderSidebar(collapsed)}
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-10 h-full max-w-[85vw]" role="dialog" aria-modal="true" aria-label="Navigation menu">
            {renderSidebar(false)}
          </div>
        </div>
      )}
    </>
  );
}

import { useAuth } from "@/lib/auth";
import { GlobalSearch } from "./GlobalSearch";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <header className="h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-6 transition-all duration-200 bg-transparent">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-xl">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="sm:hidden h-9 w-9 flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Search */}
        <div className="w-full min-w-0 max-w-sm">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <InstallAppButton />
        <NotificationsDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label="Account menu" className="rounded-full h-9 w-9 p-0 ring-2 ring-white/50 shadow-sm hover:ring-primary/20 transition-all ml-1">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 macos-panel rounded-xl p-2 mt-2">
            <DropdownMenuLabel className="px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10" />
            <DropdownMenuItem
              className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary"
              onClick={() => setLocation("/settings")}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary"
              onClick={() => setLocation("/settings")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10" />
            <DropdownMenuItem
              className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
