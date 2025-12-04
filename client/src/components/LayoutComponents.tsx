import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, KanbanSquare, Settings, LogOut, ChevronLeft, ChevronRight, Search, Bell } from "lucide-react";
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
import { USERS } from "@/lib/mockData";

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Clients", href: "/clients" },
    { icon: KanbanSquare, label: "Global Board", href: "/global-kanban" },
  ];

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-white/20 bg-white/60 dark:bg-black/40 backdrop-blur-xl shadow-lg",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
            AGENTiX
          </span>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hover:bg-white/20"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex items-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20" 
                    : "text-muted-foreground hover:bg-white/40 hover:text-foreground hover:shadow-sm"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && <span className="ml-3 font-medium text-sm">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10">
         <Link href="/settings">
            <div 
              className={cn(
                "flex items-center px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <Settings className="h-5 w-5" />
              {!collapsed && <span className="ml-3 font-medium text-sm">Settings</span>}
            </div>
          </Link>
      </div>
    </aside>
  );
}

export function TopBar() {
  const currentUser = USERS[0]; // Mock logged in user

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-6 border-b border-white/20 bg-white/30 dark:bg-black/20 backdrop-blur-md shadow-sm">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search clients, stories, or tags..." 
            className="pl-10 bg-white/40 border-white/20 focus:bg-white/70 transition-all rounded-2xl shadow-inner"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/40 relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-10 w-10 p-0 ring-2 ring-white/50 shadow-sm">
              <Avatar>
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-panel">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
