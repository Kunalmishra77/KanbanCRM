import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, KanbanSquare, Settings, LogOut, ChevronLeft, ChevronRight, Search, Building2, Target, Megaphone, Menu, X, Wallet } from "lucide-react";
import { useIsOwner, useIsHROrOwner } from "@/lib/auth";
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

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isOwner = useIsOwner();
  const isHROrOwner = useIsHROrOwner();

  const allNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/", ownerOnly: false, hrOrOwnerOnly: false },
    { icon: Users, label: "Clients", href: "/clients", ownerOnly: false, hrOrOwnerOnly: false },
    { icon: KanbanSquare, label: "Global Board", href: "/global-kanban", ownerOnly: false, hrOrOwnerOnly: false },
    { icon: Target, label: "Leads", href: "/leads", ownerOnly: false, hrOrOwnerOnly: false },
    { icon: Megaphone, label: "Announcements", href: "/announcements", ownerOnly: false, hrOrOwnerOnly: false },
    { icon: Wallet, label: "Salary & Incentives", href: "/salary", ownerOnly: false, hrOrOwnerOnly: true },
    { icon: Building2, label: "Internal", href: "/internal", ownerOnly: true, hrOrOwnerOnly: false },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.hrOrOwnerOnly && !isHROrOwner) return false;
    return true;
  });

  const sidebarContent = (
    <aside
      className={cn(
        "h-screen flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] macos-sidebar",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 mb-2">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={agentixLogo} alt="AGENTiX" className="h-12 w-auto" />
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <img src={agentixLogo} alt="AGENTiX" className="h-10 w-10 object-contain" />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 hidden sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 sm:hidden"
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
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 mx-auto"
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
      <div className="p-4 border-t border-black/5 space-y-2">
        <Link href="/settings" onClick={onMobileClose}>
          <div
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-black/5 text-muted-foreground hover:text-foreground",
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
      <div className="hidden sm:block sticky top-0 left-0 z-50 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

import { useAuth } from "@/lib/auth";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 transition-all duration-200 bg-transparent">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="sm:hidden h-9 w-9 flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search bar */}
        <div className="relative w-full max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search..."
            className="pl-10 h-9 macos-input rounded-lg text-sm shadow-sm focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationsDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-9 w-9 p-0 ring-2 ring-white/50 shadow-sm hover:ring-primary/20 transition-all ml-1">
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
            <DropdownMenuSeparator className="bg-black/5" />
            <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/5" />
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
