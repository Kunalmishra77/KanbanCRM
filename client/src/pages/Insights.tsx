import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useClients, useStories } from "@/lib/queries";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Area, AreaChart, Line, LineChart, CartesianGrid, Legend } from "recharts";
import { ArrowLeft, TrendingUp, Briefcase, Clock, CheckCircle2, Loader2, IndianRupee, Calendar, User, Lock, Download } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Client, Story } from "@shared/schema";
import { useCanViewFinance } from "@/lib/auth";

export function RevenueInsight() {
  const [, setLocation] = useLocation();
  const { data: clients = [], isLoading } = useClients();
  const canViewFinance = useCanViewFinance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">Revenue data is only visible to founders and accountants.</p>
        <Button variant="outline" onClick={() => setLocation('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  const totalRevenue = clients.reduce((acc: any, c: any) => acc + Number(c.revenueTotal || 0), 0);
  const sortedClients = [...clients].sort((a: any, b: any) => Number(b.revenueTotal || 0) - Number(a.revenueTotal || 0));
  
  const revenueData = clients.map((c: any) => ({
    name: c.name.split(' ')[0],
    revenue: Number(c.revenueTotal || 0),
    fullName: c.name
  }));

  const stageRevenue = [
    { name: 'Hot', value: clients.filter((c: any) => c.stage === 'Hot').reduce((acc: any, c: any) => acc + Number(c.revenueTotal || 0), 0), color: 'hsl(var(--chart-1))' },
    { name: 'Warm', value: clients.filter((c: any) => c.stage === 'Warm').reduce((acc: any, c: any) => acc + Number(c.revenueTotal || 0), 0), color: '#fbbf24' },
    { name: 'Cold', value: clients.filter((c: any) => c.stage === 'Cold').reduce((acc: any, c: any) => acc + Number(c.revenueTotal || 0), 0), color: '#94a3b8' },
  ];

  const exportCSV = () => {
    const rows = [
      ['Client', 'Industry', 'Stage', 'Expected Revenue (₹)', 'Received Revenue (₹)', 'Collection %'],
      ...clients.map((c: any) => [
        c.name,
        c.industry,
        c.stage,
        Number(c.expectedRevenue || 0),
        Number(c.revenueTotal || 0),
        Number(c.expectedRevenue) > 0 ? ((Number(c.revenueTotal) / Number(c.expectedRevenue)) * 100).toFixed(1) + '%' : '0%'
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back" aria-label="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Revenue Breakdown</h1>
          <p className="text-muted-foreground">Detailed view of your revenue across all clients</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-3">
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100/50 dark:bg-green-500/20">
                <IndianRupee className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100/50 dark:bg-blue-500/20">
                <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg per Client</p>
                <p className="text-2xl font-bold">₹{Math.round(totalRevenue / (clients.length || 1)).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100/50 dark:bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Client</p>
                <p className="text-2xl font-bold">{sortedClients[0]?.name.split(' ')[0] || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-2">
        <Card className="macos-card border-none">
          <CardHeader>
            <CardTitle>Revenue by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card border-none">
          <CardHeader>
            <CardTitle>Revenue by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stageRevenue} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                    {stageRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6">
              {stageRevenue.map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">₹{item.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="macos-card border-none">
        <CardHeader>
          <CardTitle>All Clients by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedClients.map((client, index) => (
              <div key={client.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 dark:bg-white/[0.05] hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)} data-testid={`revenue-client-${client.id}`}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">{client.industry}</p>
                </div>
                <Badge variant="outline" className={cn(
                  client.stage === 'Hot' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40' :
                  client.stage === 'Warm' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/40' :
                  'bg-muted text-foreground/80 border-border'
                )}>
                  {client.stage}
                </Badge>
                <p className="text-lg font-bold">₹{Number(client.revenueTotal || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientsInsight() {
  const [, setLocation] = useLocation();
  const { data: clients = [], isLoading } = useClients();
  const { data: stories = [] } = useStories();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hotClients = clients.filter((c: any) => c.stage === 'Hot');
  const warmClients = clients.filter((c: any) => c.stage === 'Warm');
  const coldClients = clients.filter((c: any) => c.stage === 'Cold');

  const getClientStories = (clientId: string) => stories.filter((s: any) => s.clientId === clientId);
  const getClientProgress = (clientId: string) => {
    const clientStories = getClientStories(clientId);
    if (clientStories.length === 0) return 0;
    return Math.round(clientStories.reduce((acc: any, s: any) => acc + Number(s.progressPercent || 0), 0) / clientStories.length);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back" aria-label="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Clients</h1>
          <p className="text-muted-foreground">Overview of all your client relationships</p>
        </div>
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-3">
        <Card className="macos-card border-none bg-red-50/50 dark:bg-red-500/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Hot Clients</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-300">{hotClients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none bg-yellow-50/50 dark:bg-yellow-500/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Warm Clients</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-300">{warmClients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none bg-gray-50/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Cold Clients</p>
                <p className="text-3xl font-bold text-foreground/80">{coldClients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-6 w-6 text-foreground/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {[
        { title: 'Hot Clients', clients: hotClients, color: 'red' },
        { title: 'Warm Clients', clients: warmClients, color: 'yellow' },
        { title: 'Cold Clients', clients: coldClients, color: 'gray' }
      ].map(({ title, clients: stageClients, color }) => stageClients.length > 0 && (
        <Card key={title} className="macos-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stageClients.map((client: any) => {
                const progress = getClientProgress(client.id);
                const storyCount = getClientStories(client.id).length;
                return (
                  <div key={client.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 dark:bg-white/[0.05] hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)} data-testid={`client-row-${client.id}`}>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.industry} • {storyCount} stories</p>
                    </div>
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <p className="text-lg font-bold">₹{Number(client.revenueTotal || 0).toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StoriesInsight() {
  const [, setLocation] = useLocation();
  const { data: stories = [], isLoading } = useStories();
  const { data: clients = [] } = useClients();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingStories = stories.filter((s: any) => s.status !== 'Done');
  const todoStories = stories.filter((s: any) => s.status === 'To Do');
  const inProgressStories = stories.filter((s: any) => s.status === 'In Progress');
  const reviewStories = stories.filter((s: any) => s.status === 'Review');

  const getClientName = (clientId: string) => {
    const client = clients.find((c: any) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  const sortedPending = [...pendingStories].sort((a: any, b: any) => {
    const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
    if (priorityDiff !== 0) return priorityDiff;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Stories</h1>
          <p className="text-muted-foreground">All tasks that need attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-4">
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-300">{pendingStories.length}</p>
            <p className="text-sm text-muted-foreground">Total Pending</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold text-foreground/80">{todoStories.length}</p>
            <p className="text-sm text-muted-foreground">To Do</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{inProgressStories.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-300">{reviewStories.length}</p>
            <p className="text-sm text-muted-foreground">In Review</p>
          </CardContent>
        </Card>
      </div>

      <Card className="macos-card border-none">
        <CardHeader>
          <CardTitle>All Pending Stories (by Priority)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPending.map((story) => (
              <div key={story.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 dark:bg-white/[0.05] hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${story.clientId}`)} data-testid={`story-row-${story.id}`}>
                <Badge variant="outline" className={cn(
                  "w-20 justify-center",
                  story.priority === 'High' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40' :
                  story.priority === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/40' :
                  'bg-muted text-foreground/80 border-border'
                )}>
                  {story.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{story.title}</p>
                  <p className="text-sm text-muted-foreground">{getClientName(story.clientId)}</p>
                </div>
                <Badge variant="outline" className={cn(
                  story.status === 'To Do' ? 'bg-muted text-foreground/80' :
                  story.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                  'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                )}>
                  {story.status}
                </Badge>
                <div className="w-24 text-right">
                  <div className="flex items-center gap-1 justify-end text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {story.dueDate ? format(new Date(story.dueDate), 'MMM d') : 'No date'}
                    </span>
                  </div>
                </div>
                <div className="w-20">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{story.progressPercent || 0}%</span>
                  </div>
                  <Progress value={Number(story.progressPercent) || 0} className="h-2" />
                </div>
              </div>
            ))}
            {sortedPending.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>All stories are completed!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CompletionInsight() {
  const [, setLocation] = useLocation();
  const { data: stories = [], isLoading } = useStories();
  const { data: clients = [] } = useClients();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalStories = stories.length;
  const completedStories = stories.filter((s: any) => s.status === 'Done');
  const completionRate = Math.round((completedStories.length / totalStories) * 100) || 0;

  const getClientName = (clientId: string) => {
    const client = clients.find((c: any) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const clientCompletion = clients.map((client: any) => {
    const clientStories = stories.filter((s: any) => s.clientId === client.id);
    const completed = clientStories.filter((s: any) => s.status === 'Done').length;
    const total = clientStories.length;
    return {
      name: client.name.split(' ')[0],
      fullName: client.name,
      id: client.id,
      completed,
      pending: total - completed,
      total,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }).filter((c: any) => c.total > 0).sort((a: any, b: any) => b.rate - a.rate);

  const statusDistribution = [
    { name: 'Done', value: stories.filter((s: any) => s.status === 'Done').length, color: '#22c55e' },
    { name: 'In Progress', value: stories.filter((s: any) => s.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Review', value: stories.filter((s: any) => s.status === 'Review').length, color: '#a855f7' },
    { name: 'To Do', value: stories.filter((s: any) => s.status === 'To Do').length, color: '#94a3b8' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Completion Rate</h1>
          <p className="text-muted-foreground">Track your team's progress across all projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-4">
        <Card className="macos-card border-none md:col-span-1">
          <CardContent className="p-4 sm:p-6">
            <div className="relative h-32 w-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-border" />
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" strokeDasharray={`${completionRate * 3.52} 352`} strokeLinecap="round" className="text-green-500 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{completionRate}%</span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-300">{completedStories.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-300">{totalStories - completedStories.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-3xl font-bold">{totalStories}</p>
            <p className="text-sm text-muted-foreground">Total Stories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-2">
        <Card className="macos-card border-none">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card border-none">
          <CardHeader>
            <CardTitle>Completion by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientCompletion} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string, props: any) => [`${value}%`, 'Completion Rate']}
                  />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="macos-card border-none">
        <CardHeader>
          <CardTitle>Client Progress Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientCompletion.map((client: any) => (
              <div key={client.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 dark:bg-white/[0.05] hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)} data-testid={`completion-client-${client.id}`}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {client.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.fullName}</p>
                  <p className="text-sm text-muted-foreground">{client.completed} of {client.total} stories completed</p>
                </div>
                <div className="w-48">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{client.rate}%</span>
                  </div>
                  <Progress value={client.rate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
