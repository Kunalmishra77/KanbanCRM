import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENTS, STORIES, ACTIVITY_LOG } from "@/lib/mockData";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";
import { ArrowUpRight, Clock, TrendingUp, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const totalRevenue = CLIENTS.reduce((acc, c) => acc + c.revenueTotal, 0);
  const totalStories = STORIES.length;
  const activeClients = CLIENTS.length;
  const completedStories = STORIES.filter(s => s.status === 'Done').length;
  const completionRate = Math.round((completedStories / totalStories) * 100) || 0;

  const revenueData = CLIENTS.map(c => ({
    name: c.name.split(' ')[0], // Short name
    revenue: c.revenueTotal,
  }));

  const statusDistribution = [
    { name: 'Hot', value: CLIENTS.filter(c => c.stage === 'Hot').length, color: 'hsl(var(--chart-1))' },
    { name: 'Warm', value: CLIENTS.filter(c => c.stage === 'Warm').length, color: 'hsl(var(--chart-4))' },
    { name: 'Cool', value: CLIENTS.filter(c => c.stage === 'Cool').length, color: 'hsl(var(--chart-3))' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your clients and projects.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue" 
          value={`$${totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+12.5% from last month"
        />
        <StatCard 
          title="Active Clients" 
          value={activeClients.toString()} 
          icon={Users} 
          trend="+2 new this month"
        />
        <StatCard 
          title="Pending Stories" 
          value={(totalStories - completedStories).toString()} 
          icon={Clock} 
          trend="5 due this week"
        />
        <StatCard 
          title="Completion Rate" 
          value={`${completionRate}%`} 
          icon={ArrowUpRight} 
          trend="Up by 4%"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="col-span-4 glass-card border-none">
          <CardHeader>
            <CardTitle>Revenue by Client</CardTitle>
            <CardDescription>Total recognized revenue per client account.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueData}>
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.1)'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Health */}
        <Card className="col-span-3 glass-card border-none">
          <CardHeader>
            <CardTitle>Client Health Distribution</CardTitle>
            <CardDescription>Breakdown of clients by engagement stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card className="glass-card border-none">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ACTIVITY_LOG.map((log) => (
              <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-white/10 last:border-0 last:pb-0">
                <div className="mt-1 rounded-full bg-primary/10 p-2">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{log.details}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) {
  return (
    <Card className="glass-card border-none overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="h-16 w-16" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
}
