import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients, useStories, useActivityLog, useUsers, useRevenueTargets, useUpsertRevenueTarget, useLeads } from "@/lib/queries";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { ArrowUpRight, Clock, TrendingUp, Users, Briefcase, CheckCircle2, AlertCircle, Loader2, ExternalLink, IndianRupee, Receipt, UserMinus, AlertTriangle, Target, Pencil, Gift, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, useCanViewFinance, useCanManageTeam, useCanViewPayroll, useIsFounder, useCanViewOverview, usePerm } from "@/lib/auth";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import type { Client, Story, ActivityLog } from "@shared/schema";
import { useState, useMemo } from "react";
import { useSalaryRecords, useIncentives } from "@/lib/queries";
import { format, subMonths } from "date-fns";
import { getStoryBottleneck } from "@/lib/bottleneck";
import { MyWork } from "@/components/MyWork";
import { FounderOverview } from "@/components/FounderOverview";
import { perms } from "@shared/roles";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";

export default function Dashboard() {
  const { user } = useAuth();
  const canViewFinance = useCanViewFinance();
  const canManageTeam = useCanManageTeam();
  const isFounderUser = useIsFounder();
  const canSetTargets = usePerm("setRevenueTargets");
  const canViewOverview = useCanViewOverview();
  const canViewPayroll = useCanViewPayroll();
  const [, setLocation] = useLocation();
  const { data: clients = [], isLoading: isLoadingClients } = useClients() as { data: Client[], isLoading: boolean };
  const { data: stories = [], isLoading: isLoadingStories } = useStories() as { data: Story[], isLoading: boolean };
  const { data: activityLog = [], isLoading: isLoadingActivity } = useActivityLog() as { data: ActivityLog[], isLoading: boolean };
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads() as { data: any[], isLoading: boolean };
  const { data: users = [] } = useUsers();
  const { data: revenueTargets = [] } = useRevenueTargets({ enabled: canViewFinance });
  const { mutate: upsertTarget } = useUpsertRevenueTarget();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentTarget = (revenueTargets as any[]).find(t => t.period === currentPeriod);

  // Salary & Incentive data (HR/Owner only)
  const { data: allSalaryRecords = [] } = useSalaryRecords(undefined, { enabled: canViewPayroll });
  const { data: allIncentiveRecords = [] } = useIncentives(undefined, { enabled: canViewPayroll });

  const payrollChartData = useMemo(() => {
    if (!canViewPayroll) return [];
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return format(d, "yyyy-MM");
    });
    return months.map(period => {
      const salary = (allSalaryRecords as any[])
        .filter((r: any) => r.period === period)
        .reduce((s: number, r: any) => s + parseFloat(r.baseSalary || 0), 0);
      const incentive = (allIncentiveRecords as any[])
        .filter((r: any) => r.period === period)
        .reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
      return { period: format(new Date(period + '-01'), "MMM yy"), salary, incentive };
    });
  }, [allSalaryRecords, allIncentiveRecords, canViewPayroll]);

  const currentMonthSalary = (allSalaryRecords as any[])
    .filter((r: any) => r.period === currentPeriod)
    .reduce((s: number, r: any) => s + parseFloat(r.baseSalary || 0), 0);
  const currentMonthIncentives = (allIncentiveRecords as any[])
    .filter((r: any) => r.period === currentPeriod)
    .reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);

  if (isLoadingClients || isLoadingStories || isLoadingActivity || isLoadingLeads) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalExpected = clients.reduce((acc, c) => acc + Number(c.expectedRevenue || 0), 0);
  const totalReceived = clients.reduce((acc, c) => acc + Number(c.revenueTotal || 0), 0);
  const totalStories = stories.length;
  const totalClients = clients.length;
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length;
  const activeClients = clients.filter(c => c.stage !== 'Dropped').length;
  const completedStories = stories.filter(s => s.status === 'Done').length;
  const completionRate = Math.round((completedStories / totalStories) * 100) || 0;
  const collectionRate = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;
  
  const bottleneckStories = stories.map(s => ({ story: s, bottleneck: getStoryBottleneck(s) })).filter(item => item.bottleneck !== null);

  const revenueData = clients.map(c => ({
    name: c.name.split(' ')[0], 
    expected: Number(c.expectedRevenue || 0),
    received: Number(c.revenueTotal || 0),
  }));

  const droppedClients = clients.filter(c => c.stage === 'Dropped').length;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const newClientsLast30Days = clients.filter(c => c.createdAt && Date.now() - new Date(c.createdAt as any as string).getTime() <= 30 * DAY_MS).length;
  const storiesDueSoon = stories.filter(s => {
    if (!s.dueDate || s.status === 'Done') return false;
    const diff = new Date(s.dueDate as any as string).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * DAY_MS;
  }).length;
  // Compact rupee formatting for chart axes (₹0, ₹500, ₹1.5k, ₹2L)
  const formatAxisRupees = (v: number) => {
    if (v >= 100000) return `₹${+(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${+(v / 1000).toFixed(1)}k`;
    return `₹${v}`;
  };
  
  const statusDistribution = [
    { name: 'Hot', value: clients.filter(c => c.stage === 'Hot').length, color: 'hsl(var(--chart-1))' },
    { name: 'Warm', value: clients.filter(c => c.stage === 'Warm').length, color: '#fbbf24' },
    { name: 'Cold', value: clients.filter(c => c.stage === 'Cold').length, color: '#94a3b8' },
    { name: 'Dropped', value: droppedClients, color: '#6b7280' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground">Welcome back, {user?.firstName || 'there'}. Here's what's happening today.</p>
      </div>

      <AnnouncementTicker />

      {canViewOverview && <FounderOverview />}
      {!canViewOverview && perms.isTeamLead(user) && (user as any)?.team && <FounderOverview title={`Team overview · ${(user as any).team}`} />}
      <MyWork stories={stories} clients={clients} />

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 2xl:grid-cols-6">
        {canViewFinance && (
          <Card
            className="macos-card border-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
            onClick={() => setLocation('/insights/revenue')}
            data-testid="stat-card-revenue"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-100/50 dark:bg-green-500/20">
                  <IndianRupee className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300">
                  <TrendingUp className="h-3 w-3" />
                  {collectionRate}% collected
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expected Revenue</h3>
                  <div className="text-2xl font-bold tracking-tight text-foreground">₹{totalExpected.toLocaleString('en-IN')}</div>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Received Revenue</h3>
                  <div className="text-xl font-semibold tracking-tight text-green-600 dark:text-green-300">₹{totalReceived.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card
          className="macos-card border-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
          onClick={() => setLocation('/clients')}
          data-testid="stat-card-clients"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-100/50 dark:bg-blue-500/20">
                <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                <ArrowUpRight className="h-3 w-3" />
                +{newClientsLast30Days} new (30d)
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Clients</h3>
                <div className="text-2xl font-bold tracking-tight text-foreground">{totalClients}</div>
              </div>
              <div className="h-px bg-border" />
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Clients</h3>
                <div className="text-xl font-semibold tracking-tight text-blue-600 dark:text-blue-300">{activeClients}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="macos-card border-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
          onClick={() => setLocation('/leads')}
          data-testid="stat-card-leads"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-orange-100/50 dark:bg-orange-500/20">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                <ArrowUpRight className="h-3 w-3" />
                Pipeline
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</h3>
                <div className="text-2xl font-bold tracking-tight text-foreground">{totalLeads}</div>
              </div>
              <div className="h-px bg-border" />
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Leads</h3>
                <div className="text-xl font-semibold tracking-tight text-orange-600 dark:text-orange-300">{activeLeads}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard 
          title="Pending Stories" 
          value={(totalStories - completedStories).toString()} 
          icon={Clock} 
          trend={`${storiesDueSoon} due in 7 days`}
          trendUp={false}
          color="text-orange-600 dark:text-orange-300"
          bgColor="bg-orange-100/50 dark:bg-orange-500/20"
          onClick={() => setLocation('/global-kanban')}
        />
        <StatCard 
          title="Completion Rate" 
          value={`${completionRate}%`} 
          icon={CheckCircle2} 
          trend={`${completedStories}/${totalStories} done`}
          trendUp={true}
          color="text-purple-600 dark:text-purple-300"
          bgColor="bg-purple-100/50 dark:bg-purple-500/20"
          onClick={() => setLocation('/insights/completion')}
        />
        <StatCard 
          title="Dropped Clients" 
          value={droppedClients.toString()} 
          icon={UserMinus} 
          trend="Lost"
          trendUp={false}
          color="text-foreground/80"
          bgColor="bg-gray-100/50"
          onClick={() => setLocation('/clients?stage=Dropped')}
        />
      </div>

      <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-7">
        {/* Revenue Chart - Owner only */}
        {canViewFinance && <Card className="col-span-7 lg:col-span-4 macos-card border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Expected vs Received Revenue</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-500/70" />
                  <span className="text-muted-foreground">Expected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-muted-foreground">Received</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              {revenueData.every(d => d.expected === 0 && d.received === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-1" data-testid="revenue-chart-empty">
                  <p className="font-medium text-foreground">No revenue recorded yet</p>
                  <p className="text-sm">Add an expected revenue to a client, or log a paid invoice, to see it here.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
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
                    tickFormatter={formatAxisRupees} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted-foreground) / 0.12)'}}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', 
                      backdropFilter: 'blur(12px)', 
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      padding: '12px'
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  />
                  <Bar 
                    dataKey="expected" 
                    name="Expected"
                    fill="url(#colorExpected)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={20} 
                  />
                  <Bar 
                    dataKey="received" 
                    name="Received"
                    fill="url(#colorReceived)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={20} 
                  />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>}

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
                      background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', 
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
      
      {/* Owner-only: Target vs Achievement */}
      {canViewFinance && (() => {
        const targetAmt = currentTarget ? Number(currentTarget.targetAmount) : 0;
        const achievedPct = targetAmt > 0 ? Math.min((totalReceived / targetAmt) * 100, 100) : 0;
        const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        return (
          <Card className="macos-card border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Target vs Achievement — {monthName}
                </CardTitle>
                {canSetTargets && <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setTargetInput(targetAmt ? String(targetAmt) : ''); setEditingTarget(true); }}>
                  <Pencil className="h-3 w-3" /> Set Target
                </Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingTarget ? (
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground">₹</span>
                  <Input className="macos-input h-8 text-sm" placeholder="e.g. 500000" value={targetInput} onChange={e => setTargetInput(e.target.value)} type="number" />
                  <Button size="sm" className="h-8" onClick={() => { if (targetInput) { upsertTarget({ period: currentPeriod, targetAmount: targetInput }); } setEditingTarget(false); }}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingTarget(false)}>Cancel</Button>
                </div>
              ) : targetAmt === 0 ? (
                <p className="text-sm text-muted-foreground">No target set for this month. Click "Set Target" to add one.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue Received</span>
                    <span className="font-semibold">₹{totalReceived.toLocaleString('en-IN')} <span className="text-muted-foreground font-normal">/ ₹{targetAmt.toLocaleString('en-IN')}</span></span>
                  </div>
                  <Progress value={achievedPct} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className={cn(achievedPct >= 100 ? "text-green-600 dark:text-green-300 font-medium" : achievedPct >= 70 ? "text-orange-600 dark:text-orange-300" : "text-red-600 dark:text-red-300")}>{achievedPct.toFixed(0)}% of target achieved</span>
                    <span>{achievedPct < 100 ? `₹${(targetAmt - totalReceived).toLocaleString('en-IN')} remaining` : 'Target reached!'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* HR/Owner: Overdue Tasks + Employee Workload */}
      {canManageTeam && (() => {
        const overdueTasks = stories.filter((s: Story) => s.dueDate && s.status !== 'Done' && new Date(s.dueDate as any as string) < new Date());
        const workload = users.map((u: any) => ({
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          active: stories.filter((s: Story) => s.assignedTo === u.id && s.status !== 'Done').length,
          done: stories.filter((s: Story) => s.assignedTo === u.id && s.status === 'Done').length,
        })).filter((u: any) => u.active + u.done > 0);

        return (
          <div className="grid grid-cols-1 [&>*]:min-w-0 gap-6 md:grid-cols-2">
            {/* Overdue Tasks */}
            <Card className="macos-card border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue Tasks
                  {overdueTasks.length > 0 && (
                    <span className="ml-auto text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                {overdueTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-2">No overdue tasks.</p>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/10 max-h-[220px] overflow-y-auto">
                    {overdueTasks.slice(0, 8).map((s: Story) => {
                      const client = clients.find((c: Client) => c.id === s.clientId);
                      return (
                        <div key={s.id} className="flex items-center gap-3 px-6 py-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{client?.name} · Due {new Date(s.dueDate as any as string).toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Workload */}
            <Card className="macos-card border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Employee Workload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
                ) : workload.map((u: any) => (
                  <div
                    key={u.name}
                    className="space-y-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-colors"
                    onClick={() => setLocation(`/global-kanban?assignee=${encodeURIComponent(u.name)}`)}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground text-xs">{u.active} active · {u.done} done</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", u.active > 5 ? "bg-red-500" : u.active > 3 ? "bg-orange-400" : "bg-primary")}
                        style={{ width: `${Math.min((u.active / Math.max(...workload.map((w: any) => w.active), 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* HR/Owner: Leads Pipeline Summary */}
      {canManageTeam && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <h2 className="text-lg font-semibold px-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Leads Pipeline Summary
          </h2>
          <div className="grid grid-cols-1 [&>*]:min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['New', 'Contacted', 'Proposal Sent', 'Negotiation'].map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage);
              const totalValue = stageLeads.reduce((acc, l) => acc + Number(l.estimatedValue || 0), 0);
              return (
                <Card
                  key={stage}
                  className="macos-card border-none hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
                  onClick={() => setLocation(`/leads`)}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-32">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{stage}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                        {stageLeads.length} leads
                      </span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">estimated value</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Payroll Summary */}
      {canViewPayroll && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold px-1 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Payroll Overview
          </h2>
          <div className="grid grid-cols-1 [&>*]:min-w-0 gap-4 sm:grid-cols-3">
            <Card className="macos-card border-none cursor-pointer hover:-translate-y-1 transition-transform duration-300" onClick={() => setLocation('/salary')}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <IndianRupee className="h-5 w-5 text-primary" />
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month Salary</h3>
                <div className="text-2xl font-bold mt-1">₹{currentMonthSalary.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")}</p>
              </CardContent>
            </Card>
            <Card className="macos-card border-none cursor-pointer hover:-translate-y-1 transition-transform duration-300" onClick={() => setLocation('/salary')}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-500/20">
                    <Gift className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                </div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month Incentives</h3>
                <div className="text-2xl font-bold mt-1">₹{currentMonthIncentives.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")}</p>
              </CardContent>
            </Card>
            <Card className="macos-card border-none cursor-pointer hover:-translate-y-1 transition-transform duration-300" onClick={() => setLocation('/salary')}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-emerald-100/60 dark:bg-emerald-500/20">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                </div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Payroll This Month</h3>
                <div className="text-2xl font-bold mt-1">₹{(currentMonthSalary + currentMonthIncentives).toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">{(users as any[]).length} team members</p>
              </CardContent>
            </Card>
          </div>
          {/* Payroll 6-month chart */}
          <Card className="macos-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Payroll — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payrollChartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payrollSalaryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="payrollIncentiveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="period" fontSize={12} tickLine={false} axisLine={false} stroke="#888" dy={8} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#888" dx={-8} tickFormatter={formatAxisRupees} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ borderRadius: '12px', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', padding: '12px' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="salary" name="Salary" fill="url(#payrollSalaryGrad)" radius={[5,5,0,0]} barSize={20} />
                    <Bar dataKey="incentive" name="Incentive" fill="url(#payrollIncentiveGrad)" radius={[5,5,0,0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottlenecks Card */}
      {bottleneckStories.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold px-1 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Active Bottlenecks
            <span className="text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">{bottleneckStories.length}</span>
          </h2>
          <Card className="macos-card border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {bottleneckStories.map(({story, bottleneck}: any) => {
                  const client = clients.find(c => c.id === story.clientId);
                  const borderClass = bottleneck.color.split(' ').find((c: string) => c.startsWith('border-'))?.replace('border-', 'border-l-4 border-') || 'border-l-4 border-gray-400';
                  const bgClass = bottleneck.color.split(' ').find((c: string) => c.startsWith('bg-')) || 'bg-muted';
                  const textClass = bottleneck.color.split(' ').find((c: string) => c.startsWith('text-')) || 'text-foreground/80';
                  
                  return (
                    <div key={story.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4", borderClass, bgClass, textClass)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{story.title}</p>
                        <p className="text-xs opacity-80 mt-1">{client?.name} · Assignee: {story.person || 'Unassigned'}</p>
                      </div>
                      <div className="text-sm font-medium pl-4 text-right">
                         <div className="flex items-center gap-1.5 justify-end">
                            <span className="bg-white/60 dark:bg-white/[0.08] px-2 py-0.5 rounded-md shadow-sm border border-black/5 dark:border-white/10 uppercase tracking-wide text-[10px]">{bottleneck.type}</span>
                         </div>
                         <p className="text-xs mt-1 opacity-90">{bottleneck.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                       <span className="text-xs text-muted-foreground">by {user?.firstName || 'Team'} {user?.lastName || ''}</span>
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

function StatCard({ title, value, icon: Icon, trend, trendUp, color, bgColor, onClick }: any) {
  return (
    <Card 
      className="macos-card border-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
      onClick={onClick}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("p-3 rounded-xl transition-colors", bgColor)}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trendUp ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300" : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
            )}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {trend}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
