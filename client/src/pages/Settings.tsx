import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor, User, Palette, Bell, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="container max-w-4xl py-8 space-y-8" data-testid="page-settings">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
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
                <p className="text-xs text-muted-foreground capitalize">Role: {user?.role || 'editor'}</p>
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
              <div className="grid grid-cols-3 gap-3">
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

        <Card className="macos-card">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Activity Notifications</Label>
                <p className="text-xs text-muted-foreground">Get notified about story updates and comments</p>
              </div>
              <Switch defaultChecked data-testid="switch-activity-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive email updates for important changes</p>
              </div>
              <Switch data-testid="switch-email-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your security settings</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Switch data-testid="switch-2fa" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
