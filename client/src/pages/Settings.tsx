import { ROLES, ROLE_LABELS, roleOf } from "@shared/roles";
import { useTheme } from "next-themes";
import { useAuth, useIsFounder } from "@/lib/auth";
import { useUsers, useUpdateUser } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Moon, Sun, Monitor, User, Palette, Users, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useState } from "react";

const USER_TYPE_LABELS: Record<string, string> = ROLE_LABELS;

const USER_TYPE_BADGE: Record<string, string> = {
  'founder': 'bg-purple-100 text-purple-700 border-purple-200',
  'hr': 'bg-blue-100 text-blue-700 border-blue-200',
  'accountant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'employee': 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function Settings() {
  const { user } = useAuth();
  const isFounder = useIsFounder();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { data: allUsers = [], isLoading } = useUsers();
  const { mutate: updateUser } = useUpdateUser();
  const [showAddMember, setShowAddMember] = useState(false);

  function handleRoleChange(userId: string, newUserType: string) {
    updateUser({ id: userId, data: { userType: newUserType } }, {
      onSuccess: () => toast({ title: "Role updated successfully" }),
      onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
    });
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="container max-w-4xl py-4 sm:py-8 space-y-6 sm:space-y-8" data-testid="page-settings">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card className="macos-card" data-testid="card-install-app">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <MonitorSmartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Desktop &amp; mobile app</CardTitle>
              <CardDescription>Install AGENTiX for one-click access in its own window</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <InstallAppButton variant="card" />
          </CardContent>
        </Card>

        <Card className="macos-card">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-white/50 shadow-lg">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium text-lg">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">Role: {ROLE_LABELS[roleOf(user)]}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Theme</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    className={cn(
                      "h-20 flex-col gap-2 rounded-xl transition-all",
                      theme === option.value && "ring-2 ring-primary bg-primary/5 border-primary"
                    )}
                    onClick={() => setTheme(option.value)}
                    data-testid={`button-theme-${option.value}`}
                  >
                    <option.icon className={cn(
                      "h-6 w-6",
                      theme === option.value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm",
                      theme === option.value ? "font-medium text-primary" : "text-muted-foreground"
                    )}>
                      {option.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {isFounder && (
          <Card className="macos-card">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>User Role Management</CardTitle>
                <CardDescription>Assign roles to team members</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddMember(true)}>Add Member</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(allUsers as any[]).map((u: any) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-secondary/40 border border-black/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={u.profileImageUrl || undefined} />
                      <AvatarFallback className="text-[11px]">{u.firstName?.charAt(0)}{u.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.id === user?.id ? (
                      <Badge variant="outline" className={cn("text-[11px]", USER_TYPE_BADGE[roleOf(u)])}>
                        {USER_TYPE_LABELS[roleOf(u)]} (You)
                      </Badge>
                    ) : (
                      <Select
                        value={roleOf(u)}
                        onValueChange={v => handleRoleChange(u.id, v)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      
      <CreateEmployeeModal 
        open={showAddMember} 
        onOpenChange={setShowAddMember} 
      />
    </div>
  );
}
