import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients, useStories, useActivityLog } from "@/lib/queries";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Area, AreaChart } from "recharts";
import { ArrowUpRight, Clock, TrendingUp, Users, Briefcase, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const { data: stories = [], isLoading: isLoadingStories } = useStories();
  const { data: activityLog = [], isLoading: isLoadingActivity } = useActivityLog();

  if (isLoadingClients || isLoadingStories || isLoadingActivity) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalRevenue = clients.reduce((acc, c) => acc + Number(c.revenueTotal || 0), 0);
  const totalStories = stories.length;
  const activeClients = clients.length;
  const completedStories = stories.filter(s => s.status === 'Done').length;
  const completionRate = Math.round((completedStories / totalStories) * 100) || 0;

  const revenueData = clients.map(c => ({
    name: c.name.split(' ')[0], 
    revenue: Number(c.revenueTotal || 0),
  }));

  const statusDistribution = [
    { name: 'Hot', value: clients.filter(c => c.stage === 'Hot').length, color: 'hsl(var(--chart-1))' },
    { name: 'Warm', value: clients.filter(c => c.stage === 'Warm').length, color: '#fbbf24' },
    { name: 'Cool', value: clients.filter(c => c.stage === 'Cool').length, color: '#94a3b8' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground">Welcome back, Alex. Here's what's happening today.</p>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue" 
          value={`$${totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+12.5%"
          trendUp={true}
          color="text-green-600"
          bgColor="bg-green-100/50"
        />
        <StatCard 
          title="Active Clients" 
          value={activeClients.toString()} 
          icon={Briefcase} 
          trend="+2 new"
          trendUp={true}
          color="text-blue-600"
          bgColor="bg-blue-100/50"
        />
        <StatCard 
          title="Pending Stories" 
          value={(totalStories - completedStories).toString()} 
          icon={Clock} 
          trend="5 due soon"
          trendUp={false}
          color="text-orange-600"
          bgColor="bg-orange-100/50"
        />
        <StatCard 
          title="Completion Rate" 
          value={`${completionRate}%`} 
          icon={CheckCircle2} 
          trend="+4%"
          trendUp={true}
          color="text-purple-600"
          bgColor="bg-purple-100/50"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Revenue Chart - Main Focus */}
        <Card className="col-span-7 lg:col-span-4 macos-card border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Revenue by Client</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value/1000}k`} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      background: 'rgba(255,255,255,0.9)', 
                      backdropFilter: 'blur(12px)', 
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      padding: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#colorRevenue)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Health Donut */}
        <Card className="col-span-7 lg:col-span-3 macos-card border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Client Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      background: 'rgba(255,255,255,0.9)', 
                      backdropFilter: 'blur(12px)', 
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-bold text-foreground">{activeClients}</span>
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Clients</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-6">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold px-1">Latest Activity</h2>
        <Card className="macos-card border-none shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {activityLog.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-black/[0.02] transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {log.entityType === 'story' ? <Clock className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{log.details}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-xs text-muted-foreground">by Alex Chen</span>
                       <span className="text-[10px] text-muted-foreground/50">•</span>
                       <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color, bgColor }: any) {
  return (
    <Card className="macos-card border-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-3 rounded-xl transition-colors", bgColor)}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trendUp ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
          )}>
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {trend}
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
