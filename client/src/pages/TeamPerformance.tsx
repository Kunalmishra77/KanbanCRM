import { useTeamAnalytics } from "@/lib/queries";

import { Loader2, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TeamPerformance() {
  const { data: teamStats, isLoading } = useTeamAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate some aggregate metrics
  const totalAssigned = teamStats?.reduce((acc: number, stat: any) => acc + stat.totalAssigned, 0) || 0;
  const totalCompleted = teamStats?.reduce((acc: number, stat: any) => acc + stat.completed, 0) || 0;
  const totalOverdue = teamStats?.reduce((acc: number, stat: any) => acc + stat.overdue, 0) || 0;

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 lg:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                Team Performance
              </h1>
              <p className="text-gray-500 text-lg">
                Track workload and completion metrics across your team
              </p>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="macos-card border-none bg-white/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned Tasks</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalAssigned}</div>
              </CardContent>
            </Card>

            <Card className="macos-card border-none bg-white/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalCompleted}</div>
              </CardContent>
            </Card>

            <Card className="macos-card border-none bg-white/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalOverdue}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mt-8">
            {teamStats?.map((stat: any) => (
              <Card key={stat.user.id} className="macos-card border-none bg-white/80 hover:bg-white transition-colors duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-12 w-12 rounded-full border-2 border-primary/10">
                      <AvatarImage src={stat.user.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${stat.user.firstName}`} />
                      <AvatarFallback>{(stat.user.firstName || 'U').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{stat.user.firstName} {stat.user.lastName}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{stat.user.role === 'admin' ? 'Admin' : 'Employee'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assigned</p>
                      <p className="text-2xl font-semibold">{stat.totalAssigned}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</p>
                      <p className="text-2xl font-semibold text-green-600">{stat.completed}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overdue</p>
                      <p className="text-2xl font-semibold text-red-500">{stat.overdue}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Est. Hours</p>
                      <p className="text-2xl font-semibold text-blue-600">{stat.totalEstimatedHours}h</p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Completion Rate</span>
                      <span>{stat.totalAssigned > 0 ? Math.round((stat.completed / stat.totalAssigned) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${stat.totalAssigned > 0 ? (stat.completed / stat.totalAssigned) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
    </div>
  );
}
