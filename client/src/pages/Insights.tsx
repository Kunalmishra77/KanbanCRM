import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useClients, useStories } from "@/lib/queries";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Area, AreaChart, Line, LineChart, CartesianGrid, Legend } from "recharts";
import { ArrowLeft, TrendingUp, Briefcase, Clock, CheckCircle2, Loader2, DollarSign, Calendar, User } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Client, Story } from "@shared/schema";

export function RevenueInsight() {
  const [, setLocation] = useLocation();
  const { data: clients = [], isLoading } = useClients();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalRevenue = clients.reduce((acc, c) => acc + Number(c.revenueTotal || 0), 0);
  const sortedClients = [...clients].sort((a, b) => Number(b.revenueTotal || 0) - Number(a.revenueTotal || 0));
  
  const revenueData = clients.map(c => ({
    name: c.name.split(' ')[0],
    revenue: Number(c.revenueTotal || 0),
    fullName: c.name
  }));

  const stageRevenue = [
    { name: 'Hot', value: clients.filter(c => c.stage === 'Hot').reduce((acc, c) => acc + Number(c.revenueTotal || 0), 0), color: 'hsl(var(--chart-1))' },
    { name: 'Warm', value: clients.filter(c => c.stage === 'Warm').reduce((acc, c) => acc + Number(c.revenueTotal || 0), 0), color: '#fbbf24' },
    { name: 'Cool', value: clients.filter(c => c.stage === 'Cool').reduce((acc, c) => acc + Number(c.revenueTotal || 0), 0), color: '#94a3b8' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Breakdown</h1>
          <p className="text-muted-foreground">Detailed view of your revenue across all clients</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="macos-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100/50">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100/50">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg per Client</p>
                <p className="text-2xl font-bold">${Math.round(totalRevenue / (clients.length || 1)).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100/50">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Client</p>
                <p className="text-2xl font-bold">{sortedClients[0]?.name.split(' ')[0] || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
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
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6">
              {stageRevenue.map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">${item.value.toLocaleString()}</span>
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
              <div key={client.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 hover:bg-white/60 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)} data-testid={`revenue-client-${client.id}`}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">{client.industry}</p>
                </div>
                <Badge variant="outline" className={cn(
                  client.stage === 'Hot' ? 'bg-red-100 text-red-700 border-red-200' :
                  client.stage === 'Warm' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                )}>
                  {client.stage}
                </Badge>
                <p className="text-lg font-bold">${Number(client.revenueTotal || 0).toLocaleString()}</p>
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

  const hotClients = clients.filter(c => c.stage === 'Hot');
  const warmClients = clients.filter(c => c.stage === 'Warm');
  const coolClients = clients.filter(c => c.stage === 'Cool');

  const getClientStories = (clientId: string) => stories.filter(s => s.clientId === clientId);
  const getClientProgress = (clientId: string) => {
    const clientStories = getClientStories(clientId);
    if (clientStories.length === 0) return 0;
    return Math.round(clientStories.reduce((acc, s) => acc + Number(s.progressPercent || 0), 0) / clientStories.length);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Clients</h1>
          <p className="text-muted-foreground">Overview of all your client relationships</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="macos-card border-none bg-red-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Clients</p>
                <p className="text-3xl font-bold text-red-600">{hotClients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none bg-yellow-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warm Clients</p>
                <p className="text-3xl font-bold text-yellow-600">{warmClients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="macos-card border-none bg-gray-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cool Clients</p>
                <p className="text-3xl font-bold text-gray-600">{coolClients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {[
        { title: 'Hot Clients', clients: hotClients, color: 'red' },
        { title: 'Warm Clients', clients: warmClients, color: 'yellow' },
        { title: 'Cool Clients', clients: coolClients, color: 'gray' }
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
              {stageClients.map((client) => {
                const progress = getClientProgress(client.id);
                const storyCount = getClientStories(client.id).length;
                return (
                  <div key={client.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 hover:bg-white/60 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)} data-testid={`client-row-${client.id}`}>
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
                    <p className="text-lg font-bold">${Number(client.revenueTotal || 0).toLocaleString()}</p>
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

  const pendingStories = stories.filter(s => s.status !== 'Done');
  const todoStories = stories.filter(s => s.status === 'To Do');
  const inProgressStories = stories.filter(s => s.status === 'In Progress');
  const reviewStories = stories.filter(s => s.status === 'Review');

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  const sortedPending = [...pendingStories].sort((a, b) => {
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

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="macos-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-orange-600">{pendingStories.length}</p>
            <p className="text-sm text-muted-foreground">Total Pending</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-gray-600">{todoStories.length}</p>
            <p className="text-sm text-muted-foreground">To Do</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{inProgressStories.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{reviewStories.length}</p>
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
              <div key={story.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 hover:bg-white/60 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${story.clientId}`)} data-testid={`story-row-${story.id}`}>
                <Badge variant="outline" className={cn(
                  "w-20 justify-center",
                  story.priority === 'High' ? 'bg-red-100 text-red-700 border-red-200' :
                  story.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                )}>
                  {story.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{story.title}</p>
                  <p className="text-sm text-muted-foreground">{getClientName(story.clientId)}</p>
                </div>
                <Badge variant="outline" className={cn(
                  story.status === 'To Do' ? 'bg-gray-100 text-gray-700' :
                  story.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
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
  const completedStories = stories.filter(s => s.status === 'Done');
  const completionRate = Math.round((completedStories.length / totalStories) * 100) || 0;

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const clientCompletion = clients.map(client => {
    const clientStories = stories.filter(s => s.clientId === client.id);
    const completed = clientStories.filter(s => s.status === 'Done').length;
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
  }).filter(c => c.total > 0).sort((a, b) => b.rate - a.rate);

  const statusDistribution = [
    { name: 'Done', value: stories.filter(s => s.status === 'Done').length, color: '#22c55e' },
    { name: 'In Progress', value: stories.filter(s => s.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Review', value: stories.filter(s => s.status === 'Review').length, color: '#a855f7' },
    { name: 'To Do', value: stories.filter(s => s.status === 'To Do').length, color: '#94a3b8' },
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

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="macos-card border-none col-span-2 md:col-span-1">
          <CardContent className="p-6">
            <div className="relative h-32 w-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-200" />
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
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-green-600">{completedStories.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-orange-600">{totalStories - completedStories.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="macos-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{totalStories}</p>
            <p className="text-sm text-muted-foreground">Total Stories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)' }} />
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
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)' }}
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
            {clientCompletion.map((client) => (
              <div key={client.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/40 hover:bg-white/60 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)} data-testid={`completion-client-${client.id}`}>
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
